import { Router } from "express";
import { all, get } from "../db/connection.js";
import { toApiProduct } from "../services/serializers.js";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const search = String(request.query.search || "").trim();
    const category = String(request.query.category || "").trim();
    const universe = String(request.query.universe || "").trim();
    const inStockOnly = String(request.query.inStock || "").trim() === "1";

    const where = [];
    const params = [];

    if (search) {
      where.push("(LOWER(name) LIKE ? OR LOWER(universe) LIKE ? OR LOWER(franchise) LIKE ? OR LOWER(description) LIKE ?)");
      const query = `%${search.toLowerCase()}%`;
      params.push(query, query, query, query);
    }

    if (category) {
      where.push("category = ?");
      params.push(category);
    }

    if (universe) {
      where.push("universe = ?");
      params.push(universe);
    }

    if (inStockOnly) {
      where.push("stock > 0");
    }

    const sql = `
      SELECT *
      FROM products
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY release_year DESC, id DESC
    `;

    const rows = await all(sql, params);
    response.json({ products: rows.map(toApiProduct), source: "database" });
  } catch (error) {
    next(error);
  }
});

router.get("/:idOrSlug", async (request, response, next) => {
  try {
    const idOrSlug = String(request.params.idOrSlug || "").trim();
    if (!idOrSlug) return response.status(400).json({ error: "Product identifier is required." });

    const numericId = Number(idOrSlug);
    const row = Number.isInteger(numericId)
      ? await get("SELECT * FROM products WHERE id = ?", [numericId])
      : await get("SELECT * FROM products WHERE slug = ?", [idOrSlug.toLowerCase()]);

    if (!row) return response.status(404).json({ error: "Product not found." });

    response.json({ product: toApiProduct(row) });
  } catch (error) {
    next(error);
  }
});

export default router;
