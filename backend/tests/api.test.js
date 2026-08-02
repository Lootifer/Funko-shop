import path from "node:path";
import fs from "node:fs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

const testDbPath = path.resolve(process.cwd(), "backend", "tests", "tmp", "lootifer-test.sqlite");

let app;
let migrateDatabase;
let closeDb;

before(async () => {
  fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath);

  process.env.LOOTIFER_DB_PATH = testDbPath;
  process.env.NODE_ENV = "test";

  ({ default: app } = await import("../src/app.js"));
  ({ migrateDatabase } = await import("../src/db/migrate.js"));
  ({ closeDb } = await import("../src/db/connection.js"));

  await migrateDatabase({
    productsFilePath: path.resolve(process.cwd(), "Data", "products.json"),
  });
});

after(async () => {
  await closeDb();
});

test("GET /api/products returns seeded products", async () => {
  const response = await request(app).get("/api/products").expect(200);
  assert.ok(Array.isArray(response.body.products));
  assert.ok(response.body.products.length > 0);
});

test("POST /api/orders creates order and decreases stock", async () => {
  const productsResponse = await request(app).get("/api/products").expect(200);
  const firstProduct = productsResponse.body.products.find((item) => Number(item.stock) > 0);
  assert.ok(firstProduct, "Expected at least one in-stock product");

  const orderPayload = {
    customer: {
      name: "Test Collector",
      email: "collector@example.com",
      phone: "0612345678",
      street: "Main Street",
      houseNumber: "12",
      postalCode: "1234AB",
      city: "Amsterdam",
      country: "Nederland",
    },
    deliveryMethod: "Standaard levering",
    items: [{ id: firstProduct.id, quantity: 1 }],
  };

  const createResponse = await request(app).post("/api/orders").send(orderPayload).expect(201);
  assert.equal(createResponse.body.order.customer.name, "Test Collector");

  const updatedProductResponse = await request(app).get(`/api/products/${firstProduct.id}`).expect(200);
  assert.equal(updatedProductResponse.body.product.stock, firstProduct.stock - 1);
});

test("PATCH /api/orders/:id/status cancels order and restores stock", async () => {
  const ordersResponse = await request(app).get("/api/orders").expect(200);
  const latestOrder = ordersResponse.body.orders[0];
  assert.ok(latestOrder, "Expected at least one order");

  const productBeforeCancel = await request(app).get(`/api/products/${latestOrder.items[0].id}`).expect(200);

  await request(app)
    .patch(`/api/orders/${latestOrder.id}/status`)
    .send({ status: "Geannuleerd" })
    .expect(200);

  const productAfterCancel = await request(app).get(`/api/products/${latestOrder.items[0].id}`).expect(200);
  assert.equal(productAfterCancel.body.product.stock, productBeforeCancel.body.product.stock + latestOrder.items[0].quantity);
});

test("GET /api/stock/transactions returns stock journal entries", async () => {
  const response = await request(app).get("/api/stock/transactions").expect(200);
  assert.ok(Array.isArray(response.body.transactions));
  assert.ok(response.body.transactions.length > 0);
});
