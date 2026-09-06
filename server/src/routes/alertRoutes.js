/**
 * alertRoutes.js
 *
 * Express routes for inventory alert queries and history.
 */

const express = require("express");
const router = express.Router();
const {
  getAlerts,
  getActiveAlerts,
  getAlertById,
  getAlertsByInventoryItem,
} = require("../controllers/alertController");

// Specific routes first
router.get("/", getAlerts);
router.get("/active", getActiveAlerts);
router.get("/inventory/:inventoryItemId", getAlertsByInventoryItem);

// Parameterized ID route
router.get("/:id", getAlertById);

module.exports = router;
