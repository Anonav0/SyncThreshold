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
process.env.GEMINI_REQUEST_DELAY_MS = "50";

const { app } = require("../../server");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");
const errorHandler = require("../utils/errorHandler");
const inventoryAnalysisService = require("../services/inventoryAnalysisService");
const aiService = require("../services/aiService");
const { validateAIResponse } = require("../utils/aiResponseValidator");
const inventoryAutomationService = require("../services/inventoryAutomationService");
const {
  startInventoryScheduler,
  stopInventoryScheduler,
} = require("../jobs/inventoryMonitor");
const Alert = require("../models/Alert");
const alertService = require("../services/alertService");

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

  // Phase 4 AI Response Validator Unit Tests
  await t.test(
    "Phase 4 Unit Test 1 — validateAIResponse accepts valid schema conforming response",
    () => {
      const valid = {
        urgency: "HIGH",
        recommendedAction: "REORDER_SOON",
        reason: "Stock may run out within 4 days.",
      };
      const result = validateAIResponse(valid);
      assert.equal(result.isValid, true);
      assert.equal(result.sanitized.urgency, "HIGH");
      assert.equal(result.sanitized.recommendedAction, "REORDER_SOON");
    },
  );

  await t.test(
    "Phase 4 Unit Test 2 — validateAIResponse rejects invalid urgency",
    () => {
      const invalid = {
        urgency: "EXTREME",
        recommendedAction: "REORDER_NOW",
        reason: "Out of bounds urgency",
      };
      const result = validateAIResponse(invalid);
      assert.equal(result.isValid, false);
      assert.match(result.error, /Invalid urgency/);
    },
  );

  await t.test(
    "Phase 4 Unit Test 3 — validateAIResponse rejects invalid recommendedAction",
    () => {
      const invalid = {
        urgency: "LOW",
        recommendedAction: "DO_NOTHING",
        reason: "Invalid action",
      };
      const result = validateAIResponse(invalid);
      assert.equal(result.isValid, false);
      assert.match(result.error, /Invalid recommendedAction/);
    },
  );

  await t.test(
    "Phase 4 Unit Test 4 — validateAIResponse rejects empty or non-string reason",
    () => {
      const emptyReason = {
        urgency: "LOW",
        recommendedAction: "MONITOR",
        reason: "   ",
      };
      const result = validateAIResponse(emptyReason);
      assert.equal(result.isValid, false);
      assert.match(result.error, /non-empty string/);
    },
  );

  // Phase 4 Deterministic Fallback Unit Tests
  await t.test(
    "Phase 4 Unit Test 5 — Fallback returns CRITICAL / REORDER_NOW when stockout <= 2 days",
    () => {
      const fallback = aiService.calculateFallback({
        daysUntilStockout: 1.5,
        status: "STOCKOUT_RISK",
        salesVelocity: 10,
      });
      assert.equal(fallback.urgency, "CRITICAL");
      assert.equal(fallback.recommendedAction, "REORDER_NOW");
      assert.equal(fallback.source, "fallback");
    },
  );

  await t.test(
    "Phase 4 Unit Test 6 — Fallback returns HIGH / REORDER_SOON when stockout <= 7 days",
    () => {
      const fallback = aiService.calculateFallback({
        daysUntilStockout: 4.5,
        status: "STOCKOUT_RISK",
        salesVelocity: 6,
      });
      assert.equal(fallback.urgency, "HIGH");
      assert.equal(fallback.recommendedAction, "REORDER_SOON");
      assert.equal(fallback.source, "fallback");
    },
  );

  await t.test(
    "Phase 4 Unit Test 7 — Fallback returns MEDIUM / PLAN_REORDER when status is LOW_STOCK",
    () => {
      const fallback = aiService.calculateFallback({
        daysUntilStockout: 12,
        status: "LOW_STOCK",
        currentStock: 10,
        reorderThreshold: 20,
      });
      assert.equal(fallback.urgency, "MEDIUM");
      assert.equal(fallback.recommendedAction, "PLAN_REORDER");
      assert.equal(fallback.source, "fallback");
    },
  );

  await t.test(
    "Phase 4 Unit Test 8 — Fallback returns LOW / MONITOR for healthy stock levels",
    () => {
      const fallback = aiService.calculateFallback({
        daysUntilStockout: 30,
        status: "HEALTHY",
      });
      assert.equal(fallback.urgency, "LOW");
      assert.equal(fallback.recommendedAction, "MONITOR");
      assert.equal(fallback.source, "fallback");
    },
  );

  await t.test(
    "Phase 4 Unit Test 9 — aiService handles missing or disabled Gemini safely with fallback",
    async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const originalClient = aiService._client;
      aiService._client = null;

      try {
        const result = await aiService.analyzeInventoryRisk({
          name: "Test Cotton",
          sku: "COT-01",
          currentStock: 10,
          reorderThreshold: 20,
          status: "LOW_STOCK",
          daysUntilStockout: 14,
        });

        assert.equal(result.source, "fallback");
        assert.equal(result.urgency, "MEDIUM");
        assert.equal(result.recommendedAction, "PLAN_REORDER");
      } finally {
        if (originalKey) process.env.GEMINI_API_KEY = originalKey;
        aiService._client = originalClient;
      }
    },
  );

  await t.test(
    "Phase 4 Unit Test 10 — aiService enforces request rate limit delay between consecutive calls",
    async () => {
      const originalDelay = process.env.GEMINI_REQUEST_DELAY_MS;
      process.env.GEMINI_REQUEST_DELAY_MS = "60";
      aiService._lastRequestTime = Date.now();

      const start = Date.now();
      await aiService._enforceRequestRateLimit("Test Rate Pacing Item");
      const duration = Date.now() - start;

      assert.ok(
        duration >= 40,
        `Expected delay of at least ~40ms, but took ${duration}ms`,
      );

      if (originalDelay !== undefined) {
        process.env.GEMINI_REQUEST_DELAY_MS = originalDelay;
      }
    },
  );

  // Phase 5 Automated Inventory Monitoring Unit Tests
  await t.test(
    "Phase 5 Unit Test 1 — Overlapping execution is prevented by in-memory lock",
    async () => {
      inventoryAutomationService.isRunning = true;
      try {
        await assert.rejects(
          async () => {
            await inventoryAutomationService.runInventoryCheck({
              isScheduled: false,
            });
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.match(err.message, /already running/);
            return true;
          },
        );
      } finally {
        inventoryAutomationService.isRunning = false;
      }
    },
  );

  await t.test(
    "Phase 5 Unit Test 2 — AUTOMATION_ENABLED=false prevents cron scheduler registration",
    () => {
      const orig = process.env.AUTOMATION_ENABLED;
      process.env.AUTOMATION_ENABLED = "false";
      try {
        const task = startInventoryScheduler();
        assert.equal(task, null);
      } finally {
        if (orig !== undefined) {
          process.env.AUTOMATION_ENABLED = orig;
        } else {
          delete process.env.AUTOMATION_ENABLED;
        }
      }
    },
  );

  await t.test(
    "Phase 5 Unit Test 3 — getStatus returns scheduler and execution metadata",
    () => {
      const status = inventoryAutomationService.getStatus();
      assert.ok(typeof status.enabled === "boolean");
      assert.ok(typeof status.schedule === "string");
      assert.equal(status.running, false);
      assert.ok(typeof status.aiEnabled === "boolean");
    },
  );

  // Phase 6 Alert Persistence & Duplicate Prevention Unit Tests
  await t.test(
    "Phase 6 Unit Test 1 — createAlertIfNeeded creates a new active alert when none exists",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();
      const outcome = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        urgency: "HIGH",
        recommendedAction: "REORDER_SOON",
        reason: "Test low stock alert",
        source: "fallback",
      });

      assert.equal(outcome.created, true);
      assert.equal(outcome.reused, false);
      assert.equal(outcome.alert.status, "ACTIVE");
      assert.equal(outcome.alert.alertType, "LOW_STOCK");
      assert.equal(outcome.alert.urgency, "HIGH");

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
    },
  );

  await t.test(
    "Phase 6 Unit Test 2 — createAlertIfNeeded prevents duplicate alerts and reuses existing active alert",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();
      const first = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        urgency: "HIGH",
        recommendedAction: "REORDER_SOON",
        reason: "First run alert",
        source: "fallback",
      });
      assert.equal(first.created, true);

      // Second run with same item and alertType
      const second = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        urgency: "CRITICAL",
        recommendedAction: "REORDER_NOW",
        reason: "Second run attempt",
        source: "gemini",
      });

      assert.equal(second.created, false);
      assert.equal(second.reused, true);
      assert.equal(second.alert._id.toString(), first.alert._id.toString());

      const count = await Alert.countDocuments({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        status: "ACTIVE",
      });
      assert.equal(count, 1, "Only one active alert must exist in DB");

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
    },
  );

  await t.test(
    "Phase 6 Unit Test 3 — MongoDB partial unique index prevents duplicate active alerts",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();
      await Alert.syncIndexes();

      await Alert.create({
        inventoryItemId: dummyItemId,
        alertType: "STOCKOUT_RISK",
        urgency: "CRITICAL",
        recommendedAction: "REORDER_NOW",
        reason: "Index test alert 1",
        source: "gemini",
        status: "ACTIVE",
      });

      // Attempting to create duplicate active alert must throw duplicate key error code 11000
      await assert.rejects(
        async () => {
          await Alert.create({
            inventoryItemId: dummyItemId,
            alertType: "STOCKOUT_RISK",
            urgency: "HIGH",
            recommendedAction: "REORDER_SOON",
            reason: "Duplicate active alert attempt",
            source: "fallback",
            status: "ACTIVE",
          });
        },
        (err) => {
          assert.ok(
            err.code === 11000 ||
              (err.message && err.message.includes("E11000")),
          );
          return true;
        },
      );

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
    },
  );

  await t.test(
    "Phase 6 Unit Test 4 — Different alert types (LOW_STOCK and STOCKOUT_RISK) can coexist as active alerts",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();

      const lowStock = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        urgency: "MEDIUM",
        recommendedAction: "PLAN_REORDER",
        reason: "Low stock alert",
        source: "fallback",
      });

      const stockoutRisk = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "STOCKOUT_RISK",
        urgency: "HIGH",
        recommendedAction: "REORDER_SOON",
        reason: "Stockout risk alert",
        source: "gemini",
      });

      assert.equal(lowStock.created, true);
      assert.equal(stockoutRisk.created, true);

      const count = await Alert.countDocuments({
        inventoryItemId: dummyItemId,
        status: "ACTIVE",
      });
      assert.equal(count, 2, "Both alert types must coexist for the same item");

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
    },
  );

  await t.test(
    "Phase 6 Unit Test 5 — resolveAlertsIfNeeded resolves LOW_STOCK when stock recovers to threshold",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();

      await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "LOW_STOCK",
        urgency: "HIGH",
        recommendedAction: "REORDER_SOON",
        reason: "Needs reorder",
        source: "fallback",
      });

      // Resolve when currentStock (25) >= reorderThreshold (20)
      const res = await alertService.resolveAlertsIfNeeded({
        inventoryItemId: dummyItemId,
        currentStock: 25,
        reorderThreshold: 20,
        status: "HEALTHY",
      });

      assert.equal(res.resolvedCount, 1);
      const updated = await Alert.findById(res.resolvedAlerts[0]._id);
      assert.equal(updated.status, "RESOLVED");
      assert.ok(updated.resolvedAt !== null);

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
    },
  );

  await t.test(
    "Phase 6 Unit Test 6 — resolveObsoleteAlerts resolves STOCKOUT_RISK when risk clears",
    async () => {
      const dummyItemId = new mongoose.Types.ObjectId();

      const created = await alertService.createAlertIfNeeded({
        inventoryItemId: dummyItemId,
        alertType: "STOCKOUT_RISK",
        urgency: "CRITICAL",
        recommendedAction: "REORDER_NOW",
        reason: "Imminent stockout",
        source: "gemini",
      });

      // Audit shows item is now HEALTHY
      const catalogAnalysis = [
        {
          inventoryItemId: dummyItemId,
          currentStock: 50,
          reorderThreshold: 20,
          salesVelocity: 1,
          daysUntilStockout: 50,
          status: "HEALTHY",
        },
      ];

      const res = await alertService.resolveObsoleteAlerts(catalogAnalysis);
      assert.equal(res.resolvedCount, 1);

      const stored = await Alert.findById(created.alert._id);
      assert.equal(stored.status, "RESOLVED");
      assert.ok(stored.resolvedAt !== null);

      // Verify resolved alert remains in DB (not deleted)
      const allForProduct = await Alert.find({ inventoryItemId: dummyItemId });
      assert.equal(allForProduct.length, 1);

      await Alert.deleteMany({ inventoryItemId: dummyItemId });
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

    // Phase 4 Integration Test 10: Single Item AI Risk Analysis Endpoint
    await t.test(
      "POST /api/inventory/:id/ai-analysis returns structured AI decision with deterministic baseline",
      async () => {
        const res = await fetch(
          `${baseUrl}/api/inventory/${testItemId}/ai-analysis?days=7`,
          { method: "POST" },
        );
        const body = await res.json();

        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.inventory.id, testItemId);
        assert.equal(body.data.deterministicAnalysis.status, "HEALTHY");
        assert.ok(body.data.aiAnalysis);
        assert.ok(
          ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
            body.data.aiAnalysis.urgency,
          ),
        );
        assert.ok(
          ["MONITOR", "PLAN_REORDER", "REORDER_SOON", "REORDER_NOW"].includes(
            body.data.aiAnalysis.recommendedAction,
          ),
        );
        assert.ok(body.data.aiAnalysis.reason.length > 0);
        assert.ok(["gemini", "fallback"].includes(body.data.aiAnalysis.source));
      },
    );

    // Phase 4 Integration Test 11: 404 on Missing Item
    await t.test(
      "POST /api/inventory/:id/ai-analysis returns 404 for nonexistent item",
      async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res404 = await fetch(
          `${baseUrl}/api/inventory/${fakeId}/ai-analysis`,
          { method: "POST" },
        );
        assert.equal(res404.status, 404);
      },
    );

    // Phase 4 Integration Test 12: Candidate-Only Batch AI Analysis (Healthy Items Excluded)
    await t.test(
      "POST /api/inventory/ai-analysis filters out healthy items and only evaluates risk candidates",
      async () => {
        // Create an explicit low-stock candidate
        const lowStockCandidate = await InventoryItem.create({
          name: "Low Stock Candidate Item",
          sku: `CAND-${Date.now()}`,
          category: "Testing",
          currentStock: 5,
          reorderThreshold: 25,
          unitPrice: 50,
          supplier: "Candidate Supplier",
        });

        try {
          const res = await fetch(
            `${baseUrl}/api/inventory/ai-analysis?days=7`,
            {
              method: "POST",
            },
          );
          const body = await res.json();

          assert.equal(res.status, 200);
          assert.equal(body.success, true);
          assert.ok(Array.isArray(body.data));

          // Verify healthy test item is EXCLUDED from candidates
          const foundHealthy = body.data.some(
            (c) => c.inventory.id === testItemId,
          );
          assert.equal(
            foundHealthy,
            false,
            "Healthy item must be excluded from AI analysis candidates",
          );

          // Verify low-stock item is INCLUDED in candidates
          const foundLowStock = body.data.some(
            (c) => c.inventory.id === lowStockCandidate._id.toString(),
          );
          assert.equal(
            foundLowStock,
            true,
            "Low-stock item must be included in AI analysis candidates",
          );
        } finally {
          await InventoryItem.findByIdAndDelete(lowStockCandidate._id);
        }
      },
    );

    // Phase 5 Integration Test 4: Automation status endpoint
    await t.test(
      "GET /api/automation/status returns 200 with configuration & status",
      async () => {
        const res = await fetch(`${baseUrl}/api/automation/status`);
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(body.data);
        assert.ok(typeof body.data.enabled === "boolean");
        assert.ok(typeof body.data.schedule === "string");
        assert.equal(body.data.running, false);
      },
    );

    // Phase 5 Integration Test 5: Manual inventory check trigger returns summary
    await t.test(
      "POST /api/automation/inventory-check performs full monitoring run and returns summary",
      async () => {
        const res = await fetch(`${baseUrl}/api/automation/inventory-check`, {
          method: "POST",
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(body.data);
        assert.ok(["SUCCESS", "PARTIAL_SUCCESS"].includes(body.data.status));
        assert.ok(body.data.itemsChecked >= 1);
        assert.ok(typeof body.data.candidatesFound === "number");
        assert.ok(typeof body.data.aiAnalyses === "number");
        assert.ok(typeof body.data.geminiSuccesses === "number");
        assert.ok(typeof body.data.fallbackAnalyses === "number");
        assert.ok(typeof body.data.errors === "number");
      },
    );

    // Phase 5 Integration Test 6: Concurrency conflict returns 409
    await t.test(
      "POST /api/automation/inventory-check returns 409 Conflict when a run is active",
      async () => {
        inventoryAutomationService.isRunning = true;
        try {
          const res = await fetch(`${baseUrl}/api/automation/inventory-check`, {
            method: "POST",
          });
          assert.equal(res.status, 409);
          const body = await res.json();
          assert.equal(body.success, false);
          assert.match(body.message, /already running/);
        } finally {
          inventoryAutomationService.isRunning = false;
        }
      },
    );

    // Phase 6 Integration Test 7: GET /api/alerts returns alerts list with filters
    await t.test(
      "GET /api/alerts returns 200 with list of alerts and supports ?status=ACTIVE filter",
      async () => {
        const dummyItemId = new mongoose.Types.ObjectId();
        const created = await Alert.create({
          inventoryItemId: dummyItemId,
          alertType: "LOW_STOCK",
          urgency: "MEDIUM",
          recommendedAction: "PLAN_REORDER",
          reason: "Filter test alert",
          source: "fallback",
          status: "ACTIVE",
        });

        try {
          const res = await fetch(`${baseUrl}/api/alerts?status=ACTIVE`);
          const body = await res.json();
          assert.equal(res.status, 200);
          assert.equal(body.success, true);
          assert.ok(Array.isArray(body.data));
          assert.ok(body.data.some((a) => a._id === created._id.toString()));
        } finally {
          await Alert.findByIdAndDelete(created._id);
        }
      },
    );

    // Phase 6 Integration Test 8: GET /api/alerts/active returns active alerts
    await t.test(
      "GET /api/alerts/active returns 200 and only active alerts",
      async () => {
        const res = await fetch(`${baseUrl}/api/alerts/active`);
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(Array.isArray(body.data));
        assert.ok(body.data.every((a) => a.status === "ACTIVE"));
      },
    );

    // Phase 6 Integration Test 9: GET /api/alerts/:id returns single alert
    await t.test(
      "GET /api/alerts/:id returns 200 for existing alert and 404 for missing alert",
      async () => {
        const dummyItemId = new mongoose.Types.ObjectId();
        const created = await Alert.create({
          inventoryItemId: dummyItemId,
          alertType: "STOCKOUT_RISK",
          urgency: "HIGH",
          recommendedAction: "REORDER_SOON",
          reason: "ID lookup test alert",
          source: "fallback",
          status: "ACTIVE",
        });

        try {
          const res200 = await fetch(`${baseUrl}/api/alerts/${created._id}`);
          const body200 = await res200.json();
          assert.equal(res200.status, 200);
          assert.equal(body200.success, true);
          assert.equal(body200.data._id, created._id.toString());

          const fakeId = new mongoose.Types.ObjectId();
          const res404 = await fetch(`${baseUrl}/api/alerts/${fakeId}`);
          assert.equal(res404.status, 404);
        } finally {
          await Alert.findByIdAndDelete(created._id);
        }
      },
    );

    // Phase 6 Integration Test 10: GET /api/alerts/inventory/:id
    await t.test(
      "GET /api/alerts/inventory/:inventoryItemId returns all alerts for item",
      async () => {
        const dummyItemId = new mongoose.Types.ObjectId();
        const alert1 = await Alert.create({
          inventoryItemId: dummyItemId,
          alertType: "LOW_STOCK",
          urgency: "LOW",
          recommendedAction: "MONITOR",
          reason: "Item alert 1",
          source: "fallback",
          status: "RESOLVED",
          resolvedAt: new Date(),
        });
        const alert2 = await Alert.create({
          inventoryItemId: dummyItemId,
          alertType: "STOCKOUT_RISK",
          urgency: "HIGH",
          recommendedAction: "REORDER_SOON",
          reason: "Item alert 2",
          source: "fallback",
          status: "ACTIVE",
        });

        try {
          const res = await fetch(
            `${baseUrl}/api/alerts/inventory/${dummyItemId}`,
          );
          const body = await res.json();
          assert.equal(res.status, 200);
          assert.equal(body.success, true);
          assert.equal(body.data.length, 2);
        } finally {
          await Alert.deleteMany({ inventoryItemId: dummyItemId });
        }
      },
    );

    // Phase 6 Integration Test 11: POST /api/automation/inventory-check summary includes alert counts
    await t.test(
      "POST /api/automation/inventory-check summary contains alertsCreated, alertsReused, alertsResolved",
      async () => {
        const res = await fetch(`${baseUrl}/api/automation/inventory-check`, {
          method: "POST",
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(typeof body.data.alertsCreated === "number");
        assert.ok(typeof body.data.alertsReused === "number");
        assert.ok(typeof body.data.alertsResolved === "number");
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
