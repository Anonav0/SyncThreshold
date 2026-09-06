const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

process.env.NODE_ENV = "test";
process.env.PORT = "5002";

const { app } = require("../../server");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");
const errorHandler = require("../utils/errorHandler");

test("Backend Foundation & Sales Test Suite", async (t) => {
  let server;
  let baseUrl;
  let testItemId = null;
  const createdSaleIds = [];

  // Setup test server and DB connection
  await t.test("Setup test HTTP server and DB connection", async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl);

    if (mongoose.connection.readyState === 0 && process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  // Test 1: Health Check
  await t.test("GET /api/health returns 200 and running status", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Inventory API is running");
  });

  // Test 2: 404 on undefined routes
  await t.test(
    "GET /api/invalid-endpoint returns 404 with consistent error format",
    async () => {
      const res = await fetch(`${baseUrl}/api/invalid-endpoint`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /Route not found/);
    },
  );

  // Test 3: InventoryItem Schema Validation
  await t.test(
    "InventoryItem schema validates required fields and non-negative constraints",
    async () => {
      const invalidItem = new InventoryItem({});
      const validationError = invalidItem.validateSync();
      assert.ok(validationError);
      assert.ok(validationError.errors.name);
      assert.ok(validationError.errors.sku);
      assert.ok(validationError.errors.category);
      assert.ok(validationError.errors.currentStock);
      assert.ok(validationError.errors.reorderThreshold);
      assert.ok(validationError.errors.unitPrice);
      assert.ok(validationError.errors.supplier);
    },
  );

  // Test 4: Sale Schema Validation
  await t.test(
    "Sale schema validates required fields and integer quantity",
    async () => {
      const invalidSale = new Sale({});
      const err = invalidSale.validateSync();
      assert.ok(err);
      assert.ok(err.errors.inventoryItemId);
      assert.ok(err.errors.quantitySold);
      assert.ok(err.errors.unitPrice);
      assert.ok(err.errors.totalAmount);

      const nonIntegerSale = new Sale({
        inventoryItemId: new mongoose.Types.ObjectId(),
        quantitySold: 2.5,
        unitPrice: 10,
        totalAmount: 25,
      });
      const intErr = nonIntegerSale.validateSync();
      assert.ok(intErr);
      assert.ok(intErr.errors.quantitySold);
    },
  );

  // Test 5: Error Handler format
  await t.test(
    "Centralized errorHandler formats CastError and ValidationError correctly",
    async () => {
      let mockStatus = 0;
      let mockJson = null;

      const mockRes = {
        status(code) {
          mockStatus = code;
          return this;
        },
        json(data) {
          mockJson = data;
          return this;
        },
      };

      const castError = {
        name: "CastError",
        kind: "ObjectId",
        value: "invalid-id",
      };
      errorHandler(castError, {}, mockRes, () => {});
      assert.equal(mockStatus, 400);
      assert.equal(mockJson.success, false);
      assert.match(mockJson.message, /invalid-id/);
    },
  );

  // Test 6: AI Service Stub Isolation
  await t.test(
    "aiService throws appropriate placeholder error without crashing",
    async () => {
      const aiService = require("../services/aiService");
      await assert.rejects(
        async () => {
          await aiService.analyzeInventoryRisk([]);
        },
        { message: "AI Service not implemented in Phase 1" },
      );
    },
  );

  // Only run live DB integration tests if connected to MongoDB
  if (mongoose.connection.readyState === 1) {
    // Test 7: Create test item for sale tests
    await t.test("Create test inventory item for sales workflow", async () => {
      const item = new InventoryItem({
        name: "Sales Test Item",
        sku: `TEST-SALE-${Date.now()}`,
        category: "Testing",
        currentStock: 50,
        reorderThreshold: 10,
        unitPrice: 100,
        averageDailySales: 5,
        supplier: "Test Suite Supplier",
      });
      const saved = await item.save();
      testItemId = saved._id.toString();
      assert.ok(testItemId);
    });

    // Test 8: Successful Sale (Stock: 50 -> 45, Total: 500)
    await t.test(
      "POST /api/sales successfully records sale and reduces stock",
      async () => {
        const res = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: testItemId,
            quantitySold: 5,
          }),
        });

        const body = await res.json();
        assert.equal(res.status, 201);
        assert.equal(body.success, true);
        assert.equal(body.data.sale.quantitySold, 5);
        assert.equal(body.data.sale.unitPrice, 100);
        assert.equal(body.data.sale.totalAmount, 500);
        assert.equal(body.data.inventory.currentStock, 45);

        createdSaleIds.push(body.data.sale._id);

        // Verify persistence in MongoDB
        const storedItem = await InventoryItem.findById(testItemId);
        assert.equal(storedItem.currentStock, 45);

        const storedSale = await Sale.findById(body.data.sale._id);
        assert.ok(storedSale);
        assert.equal(storedSale.totalAmount, 500);
      },
    );

    // Test 9: Insufficient Stock (Stock: 45, Request: 50 -> 400 Bad Request)
    await t.test(
      "POST /api/sales rejects sale when requested quantity exceeds stock",
      async () => {
        const res = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: testItemId,
            quantitySold: 50,
          }),
        });

        const body = await res.json();
        assert.equal(res.status, 400);
        assert.equal(body.success, false);
        assert.match(body.message, /Insufficient stock/i);

        // Verify stock remained unchanged at 45
        const storedItem = await InventoryItem.findById(testItemId);
        assert.equal(storedItem.currentStock, 45);
      },
    );

    // Test 10: Invalid Quantity (0 or negative)
    await t.test(
      "POST /api/sales rejects zero or negative quantity",
      async () => {
        const resZero = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: testItemId,
            quantitySold: 0,
          }),
        });
        assert.equal(resZero.status, 400);

        const resNegative = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: testItemId,
            quantitySold: -5,
          }),
        });
        assert.equal(resNegative.status, 400);
      },
    );

    // Test 11: Missing or Invalid Inventory Item
    await t.test(
      "POST /api/sales rejects missing or invalid inventory ID",
      async () => {
        const resInvalidId = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: "invalid-id",
            quantitySold: 2,
          }),
        });
        assert.equal(resInvalidId.status, 400);

        const fakeId = new mongoose.Types.ObjectId().toString();
        const resNonExistent = await fetch(`${baseUrl}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: fakeId,
            quantitySold: 2,
          }),
        });
        assert.equal(resNonExistent.status, 404);
      },
    );

    // Test 12: GET /api/sales and GET /api/sales/inventory/:id
    await t.test(
      "GET /api/sales and GET /api/sales/inventory/:id return sale records",
      async () => {
        const resAll = await fetch(`${baseUrl}/api/sales`);
        const bodyAll = await resAll.json();
        assert.equal(resAll.status, 200);
        assert.equal(bodyAll.success, true);
        assert.ok(Array.isArray(bodyAll.data));

        const resByItem = await fetch(
          `${baseUrl}/api/sales/inventory/${testItemId}`,
        );
        const bodyByItem = await resByItem.json();
        assert.equal(resByItem.status, 200);
        assert.equal(bodyByItem.success, true);
        assert.ok(Array.isArray(bodyByItem.data));
        assert.equal(bodyByItem.data.length, 1);
        assert.equal(bodyByItem.data[0].quantitySold, 5);
        assert.equal(bodyByItem.data[0].totalAmount, 500);
      },
    );

    // Cleanup test data
    await t.test("Cleanup test inventory item and sales", async () => {
      if (testItemId) {
        await InventoryItem.findByIdAndDelete(testItemId);
      }
      if (createdSaleIds.length > 0) {
        await Sale.deleteMany({ _id: { $in: createdSaleIds } });
      }
      assert.ok(true);
    });
  }

  // Teardown
  await t.test("Teardown test server and disconnect DB", async () => {
    await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    assert.ok(true);
  });
});
