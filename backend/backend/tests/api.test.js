import path from "node:path";
import fs from "node:fs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { calculateOrderTotals } from "../../Shared/shipping.js";

const testDbPath = path.resolve(process.cwd(), "backend", "tests", "tmp", "lootifer-test.sqlite");

let app;
let migrateDatabase;
let closeDb;
let adminAgent;

before(async () => {
  fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath);

  process.env.LOOTIFER_DB_PATH = testDbPath;
  process.env.NODE_ENV = "test";
  process.env.LOOTIFER_ADMIN_USER = "admin";
  process.env.LOOTIFER_ADMIN_PASSWORD = "test-password-123";
  process.env.LOOTIFER_SESSION_SECRET = "test-session-secret-123456789";

  ({ default: app } = await import("../src/app.js"));
  ({ migrateDatabase } = await import("../src/db/migrate.js"));
  ({ closeDb } = await import("../src/db/connection.js"));

  await migrateDatabase({
    productsFilePath: path.resolve(process.cwd(), "Data", "products.json"),
  });

  adminAgent = request.agent(app);
  await adminAgent
    .post("/api/auth/login")
    .send({ username: "admin", password: "test-password-123" })
    .expect(200);
});

after(async () => {
  await closeDb();
});

test("GET /api/products returns seeded products", async () => {
  const response = await request(app).get("/api/products").expect(200);
  assert.ok(Array.isArray(response.body.products));
  assert.ok(response.body.products.length > 0);
});

test("Admin routes require authentication", async () => {
  await request(app).post("/api/products").send({}).expect(401);
  await request(app).get("/api/orders").expect(401);
  await request(app).get("/api/stock/transactions").expect(401);

  const status = await adminAgent.get("/api/auth/status").expect(200);
  assert.equal(status.body.authenticated, true);
  assert.equal(status.body.user.username, "admin");
});

test("POST/PUT/PATCH product routes beheren catalogus via API", async () => {
  const createPayload = {
    id: 99991,
    slug: "phase2-test-product",
    sku: "PHASE2-TEST-001",
    barcode: "1234567890123",
    category: "Funko Pop",
    brand: "Funko",
    universe: "Test",
    franchise: "Test",
    name: "Phase 2 Test Product",
    number: "#T1",
    edition: "Standard",
    variant: "Standard",
    releaseYear: 2026,
    condition: "Mint",
    boxCondition: "Mint",
    protectorIncluded: true,
    stock: 3,
    reserved: 0,
    purchasePrice: 5,
    sellingPrice: 25,
    discountPrice: null,
    thumbnail: "Assets/Images/Products/premium-placeholder.svg",
    images: ["Assets/Images/Products/premium-placeholder.svg"],
    description: "test",
    tags: ["test"],
    archived: false,
  };

  const created = await adminAgent.post("/api/products").send(createPayload).expect(201);
  assert.equal(created.body.product.id, createPayload.id);
  assert.equal(created.body.product.name, createPayload.name);

  const updatedPayload = {
    ...createPayload,
    name: "Phase 2 Test Product Updated",
    sellingPrice: 30,
  };
  const updated = await adminAgent.put(`/api/products/${createPayload.id}`).send(updatedPayload).expect(200);
  assert.equal(updated.body.product.name, "Phase 2 Test Product Updated");
  assert.equal(updated.body.product.sellingPrice, 30);

  const stockPatched = await adminAgent
    .patch(`/api/products/${createPayload.id}/stock`)
    .send({ stock: 1 })
    .expect(200);
  assert.equal(stockPatched.body.product.stock, 1);

  const archived = await adminAgent
    .patch(`/api/products/${createPayload.id}/archive`)
    .send({ archived: true })
    .expect(200);
  assert.equal(archived.body.product.archived, true);
});


test("Verzendkosten zijn €6,95 en gratis vanaf €75", () => {
  assert.deepEqual(calculateOrderTotals(12.95), {
    subtotal: 12.95,
    shippingCost: 6.95,
    total: 19.9,
    amountUntilFreeShipping: 62.05,
    hasFreeShipping: false,
  });

  assert.deepEqual(calculateOrderTotals(75), {
    subtotal: 75,
    shippingCost: 0,
    total: 75,
    amountUntilFreeShipping: 0,
    hasFreeShipping: true,
  });
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

  const expectedTotals = calculateOrderTotals(firstProduct.sellingPrice || firstProduct.price);
  assert.equal(createResponse.body.order.subtotal, expectedTotals.subtotal);
  assert.equal(createResponse.body.order.shippingCost, expectedTotals.shippingCost);
  assert.equal(createResponse.body.order.total, expectedTotals.total);

  const updatedProductResponse = await request(app).get(`/api/products/${firstProduct.id}`).expect(200);
  assert.equal(updatedProductResponse.body.product.stock, firstProduct.stock - 1);
});

test("PATCH /api/orders/:id/status cancels order and restores stock", async () => {
  const ordersResponse = await adminAgent.get("/api/orders").expect(200);
  const latestOrder = ordersResponse.body.orders[0];
  assert.ok(latestOrder, "Expected at least one order");

  const productBeforeCancel = await request(app).get(`/api/products/${latestOrder.items[0].id}`).expect(200);

  await adminAgent
    .patch(`/api/orders/${latestOrder.number}/status`)
    .send({ status: "Geannuleerd" })
    .expect(200);

  const productAfterCancel = await request(app).get(`/api/products/${latestOrder.items[0].id}`).expect(200);
  assert.equal(productAfterCancel.body.product.stock, productBeforeCancel.body.product.stock + latestOrder.items[0].quantity);
});

test("GET /api/orders/:orderNumber haalt individuele bestelling op", async () => {
  const ordersResponse = await adminAgent.get("/api/orders").expect(200);
  const latestOrder = ordersResponse.body.orders[0];
  assert.ok(latestOrder?.number);

  const orderResponse = await adminAgent.get(`/api/orders/${latestOrder.number}`).expect(200);
  assert.equal(orderResponse.body.order.number, latestOrder.number);
});

test("DELETE /api/orders/:orderNumber verwijdert testorder", async () => {
  const productsResponse = await request(app).get("/api/products").expect(200);
  const firstProduct = productsResponse.body.products.find((item) => Number(item.stock) > 0);

  const createResponse = await request(app)
    .post("/api/orders")
    .send({
      customer: {
        name: "Delete Test",
        email: "delete@example.com",
      },
      items: [{ id: firstProduct.id, quantity: 1 }],
    })
    .expect(201);

  await adminAgent.delete(`/api/orders/${createResponse.body.order.number}`).expect(200);
  await adminAgent.get(`/api/orders/${createResponse.body.order.number}`).expect(404);
});

test("GET /api/stock/transactions returns stock journal entries", async () => {
  const response = await adminAgent.get("/api/stock/transactions").expect(200);
  assert.ok(Array.isArray(response.body.transactions));
  assert.ok(response.body.transactions.length > 0);
});

test("API validatiefouten geven nette fouten terug", async () => {
  const invalidProduct = await adminAgent
    .post("/api/products")
    .send({ id: 0, name: "", slug: "", sku: "", sellingPrice: 0, stock: -1 })
    .expect(400);
  assert.equal(invalidProduct.body.error, "Validatie mislukt.");
  assert.ok(Array.isArray(invalidProduct.body.details));

  const invalidOrder = await request(app)
    .post("/api/orders")
    .send({ customer: { name: "", email: "" }, items: [] })
    .expect(400);
  assert.equal(invalidOrder.body.error, "Een bestelling moet minimaal één product bevatten.");
});
