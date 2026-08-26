import { all, exec, run } from "./connection.js";

const accountSchemaSql = `

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  house_number TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nederland',
  terms_accepted_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers(email);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token_hash
ON customer_sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires_at
ON customer_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_password_resets_token_hash
ON customer_password_resets(token_hash);

CREATE INDEX IF NOT EXISTS idx_customer_password_resets_expires_at
ON customer_password_resets(expires_at);
`;
`;

export const ensureRuntimeSchema = async () => {
  await exec(accountSchemaSql);

  const columns = await all("PRAGMA table_info(products)");
  const names = new Set(columns.map((column) => String(column.name || "").toLowerCase()));

  if (columns.length && !names.has("never_out_of_box")) {
    await run("ALTER TABLE products ADD COLUMN never_out_of_box INTEGER NOT NULL DEFAULT 0");
  }

  if (columns.length && !names.has("figure_like_new")) {
    await run("ALTER TABLE products ADD COLUMN figure_like_new INTEGER NOT NULL DEFAULT 0");
  }

  // Lootifer gebruikt geen beschermhoes-informatie meer.
  if (names.has("protector_included")) {
    await run("UPDATE products SET protector_included = 0 WHERE protector_included <> 0");
  }

  // Ruim verlopen klantsessies automatisch op bij iedere serverstart.
  await run("DELETE FROM customer_sessions WHERE expires_at <= ?", [new Date().toISOString()]);
  await run("DELETE FROM customer_password_resets WHERE expires_at <= ?", [new Date().toISOString()]);
};
