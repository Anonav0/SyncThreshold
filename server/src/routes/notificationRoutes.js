/**
 * notificationRoutes.js
 *
 * Express routes for notification status and manual test dispatch (Phase 7).
 */

const express = require("express");
const router = express.Router();
const {
  getNotificationStatus,
  sendTestNotification,
  sendAlertNotification,
  dispatchPendingAlerts,
} = require("../controllers/notificationController");

router.get("/status", getNotificationStatus);
router.post("/test", sendTestNotification);
router.post("/alerts/:id", sendAlertNotification);
router.post("/dispatch-pending", dispatchPendingAlerts);

module.exports = router;
