import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import stockRouter from "./routes/stock.js";
import authRouter from "./routes/auth.js";
import siteRouter from "./routes/site.js";
import accountRouter from "./routes/account.js";
import customersRouter from "./routes/customers.js";
import { all, getDbPath } from "./db/connection.js";
import { getProductMediaRoot } from "./services/product-media-storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const websiteRoot = path.resolve(__dirname, "../..");
const app = express();

const SITE_ORIGIN = "https://www.2ndlifetoys.nl";

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const getStaticSitemapEntries = async () => {
  try {
    const sitemapPath = path.join(websiteRoot, "sitemap.xml");
    const sitemapXml = await fs.readFile(sitemapPath, "utf8");

    const entries =
      sitemapXml.match(/<url>[\s\S]*?<\/url>/gi) || [];

    return entries.filter(
      (entry) =>
        !/\/product\.html\?(?:slug|id)=/i.test(entry)
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

const buildProductSitemapEntries = async () => {
  const rows = await all(
    `
      SELECT slug
      FROM products
      WHERE id > 0
        AND archived = 0
        AND slug IS NOT NULL
        AND TRIM(slug) <> ''
      ORDER BY id ASC
    `
  );

  const seen = new Set();

  return rows
    .map((row) =>
      String(row.slug || "").trim().toLowerCase()
    )
    .filter(Boolean)
    .filter((slug) => {
      if (seen.has(slug)) {
        return false;
      }

      seen.add(slug);
      return true;
    })
    .map((slug) => {
      const productUrl =
        `${SITE_ORIGIN}/product.html?slug=${encodeURIComponent(
          slug
        )}`;

      return [
        "  <url>",
        `    <loc>${escapeXml(productUrl)}</loc>`,
        "  </url>",
      ].join("\n");
    });
};

const isAllowedOrigin = (origin = "") => {
  if (!origin) return true;

  try {
    const url = new URL(origin);

    return [
      "localhost",
      "127.0.0.1",
      "test.2ndlifetoys.nl",
      "2ndlifetoys.nl",
      "www.2ndlifetoys.nl"
    ].includes(url.hostname);
  } catch {
    return false;
  }
};

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS."));
  },
}));

app.use(express.json({ limit: "120mb" }));

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "lootifer-api",
    dbPath: getDbPath(),
    mediaPath: getProductMediaRoot(),
  });
});

/*
 * Dynamische sitemap.
 *
 * De vaste websitepagina's worden overgenomen uit sitemap.xml.
 * Product-URL's worden iedere aanvraag rechtstreeks uit de
 * actuele database opgebouwd.
 *
 * Publieke URL:
 * https://api.2ndlifetoys.nl/sitemap.xml
 */
app.get("/sitemap.xml", async (request, response, next) => {
  try {
    const [
      staticEntries,
      productEntries,
    ] = await Promise.all([
      getStaticSitemapEntries(),
      buildProductSitemapEntries(),
    ]);

    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticEntries,
      ...productEntries,
      "</urlset>",
      "",
    ].join("\n");

    response.set(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    response.set(
      "Cache-Control",
      "public, max-age=300"
    );

    response.send(sitemap);
  } catch (error) {
    next(error);
  }
});

/*
 * Nieuwe productfoto's die via Admin worden geüpload, staan op het
 * permanente Railway-volume naast de database.
 *
 * Publieke URL:
 * https://api.2ndlifetoys.nl/media/...
 */
app.use(
  "/media",
  express.static(getProductMediaRoot(), {
    fallthrough: true,
    maxAge: "7d",
    immutable: false,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/account", accountRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/stock", stockRouter);
app.use("/api/site", siteRouter);

app.use(express.static(websiteRoot));

app.get("/", (request, response) => {
  response.sendFile(path.join(websiteRoot, "index.html"));
});

app.use((error, request, response, next) => {
  // eslint-disable-next-line no-console
  console.error(error);

  if (response.headersSent) return next(error);

  return response.status(500).json({
    error: "Unexpected server error.",
    details:
      process.env.NODE_ENV === "production"
        ? undefined
        : error.message,
  });
});

export default app;
