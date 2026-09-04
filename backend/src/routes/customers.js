import { Router } from "express";
import { all, get } from "../db/connection.js";
import { requireAdmin } from "../auth/middleware.js";

const router = Router();

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

// Alleen echte, veilig te tonen velden. Nooit password_hash of sessiegegevens.
const publicCustomer = (row = {}) => ({
  id: Number(row.id) || 0,
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
  email: row.email || "",
  phone: row.phone ? row.phone : null,
  city: row.city || null,
  country: row.country || null,
  createdAt: row.created_at || null,
  lastLoginAt: row.last_login_at || null,
});

/*
 * Bestellingen hebben geen customer_id-koppeling (zie orders.customer_json).
 * Net als de bestaande "/api/account/orders"-route (klantzijde) matchen we
 * bestellingen aan een account via het genormaliseerde e-mailadres.
 * Testorders (is_test_order = 1) tellen niet mee in de statistieken, zodat
 * omzet- en besteldata betrouwbaar blijven voor echte klanten.
 */
const loadOrderStatsByEmail = async () => {
  const rows = await all(
    "SELECT customer_json, total, created_at FROM orders WHERE is_test_order = 0"
  );

  const stats = new Map();

  for (const row of rows) {
    let customer;
    try {
      customer = JSON.parse(row.customer_json || "{}");
    } catch {
      customer = {};
    }

    const email = normalizeEmail(customer?.email);
    if (!email) continue;

    const entry = stats.get(email) || {
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: null,
    };

    entry.orderCount += 1;
    entry.totalSpent += Number(row.total) || 0;

    if (!entry.lastOrderAt || new Date(row.created_at) > new Date(entry.lastOrderAt)) {
      entry.lastOrderAt = row.created_at;
    }

    stats.set(email, entry);
  }

  return stats;
};

const loadOrdersForEmail = async (email) => {
  const rows = await all(
    `SELECT number, status, payment_status, total, subtotal, created_at, customer_json
     FROM orders
     WHERE is_test_order = 0
     ORDER BY datetime(created_at) DESC, id DESC`
  );

  return rows
    .filter((row) => {
      let customer;
      try {
        customer = JSON.parse(row.customer_json || "{}");
      } catch {
        customer = {};
      }
      return normalizeEmail(customer?.email) === email;
    })
    .map((row) => ({
      number: row.number || "",
      status: row.status || "Nieuw",
      paymentStatus: row.payment_status || "",
      total: Number(row.total) || 0,
      subtotal: Number(row.subtotal) || 0,
      createdAt: row.created_at || null,
    }));
};

// GET /api/customers — klantenoverzicht (alleen admin).
router.get("/", requireAdmin, async (request, response, next) => {
  try {
    const rows = await all(
      "SELECT * FROM customers ORDER BY datetime(created_at) DESC, id DESC"
    );

    const orderStats = await loadOrderStatsByEmail();

    const customers = rows.map((row) => {
      const base = publicCustomer(row);
      const stats = orderStats.get(normalizeEmail(row.email)) || {
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
      };

      return {
        ...base,
        orderCount: stats.orderCount,
        totalSpent: Math.round(stats.totalSpent * 100) / 100,
        lastOrderAt: stats.lastOrderAt,
      };
    });

    response.json({ customers, source: "database" });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id — klantdetail met bestelhistorie (alleen admin).
router.get("/:id", requireAdmin, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!id) {
      return response.status(400).json({ error: "Ongeldig klant-ID." });
    }

    const row = await get("SELECT * FROM customers WHERE id = ?", [id]);
    if (!row) {
      return response.status(404).json({ error: "Klant niet gevonden." });
    }

    const email = normalizeEmail(row.email);
    const orders = await loadOrdersForEmail(email);
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    response.json({
      customer: {
        ...publicCustomer(row),
        orderCount: orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
