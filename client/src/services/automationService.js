import api from "./api";

/**
 * Service for automated inventory monitoring status and triggers
 */
export const automationService = {
  /**
   * Fetch current automation status and scheduler configuration
   */
  async getStatus() {
    const response = await api.get("/automation/status");
    return response.data.data;
  },

  /**
   * Manually trigger an on-demand inventory check
   */
  async triggerCheck() {
    const response = await api.post("/automation/inventory-check");
    return response.data.data;
  },
};

export default automationService;
