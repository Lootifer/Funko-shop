import { Router } from "express";
import { all, exec, get, run } from "../db/connection.js";
import { toApiProduct } from "../services/serializers.js";

const router = Router();

const normalizeAdjustItems = (items = []) => {
  if (!Array.isArray(items)) return [];
  const grouped = new Map();

  items.forEach((item) => {
    const productId = Number(item.id ?? item.productId);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    if (!productId || !quantity) return;
    grouped.set(productId, (grouped.get(productId) || 0) + quantity);
  });

  return [...grouped.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

router.get("/transactions", async (request, response, next) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(request.query.limit) || 50));
    const rows = await all(
      `SELECT st.id, st.product_id, st.order_id, st.quantity, st.mode, st.reason, st.note, st.created_at, p.name AS product_name
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       ORDER BY st.id DESC
       LIMIT ?`,
      [limit]
    );

    response.json({ transactions: rows.map((row) => ({
      id: Number(row.id) || 0,
      productId: Number(row.product_id) || 0,
      productName: row.product_name || "",
      orderId: row.order_id === null ? null : Number(row.order_id),
      quantity: Number(row.quantity) || 0,
      mode: row.mode,
      reason: row.reason,
      note: row.note || "",
      createdAt: row.created_at,
    })) });
  } catch (error) {
    next(error);
  }
});

router.post("/adjust", async (request, response, next) => {
  try {
    const mode = String(request.body?.mode || "decrease");
    const reason = String(request.body?.reason || "manual-adjustment");
    const note = String(request.body?.note || "").trim();
    const items = normalizeAdjustItems(request.body?.items || []);

    if (!items.length) {
      return response.status(400).json({ error: "At least one stock adjustment item is required." });
    }

    if (!["increase", "decrease"].includes(mode)) {
      return response.status(400).json({ error: "Mode must be increase or decrease." });
    }

    const warnings = [];
    const changes = [];

    await exec("BEGIN TRANSACTION");
    try {
      for (const item of items) {
        const product = await get("SELECT id, name, stock FROM products WHERE id = ?", [item.productId]);
        if (!product) {
          warnings.push(`Product ${item.productId} does not exist.`);
          continue;
        }

        const stock = Math.max(0, Number(product.stock) || 0);
        const requested = item.quantity;
        const applied = mode === "decrease" ? Math.min(stock, requested) : requested;
        const nextStock = mode === "decrease" ? stock - applied : stock + applied;

        if (mode === "decrease" && applied < requested) {
          warnings.push(`${product.name}: requested ${requested}, applied ${applied} due to stock.`);
        }

        await run("UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nextStock, item.productId]);

        await run(
          `INSERT INTO stock_transactions (product_id, order_id, quantity, mode, reason, note)
           VALUES (?, NULL, ?, ?, ?, ?)`
          ,
          [item.productId, applied, mode, reason, note || null]
        );

        changes.push({
          productId: item.productId,
          productName: product.name,
          requested,
          applied,
          previousStock: stock,
          stock: nextStock,
        });
      }

      await exec("COMMIT");
    } catch (error) {
      await exec("ROLLBACK");
      throw error;
    }

    const productRows = await all("SELECT * FROM products ORDER BY release_year DESC, id DESC");
    response.json({
      warnings,
      changes,
      products: productRows.map(toApiProduct),
      source: "database",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
