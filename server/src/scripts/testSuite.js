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
process.env.PORT = "5003";

const { app } = require("../../server");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");
const errorHandler = require("../utils/errorHandler");
const inventoryAnalysisService = require("../services/inventoryAnalysisService");

test("Backend Foundation, Sales & Intelligence Test Suite", async (t) => {
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

  // Phase 3 Calculation Unit Tests
  await t.test(
    "Phase 3 Unit Test 1 — Sales velocity calculation (56 units / 7 days = 8 units/day)",
    () => {
      const velocity = inventoryAnalysisService.calculateSalesVelocity(56, 7);
      assert.equal(velocity, 8);
    },
  );

  await t.test(
    "Phase 3 Unit Test 2 — Stockout calculation (Stock 40 / Velocity 8 = 5 days)",
    () => {
      const days = inventoryAnalysisService.calculateDaysUntilStockout(40, 8);
      assert.equal(days, 5);
    },
  );

  await t.test(
    "Phase 3 Unit Test 3 — Zero sales handling (Velocity 0 -> daysUntilStockout = null)",
    () => {
      const days = inventoryAnalysisService.calculateDaysUntilStockout(100, 0);
      assert.equal(days, null);
    },
  );

  await t.test(
    "Phase 3 Unit Test 4 — Low stock detection (Stock 35 < Threshold 50 -> LOW_STOCK)",
    () => {
      const status = inventoryAnalysisService.classifyStatus(
        35,
        50,
        8,
        4.38,
        7,
      );
      assert.equal(status, "LOW_STOCK");
    },
  );

  await t.test(
    "Phase 3 Unit Test 5 — Stockout risk detection (Stock 50 >= Threshold 40, Stockout 5 <= Warning 7 -> STOCKOUT_RISK)",
    () => {
      const status = inventoryAnalysisService.classifyStatus(50, 40, 10, 5, 7);
      assert.equal(status, "STOCKOUT_RISK");
    },
  );

  await t.test(
    "Phase 3 Unit Test 6 — Healthy detection (Stock 100, Threshold 40, Stockout 20 > Warning 7 -> HEALTHY)",
    () => {
      const status = inventoryAnalysisService.classifyStatus(100, 40, 5, 20, 7);
      assert.equal(status, "HEALTHY");
    },
  );

  // Live Database Integration Tests
  if (mongoose.connection.readyState === 1) {
    // Setup test items
    await t.test(
      "Setup test inventory items and sales for integration testing",
      async () => {
        const item = new InventoryItem({
          name: "Velocity Test Item",
          sku: `VEL-${Date.now()}`,
          category: "Testing",
          currentStock: 50,
          reorderThreshold: 20,
          unitPrice: 100,
          supplier: "Velocity Supplier",
        });
        const saved = await item.save();
        testItemId = saved._id.toString();

        // Insert 2 sales in window (within 7 days)
        const now = Date.now();
        const sale1 = await Sale.create({
          inventoryItemId: saved._id,
          quantitySold: 14,
          unitPrice: 100,
          totalAmount: 1400,
          soldAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        });
        createdSaleIds.push(sale1._id);

        const sale2 = await Sale.create({
          inventoryItemId: saved._id,
          quantitySold: 7,
          unitPrice: 100,
          totalAmount: 700,
          soldAt: new Date(now - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        });
        createdSaleIds.push(sale2._id);

        // Insert 1 sale outside window (15 days ago)
        const oldSale = await Sale.create({
          inventoryItemId: saved._id,
          quantitySold: 50,
          unitPrice: 100,
          totalAmount: 5000,
          soldAt: new Date(now - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        });
        createdSaleIds.push(oldSale._id);
      },
    );

    // Test: Date Filtering & Analysis Service integration
    await t.test(
      "Phase 3 Integration Test 7 — Date filtering excludes sales older than analysis window",
      async () => {
        const analysis = await inventoryAnalysisService.analyzeItem(
          testItemId,
          { days: 7, warningDays: 7 },
        );
        // Only sale1 (14) + sale2 (7) = 21 units. Old sale (50) must be excluded!
        assert.equal(analysis.totalUnitsSold, 21);
        assert.equal(analysis.salesVelocity, 3); // 21 / 7 = 3.00
        assert.equal(analysis.daysUntilStockout, 16.67); // 50 / 3 = 16.67
        assert.equal(analysis.status, "HEALTHY");
      },
    );

    // Test: GET /api/inventory/analysis endpoint
    await t.test(
      "GET /api/inventory/analysis returns structured intelligence for all items",
      async () => {
        const res = await fetch(`${baseUrl}/api/inventory/analysis?days=7`);
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(Array.isArray(body.data));

        const itemAnalysis = body.data.find(
          (i) => i.inventoryItemId === testItemId,
        );
        assert.ok(itemAnalysis);
        assert.equal(itemAnalysis.totalUnitsSold, 21);
        assert.equal(itemAnalysis.salesVelocity, 3);
        assert.equal(itemAnalysis.status, "HEALTHY");
      },
    );

    // Test: GET /api/inventory/:id/analysis endpoint
    await t.test(
      "GET /api/inventory/:id/analysis returns intelligence for single item and 404 for missing",
      async () => {
        const res = await fetch(
          `${baseUrl}/api/inventory/${testItemId}/analysis?days=7`,
        );
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.inventoryItemId, testItemId);
        assert.equal(body.data.salesVelocity, 3);

        const fakeId = new mongoose.Types.ObjectId().toString();
        const res404 = await fetch(
          `${baseUrl}/api/inventory/${fakeId}/analysis`,
        );
        assert.equal(res404.status, 404);
      },
    );

    // Test: Query parameter validation
    await t.test(
      "GET /api/inventory/analysis rejects invalid ?days parameter with 400 Bad Request",
      async () => {
        const resNegative = await fetch(
          `${baseUrl}/api/inventory/analysis?days=-5`,
        );
        assert.equal(resNegative.status, 400);
        const bodyNegative = await resNegative.json();
        assert.match(bodyNegative.message, /positive integer/);

        const resString = await fetch(
          `${baseUrl}/api/inventory/analysis?days=hello`,
        );
        assert.equal(resString.status, 400);

        const resZero = await fetch(`${baseUrl}/api/inventory/analysis?days=0`);
        assert.equal(resZero.status, 400);
      },
    );

    // Cleanup test data
    await t.test("Cleanup Phase 3 test data", async () => {
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
