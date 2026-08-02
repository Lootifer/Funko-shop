import { Router } from "express";
import { all, exec, get, run } from "../db/connection.js";
import { toApiOrder } from "../services/serializers.js";

const router = Router();

const ORDER_STATUSES = [
  "Nieuw",
  "Bevestigd",
  "In behandeling",
  "Verzonden",
  "Afgerond",
  "Geannuleerd",
];

const createOrderNumber = () => {
  const stamp = new Date();
  const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const timePart = String(stamp.getTime()).slice(-5);
  return `LOOT-${datePart}-${timePart}`;
};

const buildOrderResponse = async (orderRow) => {
  const itemRows = await all("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC", [orderRow.id]);
  return toApiOrder(orderRow, itemRows);
};

router.get("/", async (request, response, next) => {
  try {
    const rows = await all("SELECT * FROM orders ORDER BY created_at DESC, id DESC");
    const orders = [];

    for (const row of rows) {
      orders.push(await buildOrderResponse(row));
    }

    response.json({ orders, source: "database" });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!id) return response.status(400).json({ error: "Valid order id is required." });

    const row = await get("SELECT * FROM orders WHERE id = ?", [id]);
    if (!row) return response.status(404).json({ error: "Order not found." });

    const order = await buildOrderResponse(row);
    response.json({ order });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const payload = request.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : null;

    if (!items.length) {
      return response.status(400).json({ error: "Order must contain at least one item." });
    }

    if (!customer?.name || !customer?.email) {
      return response.status(400).json({ error: "Customer name and email are required." });
    }

    const nowIso = new Date().toISOString();
    const orderNumber = payload.number || createOrderNumber();
    const status = ORDER_STATUSES.includes(payload.status) ? payload.status : "Nieuw";
    const paymentStatus = String(payload.paymentStatus || "Nog geen online betaling");
    const deliveryMethod = String(payload.deliveryMethod || "");
    const notes = String(payload.notes || "");

    const normalizedItems = [];
    let subtotal = 0;

    await exec("BEGIN TRANSACTION");
    try {
      for (const entry of items) {
        const productId = Number(entry.id);
        const quantity = Math.max(0, Number(entry.quantity) || 0);
        if (!productId || !quantity) continue;

        const product = await get("SELECT id, name, thumbnail, stock, selling_price FROM products WHERE id = ?", [productId]);
        if (!product) {
          throw Object.assign(new Error(`Product ${productId} not found.`), { status: 409 });
        }

        const stock = Math.max(0, Number(product.stock) || 0);
        if (stock < quantity) {
          throw Object.assign(new Error(`${product.name} has only ${stock} in stock.`), { status: 409 });
        }

        const unitPrice = Number(product.selling_price) || 0;
        subtotal += unitPrice * quantity;

        normalizedItems.push({
          productId,
          quantity,
          productName: product.name,
          productImage: product.thumbnail || "",
          unitPrice,
          previousStock: stock,
          nextStock: stock - quantity,
        });
      }

      if (!normalizedItems.length) {
        throw Object.assign(new Error("No valid order items were supplied."), { status: 400 });
      }

      const insertedOrder = await run(
        `INSERT INTO orders (
          number, status, payment_status, is_test_order, stock_restored_at, delivery_method, notes,
          subtotal, total, customer_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ,
        [
          orderNumber,
          status,
          paymentStatus,
          1,
          null,
          deliveryMethod,
          notes,
          subtotal,
          subtotal,
          JSON.stringify(customer),
          nowIso,
          nowIso,
        ]
      );

      const orderId = insertedOrder.lastID;

      for (const item of normalizedItems) {
        await run(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_name, product_image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.unitPrice, item.productName, item.productImage]
        );

        await run("UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [item.nextStock, item.productId]);

        await run(
          `INSERT INTO stock_transactions (product_id, order_id, quantity, mode, reason, note)
           VALUES (?, ?, ?, 'decrease', 'order-created', ?)`
          ,
          [item.productId, orderId, item.quantity, `Order ${orderNumber}`]
        );
      }

      await exec("COMMIT");

      const createdOrder = await get("SELECT * FROM orders WHERE id = ?", [orderId]);
      const order = await buildOrderResponse(createdOrder);
      response.status(201).json({ order, source: "database" });
    } catch (error) {
      await exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    if (error && typeof error.status === "number") {
      return response.status(error.status).json({ error: error.message || "Order could not be created." });
    }
    return next(error);
  }
});

router.patch("/:id/status", async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const nextStatus = String(request.body?.status || "").trim();

    if (!id) return response.status(400).json({ error: "Valid order id is required." });
    if (!ORDER_STATUSES.includes(nextStatus)) {
      return response.status(400).json({ error: "Invalid order status." });
    }

    const order = await get("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) return response.status(404).json({ error: "Order not found." });

    const currentStatus = order.status || "Nieuw";
    const shouldRestoreStock = nextStatus === "Geannuleerd" && currentStatus !== "Geannuleerd" && !order.stock_restored_at;

    await exec("BEGIN TRANSACTION");
    try {
      if (shouldRestoreStock) {
        const orderItems = await all("SELECT * FROM order_items WHERE order_id = ?", [id]);
        for (const item of orderItems) {
          const product = await get("SELECT id, stock FROM products WHERE id = ?", [item.product_id]);
          if (!product) continue;

          const currentStock = Math.max(0, Number(product.stock) || 0);
          const quantity = Math.max(0, Number(item.quantity) || 0);
          const nextStockValue = currentStock + quantity;

          await run("UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nextStockValue, item.product_id]);
          await run(
            `INSERT INTO stock_transactions (product_id, order_id, quantity, mode, reason, note)
             VALUES (?, ?, ?, 'increase', 'order-cancelled', ?)`
            ,
            [item.product_id, id, quantity, `Order ${order.number} cancelled`]
          );
        }
      }

      await run(
        `UPDATE orders
         SET status = ?, updated_at = ?, stock_restored_at = CASE
           WHEN ? = 1 THEN COALESCE(stock_restored_at, ?)
           ELSE stock_restored_at
         END
         WHERE id = ?`,
        [nextStatus, new Date().toISOString(), shouldRestoreStock ? 1 : 0, shouldRestoreStock ? new Date().toISOString() : null, id]
      );

      await exec("COMMIT");
    } catch (error) {
      await exec("ROLLBACK");
      throw error;
    }

    const updated = await get("SELECT * FROM orders WHERE id = ?", [id]);
    response.json({ order: await buildOrderResponse(updated), source: "database" });
  } catch (error) {
    next(error);
  }
});

export { ORDER_STATUSES };
export default router;
