import cors from "cors";
import express from "express";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import stockRouter from "./routes/stock.js";
import { getDbPath } from "./db/connection.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (request, response) => {
  response.json({ ok: true, service: "lootifer-api", dbPath: getDbPath() });
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/stock", stockRouter);

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
