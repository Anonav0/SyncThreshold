const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");

// Set test environment
process.env.NODE_ENV = "test";
process.env.PORT = "5001";

const { app } = require("../../server");
const InventoryItem = require("../models/InventoryItem");
const errorHandler = require("../utils/errorHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

test("Backend Foundation Test Suite", async (t) => {
  let server;
  let baseUrl;

  // Start HTTP server for testing
  await t.test("Setup test HTTP server", async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl);
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
  await t.test("InventoryItem schema validates required fields", async () => {
    const invalidItem = new InventoryItem({});
    const validationError = invalidItem.validateSync();

    assert.ok(validationError);
    assert.ok(validationError.errors.name, "name is required");
    assert.ok(validationError.errors.sku, "sku is required");
    assert.ok(validationError.errors.category, "category is required");
    assert.ok(validationError.errors.currentStock, "currentStock is required");
    assert.ok(
      validationError.errors.reorderThreshold,
      "reorderThreshold is required",
    );
    assert.ok(validationError.errors.unitPrice, "unitPrice is required");
    assert.ok(validationError.errors.supplier, "supplier is required");
  });

  // Test 4: InventoryItem Schema Non-negative Validation
  await t.test("InventoryItem schema rejects negative numbers", async () => {
    const negativeItem = new InventoryItem({
      name: "Test Item",
      sku: "TEST-001",
      category: "Raw Material",
      currentStock: -5,
      reorderThreshold: -10,
      unitPrice: -20,
      averageDailySales: -1,
      supplier: "Test Supplier",
    });
    const validationError = negativeItem.validateSync();

    assert.ok(validationError);
    assert.ok(
      validationError.errors.currentStock,
      "currentStock cannot be negative",
    );
    assert.ok(
      validationError.errors.reorderThreshold,
      "reorderThreshold cannot be negative",
    );
    assert.ok(validationError.errors.unitPrice, "unitPrice cannot be negative");
    assert.ok(
      validationError.errors.averageDailySales,
      "averageDailySales cannot be negative",
    );
  });

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

      // Simulate CastError
      const castError = {
        name: "CastError",
        kind: "ObjectId",
        value: "invalid-id",
      };
      errorHandler(castError, {}, mockRes, () => {});
      assert.equal(mockStatus, 400);
      assert.equal(mockJson.success, false);
      assert.match(mockJson.message, /invalid-id/);

      // Simulate 11000 duplicate key error
      const duplicateError = {
        code: 11000,
        keyValue: { sku: "DUPLICATE-SKU" },
      };
      errorHandler(duplicateError, {}, mockRes, () => {});
      assert.equal(mockStatus, 400);
      assert.equal(mockJson.success, false);
      assert.match(mockJson.message, /DUPLICATE-SKU/);
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

  // Teardown
  await t.test("Teardown test server", async () => {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(true);
  });
});
