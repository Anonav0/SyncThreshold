import api from "./api";

/**
 * Service for notification status and manual test delivery (Phase 7)
 */
export const notificationService = {
  /**
   * Fetch current notification provider status and configuration state
   */
  async getStatus() {
    const response = await api.get("/notifications/status");
    return response.data.data;
  },

  /**
   * Send a test notification email
   */
  async sendTestNotification() {
    const response = await api.post("/notifications/test");
    return response.data.data;
  },

  /**
   * Send an email notification for a specific inventory alert
   */
  async sendAlertNotification(alertId) {
    const response = await api.post(`/notifications/alerts/${alertId}`);
    return response.data.data;
  },

  /**
   * Dispatch email notifications for all pending active alerts
   */
  async dispatchPendingAlerts() {
    const response = await api.post("/notifications/dispatch-pending");
    return response.data.data;
  },
};

export default notificationService;
