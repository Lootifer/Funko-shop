import { all, run } from "./connection.js";

export const ensureRuntimeSchema = async () => {
  const columns = await all("PRAGMA table_info(products)");
  const names = new Set(columns.map((column) => String(column.name || "").toLowerCase()));

  if (!names.has("never_out_of_box")) {
    await run("ALTER TABLE products ADD COLUMN never_out_of_box INTEGER NOT NULL DEFAULT 0");
  }

  if (!names.has("figure_like_new")) {
    await run("ALTER TABLE products ADD COLUMN figure_like_new INTEGER NOT NULL DEFAULT 0");
  }

  // Lootifer gebruikt geen beschermhoes-informatie meer.
  if (names.has("protector_included")) {
    await run("UPDATE products SET protector_included = 0 WHERE protector_included <> 0");
  }
};
