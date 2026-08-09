import { Router } from "express";
import { all, exec, get, run } from "../db/connection.js";
import { toApiProduct } from "../services/serializers.js";
import { requireAdmin } from "../auth/middleware.js";

const router = Router();

const toBooleanInt = (value) => (value ? 1 : 0);
const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const validateProductPayload = async (payload = {}, currentId = null) => {
  const errors = [];
  const id = asNumber(payload.id, 0);
  const name = String(payload.name || "").trim();
  const slug = String(payload.slug || "").trim().toLowerCase();
  const sku = String(payload.sku || "").trim();
  const sellingPrice = asNumber(payload.sellingPrice ?? payload.price, NaN);
  const stock = asNumber(payload.stock, NaN);

  if (!id || id <= 0) errors.push("id moet groter zijn dan 0.");
  if (!name) errors.push("naam is verplicht.");
  if (!slug) errors.push("slug is verplicht.");
  if (!sku) errors.push("sku is verplicht.");
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) errors.push("verkoopprijs moet groter zijn dan 0.");
  if (!Number.isFinite(stock) || stock < 0) errors.push("voorraad moet 0 of hoger zijn.");

  if (slug) {
    const duplicateSlug = await get("SELECT id FROM products WHERE slug = ?", [slug]);
    if (duplicateSlug && Number(duplicateSlug.id) !== Number(currentId)) {
      errors.push(`slug bestaat al: ${slug}`);
    }
  }

  if (sku) {
    const duplicateSku = await get("SELECT id FROM products WHERE sku = ?", [sku]);
    if (duplicateSku && Number(duplicateSku.id) !== Number(currentId)) {
      errors.push(`sku bestaat al: ${sku}`);
    }
  }

  if (id) {
    const duplicateId = await get("SELECT id FROM products WHERE id = ?", [id]);
    if (duplicateId && Number(duplicateId.id) !== Number(currentId)) {
      errors.push(`id bestaat al: ${id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const upsertSql = `
INSERT INTO products (
  id, slug, sku, barcode, category, brand, universe, franchise, name, number, edition, variant,
  exclusive, chase, vaulted, signed, convention, release_year, condition, box_condition,
  never_out_of_box, figure_like_new, protector_included, stock, warehouse_location, reserved, purchase_price, selling_price,
  discount_price, archived, thumbnail, images_json, description, tags_json, box_front, box_back,
  left_side, right_side, meta_title, meta_description
) VALUES (${new Array(40).fill("?").join(", ")})
ON CONFLICT(id) DO UPDATE SET
  slug = excluded.slug,
  sku = excluded.sku,
  barcode = excluded.barcode,
  category = excluded.category,
  brand = excluded.brand,
  universe = excluded.universe,
  franchise = excluded.franchise,
  name = excluded.name,
  number = excluded.number,
  edition = excluded.edition,
  variant = excluded.variant,
  exclusive = excluded.exclusive,
  chase = excluded.chase,
  vaulted = excluded.vaulted,
  signed = excluded.signed,
  convention = excluded.convention,
  release_year = excluded.release_year,
  condition = excluded.condition,
  box_condition = excluded.box_condition,
  never_out_of_box = excluded.never_out_of_box,
  figure_like_new = excluded.figure_like_new,
  protector_included = 0,
  stock = excluded.stock,
  warehouse_location = excluded.warehouse_location,
  reserved = excluded.reserved,
  purchase_price = excluded.purchase_price,
  selling_price = excluded.selling_price,
  discount_price = excluded.discount_price,
  archived = excluded.archived,
  thumbnail = excluded.thumbnail,
  images_json = excluded.images_json,
  description = excluded.description,
  tags_json = excluded.tags_json,
  box_front = excluded.box_front,
  box_back = excluded.box_back,
  left_side = excluded.left_side,
  right_side = excluded.right_side,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  updated_at = CURRENT_TIMESTAMP
`;

const mapPayloadToParams = (payload = {}, fallback = {}) => {
  const category = String(payload.category ?? fallback.category ?? "").trim();
  const brand = String(payload.brand ?? fallback.brand ?? "").trim();
  const isFunko = category.toLowerCase().startsWith("funko") || brand.toLowerCase().includes("funko");
  const rawImages = Array.isArray(payload.images) ? payload.images : Array.isArray(fallback.images) ? fallback.images : [];
  const images = isFunko ? [...new Set(rawImages.filter(Boolean))].slice(0, 4) : rawImages;
  const tags = Array.isArray(payload.tags) ? payload.tags : Array.isArray(fallback.tags) ? fallback.tags : [];
  const thumbnail = payload.thumbnail || payload.image || fallback.thumbnail || fallback.image || "";
  return [
    asNumber(payload.id, asNumber(fallback.id, 0)),
    String(payload.slug || fallback.slug || "").trim().toLowerCase(),
    String(payload.sku || fallback.sku || "").trim(),
    String(payload.barcode ?? fallback.barcode ?? "").trim(),
    category,
    brand,
    String(payload.universe ?? fallback.universe ?? "").trim(),
    String(payload.franchise ?? fallback.franchise ?? "").trim(),
    String(payload.name || fallback.name || "").trim(),
    String(payload.number ?? fallback.number ?? "").trim(),
    String(payload.edition ?? fallback.edition ?? "").trim(),
    String(payload.variant ?? fallback.variant ?? "").trim(),
    toBooleanInt(payload.exclusive ?? fallback.exclusive),
    toBooleanInt(payload.chase ?? fallback.chase),
    toBooleanInt(payload.vaulted ?? fallback.vaulted),
    toBooleanInt(payload.signed ?? fallback.signed),
    String(payload.convention ?? fallback.convention ?? "").trim(),
    asNumber(payload.releaseYear ?? fallback.releaseYear, null),
    String(payload.condition ?? fallback.condition ?? "").trim(),
    String(payload.boxCondition ?? fallback.boxCondition ?? "").trim(),
    toBooleanInt(payload.neverOutOfBox ?? fallback.neverOutOfBox),
    toBooleanInt(payload.figureLikeNew ?? fallback.figureLikeNew),
    0,
    Math.max(0, asNumber(payload.stock ?? fallback.stock, 0)),
    String(payload.warehouseLocation ?? fallback.warehouseLocation ?? "").trim(),
    Math.max(0, asNumber(payload.reserved ?? fallback.reserved, 0)),
    asNumber(payload.purchasePrice ?? fallback.purchasePrice, 0),
    asNumber(payload.sellingPrice ?? payload.price ?? fallback.sellingPrice ?? fallback.price, 0),
    payload.discountPrice === null || payload.discountPrice === ""
      ? null
      : asNumber(payload.discountPrice ?? fallback.discountPrice, 0),
    toBooleanInt(payload.archived ?? fallback.archived),
    thumbnail,
    JSON.stringify(images),
    String(payload.description ?? fallback.description ?? "").trim(),
    JSON.stringify(tags),
    String(payload.boxFront ?? fallback.boxFront ?? thumbnail).trim(),
    String(payload.boxBack ?? fallback.boxBack ?? thumbnail).trim(),
    String(payload.leftSide ?? fallback.leftSide ?? thumbnail).trim(),
    String(payload.rightSide ?? fallback.rightSide ?? thumbnail).trim(),
    String(payload.metaTitle ?? fallback.metaTitle ?? "").trim(),
    String(payload.metaDescription ?? fallback.metaDescription ?? "").trim(),
  ];
};

router.get("/", async (request, response, next) => {
  try {
    const search = String(request.query.search || "").trim();
    const category = String(request.query.category || "").trim();
    const universe = String(request.query.universe || "").trim();
    const inStockOnly = String(request.query.inStock || "").trim() === "1";

    const where = ["id > 0"];
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

router.post("/", requireAdmin, async (request, response, next) => {
  try {
    const payload = request.body || {};
    const validation = await validateProductPayload(payload, null);
    if (!validation.valid) {
      return response.status(400).json({ error: "Validatie mislukt.", details: validation.errors });
    }

    await run(upsertSql, mapPayloadToParams(payload, {}));
    const row = await get("SELECT * FROM products WHERE id = ?", [Number(payload.id)]);
    return response.status(201).json({ product: toApiProduct(row), source: "database" });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAdmin, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!id) return response.status(400).json({ error: "Ongeldig product-id." });

    const existingRow = await get("SELECT * FROM products WHERE id = ?", [id]);
    if (!existingRow) return response.status(404).json({ error: "Product niet gevonden." });

    const payload = { ...request.body, id };
    const validation = await validateProductPayload(payload, id);
    if (!validation.valid) {
      return response.status(400).json({ error: "Validatie mislukt.", details: validation.errors });
    }

    await run(upsertSql, mapPayloadToParams(payload, toApiProduct(existingRow)));
    const row = await get("SELECT * FROM products WHERE id = ?", [id]);
    return response.json({ product: toApiProduct(row), source: "database" });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/stock", requireAdmin, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const stock = Math.max(0, asNumber(request.body?.stock, NaN));
    if (!id) return response.status(400).json({ error: "Ongeldig product-id." });
    if (!Number.isFinite(stock)) return response.status(400).json({ error: "Ongeldige voorraadwaarde." });

    const existingRow = await get("SELECT * FROM products WHERE id = ?", [id]);
    if (!existingRow) return response.status(404).json({ error: "Product niet gevonden." });

    await run("UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [stock, id]);
    const row = await get("SELECT * FROM products WHERE id = ?", [id]);
    return response.json({ product: toApiProduct(row), source: "database" });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/archive", requireAdmin, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!id) return response.status(400).json({ error: "Ongeldig product-id." });

    const archived = toBooleanInt(request.body?.archived);
    const existingRow = await get("SELECT * FROM products WHERE id = ?", [id]);
    if (!existingRow) return response.status(404).json({ error: "Product niet gevonden." });

    await run("UPDATE products SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [archived, id]);
    const row = await get("SELECT * FROM products WHERE id = ?", [id]);
    return response.json({ product: toApiProduct(row), source: "database" });
  } catch (error) {
    return next(error);
  }
});


router.delete("/:id", requireAdmin, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return response.status(400).json({ error: "Ongeldig product-id." });
    }

    const existingRow = await get("SELECT * FROM products WHERE id = ?", [id]);
    if (!existingRow) return response.status(404).json({ error: "Product niet gevonden." });

    const placeholderId = -999999;
    await exec("BEGIN IMMEDIATE");
    try {
      // Historical order lines keep their own product name, price and image. They are linked
      // to one hidden placeholder before the original product is removed.
      await run(
        `INSERT OR IGNORE INTO products (
          id, slug, sku, category, brand, name, stock, selling_price, archived,
          thumbnail, images_json, description, tags_json
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, '', '[]', ?, '[]')`,
        [
          placeholderId,
          "deleted-product-placeholder",
          "DELETED-PRODUCT",
          "System",
          "System",
          "Verwijderd product",
          "Verborgen placeholder voor historische bestellingen.",
        ]
      );

      const linked = await get("SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?", [id]);
      const detachedOrderItems = Number(linked?.count) || 0;
      if (detachedOrderItems > 0) {
        await run("UPDATE order_items SET product_id = ? WHERE product_id = ?", [placeholderId, id]);
      }

      await run("DELETE FROM products WHERE id = ?", [id]);
      await exec("COMMIT");
      return response.json({ deleted: true, productId: id, detachedOrderItems });
    } catch (error) {
      await exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

export default router;
