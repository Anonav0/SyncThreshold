/**
 * alertService.js
 *
 * Encapsulates all inventory alert lifecycle management:
 * - Duplicate prevention: Reuses existing ACTIVE alerts; enforces uniqueness via partial index & race recovery.
 * - Resolution: Automatically resolves obsolete active alerts when underlying risk clears.
 * - Retrieval: Active alerts and historical records with population of InventoryItem details.
 *
 * Phase 6 Architecture:
 * Reusable by automation cron, manual checks, and future notification dispatchers.
 */

const Alert = require("../models/Alert");

class AlertService {
  /**
   * Creates an alert if no ACTIVE alert already exists for the given item and alertType.
   * If an active alert already exists, returns the existing alert with created=false, reused=true.
   * Gracefully catches duplicate-key errors (E11000) from concurrent race conditions.
   *
   * @param {Object} alertData
   * @param {string|ObjectId} alertData.inventoryItemId - Target inventory item ID
   * @param {'LOW_STOCK'|'STOCKOUT_RISK'} alertData.alertType - Category of risk
   * @param {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} alertData.urgency - Severity level
   * @param {string} alertData.recommendedAction - Action advised
   * @param {string} alertData.reason - Human-readable explanation
   * @param {'gemini'|'fallback'} alertData.source - Evaluation engine
   * @returns {Promise<{ alert: Object, created: boolean, reused: boolean }>}
   */
  async createAlertIfNeeded({
    inventoryItemId,
    alertType,
    urgency,
    recommendedAction,
    reason,
    source,
  }) {
    if (!inventoryItemId || !alertType) {
      throw new Error(
        "inventoryItemId and alertType are required to evaluate alert creation",
      );
    }

    // 1. Application-level check: Check if ACTIVE alert already exists
    const existingActive = await Alert.findOne({
      inventoryItemId,
      alertType,
      status: "ACTIVE",
    });

    if (existingActive) {
      return {
        alert: existingActive,
        created: false,
        reused: true,
      };
    }

    // 2. Create new active alert with DB-level duplicate handling
    try {
      const newAlert = await Alert.create({
        inventoryItemId,
        alertType,
        urgency,
        recommendedAction,
        reason,
        source,
        status: "ACTIVE",
      });

      return {
        alert: newAlert,
        created: true,
        reused: false,
      };
    } catch (err) {
      // Gracefully recover if a concurrent process inserted the active alert in the meantime
      if (
        err.code === 11000 ||
        (err.message && err.message.includes("E11000"))
      ) {
        const raceAlert = await Alert.findOne({
          inventoryItemId,
          alertType,
          status: "ACTIVE",
        });
        if (raceAlert) {
          return {
            alert: raceAlert,
            created: false,
            reused: true,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Resolves active alerts for an inventory item if the underlying risk no longer exists.
   *
   * Resolution Rules (Phase 6 Specification):
   * - LOW_STOCK: Resolved when currentStock >= reorderThreshold
   * - STOCKOUT_RISK: Resolved when status !== 'STOCKOUT_RISK'
   *
   * @param {Object} itemRiskData
   * @param {string|ObjectId} itemRiskData.inventoryItemId
   * @param {number} itemRiskData.currentStock
   * @param {number} itemRiskData.reorderThreshold
   * @param {string} itemRiskData.status - Deterministic status from Phase 3
   * @returns {Promise<{ resolvedCount: number, resolvedAlerts: Array }>}
   */
  async resolveAlertsIfNeeded({
    inventoryItemId,
    currentStock,
    reorderThreshold,
    status,
  }) {
    const activeAlerts = await Alert.find({
      inventoryItemId,
      status: "ACTIVE",
    });

    if (!activeAlerts || activeAlerts.length === 0) {
      return { resolvedCount: 0, resolvedAlerts: [] };
    }

    const resolvedAlerts = [];
    const now = new Date();

    for (const alert of activeAlerts) {
      let shouldResolve = false;

      if (alert.alertType === "LOW_STOCK") {
        if (
          currentStock !== undefined &&
          reorderThreshold !== undefined &&
          currentStock >= reorderThreshold
        ) {
          shouldResolve = true;
        }
      } else if (alert.alertType === "STOCKOUT_RISK") {
        if (status && status !== "STOCKOUT_RISK") {
          shouldResolve = true;
        }
      }

      if (shouldResolve) {
        alert.status = "RESOLVED";
        alert.resolvedAt = now;
        await alert.save();
        resolvedAlerts.push(alert);
      }
    }

    return {
      resolvedCount: resolvedAlerts.length,
      resolvedAlerts,
    };
  }

  /**
   * Batch resolves obsolete active alerts across the entire catalog following an inventory audit.
   *
   * @param {Array<Object>} allAnalysis - Deterministic analysis results from inventoryAnalysisService
   * @returns {Promise<{ resolvedCount: number, resolvedAlerts: Array }>}
   */
  async resolveObsoleteAlerts(allAnalysis = []) {
    const activeAlerts = await Alert.find({ status: "ACTIVE" });
    if (!activeAlerts || activeAlerts.length === 0) {
      return { resolvedCount: 0, resolvedAlerts: [] };
    }

    // Index analysis by stringified ID for O(1) lookup
    const analysisMap = new Map();
    for (const item of allAnalysis) {
      const id = item.inventoryItemId ? item.inventoryItemId.toString() : null;
      if (id) {
        analysisMap.set(id, item);
      }
    }

    const resolvedAlerts = [];
    const now = new Date();

    for (const alert of activeAlerts) {
      const id = alert.inventoryItemId
        ? alert.inventoryItemId.toString()
        : null;
      const analysis = id ? analysisMap.get(id) : null;

      if (!analysis) {
        // If item not found in catalog analysis, skip or do not resolve
        continue;
      }

      let shouldResolve = false;

      if (alert.alertType === "LOW_STOCK") {
        if (
          analysis.currentStock !== undefined &&
          analysis.reorderThreshold !== undefined &&
          analysis.currentStock >= analysis.reorderThreshold
        ) {
          shouldResolve = true;
        }
      } else if (alert.alertType === "STOCKOUT_RISK") {
        if (analysis.status && analysis.status !== "STOCKOUT_RISK") {
          shouldResolve = true;
        }
      }

      if (shouldResolve) {
        alert.status = "RESOLVED";
        alert.resolvedAt = now;
        await alert.save();
        resolvedAlerts.push(alert);
      }
    }

    return {
      resolvedCount: resolvedAlerts.length,
      resolvedAlerts,
    };
  }

  /**
   * Retrieve currently ACTIVE alerts sorted newest first
   * @param {Object} [filter={}] - Additional query criteria (e.g. alertType, urgency)
   * @returns {Promise<Array>}
   */
  async getActiveAlerts(filter = {}) {
    return Alert.find({
      ...filter,
      status: "ACTIVE",
    })
      .populate(
        "inventoryItemId",
        "name sku category currentStock reorderThreshold unitPrice",
      )
      .sort({ createdAt: -1 });
  }

  /**
   * Retrieve historical alerts (ACTIVE + RESOLVED) matching criteria, sorted newest first
   * @param {Object} [filter={}] - Filter criteria (e.g. status, alertType, inventoryItemId)
   * @returns {Promise<Array>}
   */
  async getAlertHistory(filter = {}) {
    const query = {};

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.alertType) {
      query.alertType = filter.alertType;
    }
    if (filter.inventoryItemId) {
      query.inventoryItemId = filter.inventoryItemId;
    }
    if (filter.urgency) {
      query.urgency = filter.urgency;
    }

    return Alert.find(query)
      .populate(
        "inventoryItemId",
        "name sku category currentStock reorderThreshold unitPrice",
      )
      .sort({ createdAt: -1 });
  }

  /**
   * Retrieve single alert by ID
   * @param {string|ObjectId} id
   * @returns {Promise<Object|null>}
   */
  async getAlertById(id) {
    return Alert.findById(id).populate(
      "inventoryItemId",
      "name sku category currentStock reorderThreshold unitPrice",
    );
  }

  /**
   * Retrieve all alerts (active & resolved) for a specific inventory item
   * @param {string|ObjectId} inventoryItemId
   * @returns {Promise<Array>}
   */
  async getAlertsByInventoryItem(inventoryItemId) {
    return Alert.find({ inventoryItemId })
      .populate(
        "inventoryItemId",
        "name sku category currentStock reorderThreshold unitPrice",
      )
      .sort({ createdAt: -1 });
  }
}

module.exports = new AlertService();
