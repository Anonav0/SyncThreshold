/**
 * automationController.js
 *
 * Handles HTTP requests for automated monitoring status and manual trigger execution.
 */

const inventoryAutomationService = require("../services/inventoryAutomationService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * @desc    Get current automation monitoring status and scheduler configuration
 * @route   GET /api/automation/status
 * @access  Public
 */
const getAutomationStatus = asyncHandler(async (req, res) => {
  const status = inventoryAutomationService.getStatus();
  return sendSuccess(res, status, 200);
});

/**
 * @desc    Manually trigger an on-demand inventory monitoring run
 * @route   POST /api/automation/inventory-check
 * @access  Public
 */
const triggerInventoryCheck = asyncHandler(async (req, res) => {
  if (inventoryAutomationService.isRunning) {
    return sendError(res, "Inventory monitoring is already running", 409);
  }

  try {
    const summary = await inventoryAutomationService.runInventoryCheck({
      isScheduled: false,
    });
    return sendSuccess(res, summary, 200);
  } catch (err) {
    if (err.isConflict || err.statusCode === 409) {
      return sendError(res, err.message, 409);
    }
    throw err;
  }
});

module.exports = {
  getAutomationStatus,
  triggerInventoryCheck,
};
