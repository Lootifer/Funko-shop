import cors from "cors";
import express from "express";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import stockRouter from "./routes/stock.js";
import authRouter from "./routes/auth.js";
import siteRouter from "./routes/site.js";
import { getDbPath } from "./db/connection.js";

const app = express();

const isAllowedOrigin = (origin = "") => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
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
app.use(express.json({ limit: "40mb" }));

app.get("/api/health", (request, response) => {
  response.json({ ok: true, service: "lootifer-api", dbPath: getDbPath() });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/stock", stockRouter);
app.use("/api/site", siteRouter);

app.use((error, request, response, next) => {
  // eslint-disable-next-line no-console
  console.error(error);

  if (response.headersSent) return next(error);
  return response.status(500).json({
    error: "Unexpected server error.",
    details: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
});

export default app;
