import api from "./api";

/**
 * Service for querying inventory alerts and resolution history
 */
export const alertService = {
  /**
   * Fetch alerts with optional filtering by status (ACTIVE, RESOLVED), alertType, or urgency
   */
  async getAlerts(params = {}) {
    const response = await api.get("/alerts", { params });
    return response.data.data;
  },

  /**
   * Fetch only active alerts
   */
  async getActiveAlerts(params = {}) {
    const response = await api.get("/alerts/active", { params });
    return response.data.data;
  },

  /**
   * Fetch single alert by ID
   */
  async getAlertById(id) {
    const response = await api.get(`/alerts/${id}`);
    return response.data.data;
  },

  /**
   * Fetch all alerts for a specific inventory item
   */
  async getAlertsByInventoryItem(inventoryItemId) {
    const response = await api.get(`/alerts/inventory/${inventoryItemId}`);
    return response.data.data;
  },
};

export default alertService;
