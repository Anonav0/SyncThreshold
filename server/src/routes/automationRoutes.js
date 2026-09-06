/**
 * automationRoutes.js
 *
 * Express routes for automated inventory monitoring.
 */

const express = require("express");
const router = express.Router();
const {
  getAutomationStatus,
  triggerInventoryCheck,
} = require("../controllers/automationController");

router.get("/status", getAutomationStatus);
router.post("/inventory-check", triggerInventoryCheck);

module.exports = router;
