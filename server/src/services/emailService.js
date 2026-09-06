/**
 * emailService.js
 *
 * Isolated service for email notifications via SMTP using Nodemailer (Phase 7).
 *
 * Architectural Boundaries:
 * - Only this service communicates with Nodemailer.
 * - Credential values remain strictly server-side.
 * - Handles SMTP errors gracefully without throwing unhandled exceptions.
 * - Allows mock transporter injection for deterministic testing.
 */

const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this._transporter = null;
  }

  /**
   * Check if required SMTP environment configuration is present
   * @returns {boolean}
   */
  isConfigured() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const recipient = process.env.ALERT_EMAIL_TO;
    return Boolean(host && user && pass && recipient);
  }

  /**
   * Returns safe status metadata without exposing credentials
   * @returns {{ emailEnabled: boolean, emailConfigured: boolean }}
   */
  getStatus() {
    const emailEnabled = process.env.EMAIL_ENABLED !== "false";
    const emailConfigured = this.isConfigured();
    return {
      emailEnabled,
      emailConfigured,
    };
  }

  /**
   * Retrieves active Nodemailer transporter or instantiates a new SMTP transport
   */
  getTransporter() {
    if (this._transporter) {
      return this._transporter;
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = port === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send a generic email message
   *
   * @param {Object} options
   * @param {string} [options.to] - Recipient email (defaults to ALERT_EMAIL_TO)
   * @param {string} options.subject - Email subject line
   * @param {string} options.text - Plain text content
   * @param {string} [options.html] - HTML formatted content
   * @returns {Promise<{ success: boolean, messageId?: string, disabled?: boolean, error?: string }>}
   */
  async sendEmail({ to, subject, text, html }) {
    const isEnabled = process.env.EMAIL_ENABLED !== "false";
    if (!isEnabled) {
      console.log("[Email] EMAIL_ENABLED is false. Skipping email delivery.");
      return {
        success: false,
        disabled: true,
        error: "Email notifications are disabled via configuration",
      };
    }

    if (!this.isConfigured()) {
      console.warn(
        "[Email] Incomplete SMTP configuration. Please configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and ALERT_EMAIL_TO.",
      );
      return {
        success: false,
        error: "SMTP configuration is incomplete",
      };
    }

    const recipient = to || process.env.ALERT_EMAIL_TO;
    const sender =
      process.env.ALERT_EMAIL_FROM ||
      process.env.SMTP_USER ||
      "alerts@syncthreshold.local";

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: sender,
        to: recipient,
        subject,
        text,
        html: html || text,
      });

      console.log(
        `[Email] Notification sent successfully to ${recipient} (Message ID: ${info?.messageId || "mock-id"})`,
      );
      return {
        success: true,
        messageId: info?.messageId || "mock-id",
      };
    } catch (err) {
      console.error(
        `[Email] Failed to send email to ${recipient}: ${err.message}`,
      );
      return {
        success: false,
        error: err.message || "Failed to send email via SMTP",
      };
    }
  }

  /**
   * Formats and dispatches an inventory risk alert email
   *
   * @param {Object} alert - Alert model record or object
   * @param {Object} [inventoryItem={}] - Inventory item details
   * @param {Object} [deterministicAnalysis={}] - Deterministic velocity and stockout details
   * @returns {Promise<{ success: boolean, messageId?: string, disabled?: boolean, error?: string }>}
   */
  async sendInventoryAlertEmail(
    alert,
    inventoryItem = {},
    deterministicAnalysis = {},
  ) {
    const name =
      inventoryItem?.name || alert?.inventoryItemId?.name || "Inventory Item";
    const sku =
      inventoryItem?.sku || alert?.inventoryItemId?.sku || "UNKNOWN_SKU";
    const alertType = alert?.alertType || "RISK_ALERT";
    const urgency = alert?.urgency || "MEDIUM";
    const currentStock =
      inventoryItem?.currentStock ??
      deterministicAnalysis?.currentStock ??
      "N/A";
    const reorderThreshold =
      inventoryItem?.reorderThreshold ??
      deterministicAnalysis?.reorderThreshold ??
      "N/A";
    const salesVelocity =
      deterministicAnalysis?.salesVelocity !== undefined
        ? `${deterministicAnalysis.salesVelocity} units/day`
        : "N/A";
    const daysUntilStockout =
      deterministicAnalysis?.daysUntilStockout !== null &&
      deterministicAnalysis?.daysUntilStockout !== undefined
        ? `${deterministicAnalysis.daysUntilStockout} days`
        : "N/A";
    const recommendedAction = alert?.recommendedAction || "MONITOR";
    const reason = alert?.reason || "Inventory risk detected.";
    const source = alert?.source || "system";
    const createdAt = alert?.createdAt
      ? new Date(alert.createdAt).toLocaleString()
      : new Date().toLocaleString();

    const subject = `[Inventory Alert] ${name} — ${urgency} Risk`;

    const plainText = `Inventory Alert

Product: ${name}
SKU: ${sku}

Alert: ${alertType}
Urgency: ${urgency}

Current Stock: ${currentStock}
Reorder Threshold: ${reorderThreshold}
Sales Velocity: ${salesVelocity}
Days Until Stockout: ${daysUntilStockout}

Recommended Action:
${recommendedAction}

Reason:
${reason}

Analysis Source: ${source}
Created At: ${createdAt}
`;

    const urgencyColor =
      urgency === "CRITICAL"
        ? "#e11d48"
        : urgency === "HIGH"
          ? "#ea580c"
          : urgency === "MEDIUM"
            ? "#d97706"
            : "#2563eb";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="background: linear-gradient(to right, #4338ca, #6366f1); padding: 24px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold;">SyncThreshold Inventory Alert</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Automated Risk Notification & Reorder Advisory</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background-color: ${urgencyColor}; color: #ffffff;">
            ${urgency} URGENCY
          </span>
          <span style="display: inline-block; margin-left: 8px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: #f1f5f9; color: #475569;">
            ${alertType}
          </span>
        </div>

        <h2 style="margin: 0 0 4px; font-size: 18px; color: #0f172a;">${name}</h2>
        <p style="margin: 0 0 20px; font-size: 13px; color: #64748b; font-family: monospace;">SKU: ${sku}</p>

        <table width="100%" style="border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Current Stock</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${currentStock} units</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Reorder Threshold</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${reorderThreshold} units</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Sales Velocity</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${salesVelocity}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Days Until Stockout</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${daysUntilStockout}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Recommended Action</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #4f46e5;">${recommendedAction}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 14px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;"><strong>Reason:</strong> ${reason}</p>
        </div>

        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          Analysis Source: <strong>${source}</strong> &bull; Generated: ${createdAt}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b;">
        SyncThreshold Autonomous Inventory Monitoring System &bull; Phase 7
      </td>
    </tr>
  </table>
</body>
</html>
`;

    return this.sendEmail({
      to: process.env.ALERT_EMAIL_TO,
      subject,
      text: plainText,
      html,
    });
  }
}

module.exports = new EmailService();
