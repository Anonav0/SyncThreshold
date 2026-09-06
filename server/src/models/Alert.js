/**
 * Alert.js
 *
 * Mongoose model for persistent inventory alerts (Phase 6).
 *
 * Key Constraints:
 * - Alert types: LOW_STOCK, STOCKOUT_RISK
 * - Urgency: LOW, MEDIUM, HIGH, CRITICAL
 * - RecommendedAction: MONITOR, PLAN_REORDER, REORDER_SOON, REORDER_NOW
 * - Source: gemini, fallback
 * - Status: ACTIVE, RESOLVED
 * - Database-level duplicate prevention: A partial unique compound index on
 *   (inventoryItemId, alertType) where status = 'ACTIVE'.
 *   This ensures only one active alert per product/type can exist at the DB level,
 *   while allowing unlimited historical RESOLVED alerts.
 */

const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: [true, "Inventory item ID is required"],
    },
    alertType: {
      type: String,
      required: [true, "Alert type is required"],
      enum: {
        values: ["LOW_STOCK", "STOCKOUT_RISK"],
        message: "{VALUE} is not a supported alert type",
      },
    },
    urgency: {
      type: String,
      required: [true, "Urgency level is required"],
      enum: {
        values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        message: "{VALUE} is not a valid urgency level",
      },
    },
    recommendedAction: {
      type: String,
      required: [true, "Recommended action is required"],
      enum: {
        values: ["MONITOR", "PLAN_REORDER", "REORDER_SOON", "REORDER_NOW"],
        message: "{VALUE} is not a valid recommended action",
      },
    },
    reason: {
      type: String,
      required: [true, "Alert reason is required"],
      trim: true,
    },
    source: {
      type: String,
      required: [true, "Alert source is required"],
      enum: {
        values: ["gemini", "fallback"],
        message: "{VALUE} is not a supported alert source",
      },
    },
    status: {
      type: String,
      required: [true, "Alert status is required"],
      enum: {
        values: ["ACTIVE", "RESOLVED"],
        message: "{VALUE} is not a valid alert status",
      },
      default: "ACTIVE",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Database-level duplicate-alert prevention:
// Only one ACTIVE alert per inventoryItemId and alertType can exist simultaneously.
alertSchema.index(
  { inventoryItemId: 1, alertType: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
  },
);

// Secondary performance indexes for queries & filtering
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ inventoryItemId: 1, createdAt: -1 });
alertSchema.index({ alertType: 1, createdAt: -1 });

const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;
