import fs from "node:fs/promises";
import path from "node:path";
import { all, exec, run } from "./connection.js";

const schemaSql = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  brand TEXT,
  universe TEXT,
  franchise TEXT,
  name TEXT NOT NULL,
  number TEXT,
  edition TEXT,
  variant TEXT,
  exclusive INTEGER NOT NULL DEFAULT 0,
  chase INTEGER NOT NULL DEFAULT 0,
  vaulted INTEGER NOT NULL DEFAULT 0,
  signed INTEGER NOT NULL DEFAULT 0,
  convention TEXT,
  release_year INTEGER,
  condition TEXT,
  box_condition TEXT,
  protector_included INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  warehouse_location TEXT,
  reserved INTEGER NOT NULL DEFAULT 0,
  purchase_price REAL,
  selling_price REAL,
  discount_price REAL,
  thumbnail TEXT,
  images_json TEXT,
  description TEXT,
  tags_json TEXT,
  box_front TEXT,
  box_back TEXT,
  left_side TEXT,
  right_side TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Nieuw',
  payment_status TEXT,
  is_test_order INTEGER NOT NULL DEFAULT 1,
  stock_restored_at TEXT,
  delivery_method TEXT,
  notes TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  customer_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  order_id INTEGER,
  quantity INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('increase', 'decrease')),
  reason TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_id ON stock_transactions(product_id);
`;

const toBooleanInt = (value) => (value ? 1 : 0);
const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProductRecord = (item = {}, index = 0) => {
  const id = asNumber(item.id, index + 1);
  const name = String(item.name || `Collectible ${id}`).trim();
  const slug = String(item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).trim() || `collectible-${id}`;
  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];

  return {
    id,
    slug,
    sku: item.sku || "",
    barcode: item.barcode || "",
    category: item.category || "",
    brand: item.brand || "",
    universe: item.universe || "",
    franchise: item.franchise || "",
    name,
    number: item.number || "",
    edition: item.edition || "",
    variant: item.variant || "",
    exclusive: toBooleanInt(item.exclusive),
    chase: toBooleanInt(item.chase),
    vaulted: toBooleanInt(item.vaulted),
    signed: toBooleanInt(item.signed),
    convention: item.convention || "",
    releaseYear: asNumber(item.releaseYear, null),
    condition: item.condition || "",
    boxCondition: item.boxCondition || "",
    protectorIncluded: toBooleanInt(item.protectorIncluded),
    stock: Math.max(0, asNumber(item.stock, 0)),
    warehouseLocation: item.warehouseLocation || "",
    reserved: Math.max(0, asNumber(item.reserved, 0)),
    purchasePrice: asNumber(item.purchasePrice, 0),
    sellingPrice: asNumber(item.sellingPrice ?? item.price, 0),
    discountPrice: item.discountPrice === null || item.discountPrice === "" ? null : asNumber(item.discountPrice, 0),
    thumbnail: item.thumbnail || item.image || "",
    imagesJson: JSON.stringify(images),
    description: item.description || "",
    tagsJson: JSON.stringify(tags),
    boxFront: item.boxFront || "",
    boxBack: item.boxBack || "",
    leftSide: item.leftSide || "",
    rightSide: item.rightSide || "",
    metaTitle: item.metaTitle || "",
    metaDescription: item.metaDescription || "",
  };
};

const upsertProductSql = `
INSERT INTO products (
  id, slug, sku, barcode, category, brand, universe, franchise, name, number, edition, variant,
  exclusive, chase, vaulted, signed, convention, release_year, condition, box_condition,
  protector_included, stock, warehouse_location, reserved, purchase_price, selling_price,
  discount_price, thumbnail, images_json, description, tags_json, box_front, box_back,
  left_side, right_side, meta_title, meta_description, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, CURRENT_TIMESTAMP
)
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
  protector_included = excluded.protector_included,
  stock = excluded.stock,
  warehouse_location = excluded.warehouse_location,
  reserved = excluded.reserved,
  purchase_price = excluded.purchase_price,
  selling_price = excluded.selling_price,
  discount_price = excluded.discount_price,
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
  updated_at = CURRENT_TIMESTAMP;
`;

export const migrateDatabase = async ({ productsFilePath } = {}) => {
  await exec(schemaSql);

  const inputPath = productsFilePath
    ? path.resolve(productsFilePath)
    : path.resolve(process.cwd(), "Data", "products.json");

  const fileContents = await fs.readFile(inputPath, "utf-8");
  const sanitizedJson = String(fileContents || "").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(sanitizedJson);

  if (!Array.isArray(parsed)) {
    throw new Error("Data/products.json must contain an array of products.");
  }

  for (let index = 0; index < parsed.length; index += 1) {
    const product = normalizeProductRecord(parsed[index], index);
    // Keep product catalog in sync without deleting the original JSON file.
    await run(upsertProductSql, [
      product.id,
      product.slug,
      product.sku,
      product.barcode,
      product.category,
      product.brand,
      product.universe,
      product.franchise,
      product.name,
      product.number,
      product.edition,
      product.variant,
      product.exclusive,
      product.chase,
      product.vaulted,
      product.signed,
      product.convention,
      product.releaseYear,
      product.condition,
      product.boxCondition,
      product.protectorIncluded,
      product.stock,
      product.warehouseLocation,
      product.reserved,
      product.purchasePrice,
      product.sellingPrice,
      product.discountPrice,
      product.thumbnail,
      product.imagesJson,
      product.description,
      product.tagsJson,
      product.boxFront,
      product.boxBack,
      product.leftSide,
      product.rightSide,
      product.metaTitle,
      product.metaDescription,
    ]);
  }

  const [{ productCount }, { orderCount }] = await Promise.all([
    all("SELECT COUNT(*) AS productCount FROM products"),
    all("SELECT COUNT(*) AS orderCount FROM orders"),
  ]).then((rows) => rows.map((entry) => entry[0] || { productCount: 0, orderCount: 0 }));

  return {
    productsImported: Number(productCount) || 0,
    ordersExisting: Number(orderCount) || 0,
    sourceFile: inputPath,
  };
};
