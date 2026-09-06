/**
 * notificationController.js
 *
 * Exposes endpoints for notification status and manual test email delivery (Phase 7).
 */

const emailService = require("../services/emailService");
const Alert = require("../models/Alert");
const inventoryAnalysisService = require("../services/inventoryAnalysisService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * @desc    Get notification provider status and configuration state
 * @route   GET /api/notifications/status
 * @access  Public
 */
const getNotificationStatus = asyncHandler(async (req, res) => {
  const status = emailService.getStatus();
  return sendSuccess(res, status, 200);
});

/**
 * @desc    Send a test notification email to the configured recipient
 * @route   POST /api/notifications/test
 * @access  Public
 */
const sendTestNotification = asyncHandler(async (req, res) => {
  const status = emailService.getStatus();

  if (!status.emailEnabled) {
    return sendError(
      res,
      "Email notifications are currently disabled (EMAIL_ENABLED=false)",
      400,
    );
  }

  if (!status.emailConfigured) {
    return sendError(
      res,
      "SMTP configuration is incomplete. Please configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and ALERT_EMAIL_TO in your environment.",
      400,
    );
  }

  const result = await emailService.sendEmail({
    to: process.env.ALERT_EMAIL_TO,
    subject: "[SyncThreshold] Test Notification",
    text: "This is a test notification confirming that SyncThreshold email alerts are configured properly.",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
        <h2 style="color: #4f46e5; margin-top: 0;">SyncThreshold Notification Test</h2>
        <p style="color: #334155; font-size: 14px;">This email confirms that your SMTP notification settings are properly configured and operational.</p>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Recipient: ${process.env.ALERT_EMAIL_TO}</p>
      </div>
    `,
  });

  if (!result.success) {
    return sendError(
      res,
      `Failed to send test email: ${result.error || "SMTP delivery error"}`,
      500,
    );
  }

  return sendSuccess(
    res,
    {
      message: "Test email sent successfully",
      messageId: result.messageId,
    },
    200,
  );
});

/**
 * @desc    Send an email notification for a specific inventory alert
 * @route   POST /api/notifications/alerts/:id
 * @access  Public
 */
const sendAlertNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const alert = await Alert.findById(id).populate("inventoryItemId");
  if (!alert) {
    return sendError(res, "Inventory alert not found", 404);
  }

  const item = alert.inventoryItemId;
  let analysis = null;
  if (item?._id) {
    try {
      analysis = await inventoryAnalysisService.analyzeItem(item._id);
    } catch (e) {
      console.warn(
        `[Notification] Could not calculate analysis for ${item._id}: ${e.message}`,
      );
    }
  }

  const result = await emailService.sendInventoryAlertEmail(
    alert,
    item || {},
    analysis || item || {},
  );

  if (!result.success) {
    return sendError(
      res,
      `Failed to send alert email: ${result.error || "SMTP delivery error"}`,
      result.disabled ? 400 : 500,
    );
  }

  alert.emailSent = true;
  alert.emailSentAt = new Date();
  await alert.save();

  return sendSuccess(
    res,
    {
      message: `Alert email dispatched successfully to ${process.env.ALERT_EMAIL_TO}`,
      messageId: result.messageId,
      alert,
    },
    200,
  );
});

/**
 * @desc    Dispatch email notifications for all active alerts that haven't been emailed
 * @route   POST /api/notifications/dispatch-pending
 * @access  Public
 */
const dispatchPendingAlerts = asyncHandler(async (req, res) => {
  const pendingAlerts = await Alert.find({
    status: "ACTIVE",
    emailSent: { $ne: true },
  }).populate("inventoryItemId");

  let dispatchedCount = 0;
  let failureCount = 0;

  for (const alert of pendingAlerts) {
    const item = alert.inventoryItemId;
    let analysis = null;
    if (item?._id) {
      try {
        analysis = await inventoryAnalysisService.analyzeItem(item._id);
      } catch (e) {
        // fallback
      }
    }

    const result = await emailService.sendInventoryAlertEmail(
      alert,
      item || {},
      analysis || item || {},
    );

    if (result.success) {
      dispatchedCount++;
      alert.emailSent = true;
      alert.emailSentAt = new Date();
      await alert.save();
    } else {
      failureCount++;
    }
  }

  return sendSuccess(
    res,
    {
      message: `Dispatched ${dispatchedCount} alert notifications (${failureCount} failed).`,
      dispatchedCount,
      failureCount,
      totalPending: pendingAlerts.length,
    },
    200,
  );
});

module.exports = {
  getNotificationStatus,
  sendTestNotification,
  sendAlertNotification,
  dispatchPendingAlerts,
};
