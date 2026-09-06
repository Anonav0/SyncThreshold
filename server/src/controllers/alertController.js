/**
 * alertController.js
 *
 * Exposes REST endpoints for querying inventory alerts and resolution history.
 */

const alertService = require("../services/alertService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * @desc    Get alerts with optional filtering (status, alertType, urgency)
 * @route   GET /api/alerts
 * @access  Public
 */
const getAlerts = asyncHandler(async (req, res) => {
  const { status, alertType, urgency } = req.query;
  const filter = {};

  if (status) {
    const upperStatus = status.toUpperCase();
    if (!["ACTIVE", "RESOLVED"].includes(upperStatus)) {
      return sendError(
        res,
        'Invalid status filter. Allowed values: "ACTIVE", "RESOLVED"',
        400,
      );
    }
    filter.status = upperStatus;
  }

  if (alertType) {
    const upperType = alertType.toUpperCase();
    if (!["LOW_STOCK", "STOCKOUT_RISK"].includes(upperType)) {
      return sendError(
        res,
        'Invalid alertType filter. Allowed values: "LOW_STOCK", "STOCKOUT_RISK"',
        400,
      );
    }
    filter.alertType = upperType;
  }

  if (urgency) {
    const upperUrgency = urgency.toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(upperUrgency)) {
      return sendError(
        res,
        'Invalid urgency filter. Allowed values: "LOW", "MEDIUM", "HIGH", "CRITICAL"',
        400,
      );
    }
    filter.urgency = upperUrgency;
  }

  const alerts = await alertService.getAlertHistory(filter);
  return sendSuccess(res, alerts, 200);
});

/**
 * @desc    Get all currently active alerts
 * @route   GET /api/alerts/active
 * @access  Public
 */
const getActiveAlerts = asyncHandler(async (req, res) => {
  const { alertType, urgency } = req.query;
  const filter = {};

  if (alertType) {
    const upperType = alertType.toUpperCase();
    if (["LOW_STOCK", "STOCKOUT_RISK"].includes(upperType)) {
      filter.alertType = upperType;
    }
  }

  if (urgency) {
    const upperUrgency = urgency.toUpperCase();
    if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(upperUrgency)) {
      filter.urgency = upperUrgency;
    }
  }

  const alerts = await alertService.getActiveAlerts(filter);
  return sendSuccess(res, alerts, 200);
});

/**
 * @desc    Get single alert by ID
 * @route   GET /api/alerts/:id
 * @access  Public
 */
const getAlertById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const alert = await alertService.getAlertById(id);

  if (!alert) {
    return sendError(res, "Alert not found", 404);
  }

  return sendSuccess(res, alert, 200);
});

/**
 * @desc    Get all alerts for a specific inventory item
 * @route   GET /api/alerts/inventory/:inventoryItemId
 * @access  Public
 */
const getAlertsByInventoryItem = asyncHandler(async (req, res) => {
  const { inventoryItemId } = req.params;
  const alerts = await alertService.getAlertsByInventoryItem(inventoryItemId);
  return sendSuccess(res, alerts, 200);
});

module.exports = {
  getAlerts,
  getActiveAlerts,
  getAlertById,
  getAlertsByInventoryItem,
};
