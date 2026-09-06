import api from "./api";

/**
 * Inventory Service for handling API requests
 */
export const inventoryService = {
  /**
   * Health check
   */
  async checkHealth() {
    const response = await api.get("/health");
    return response.data;
  },

  /**
   * Fetch all inventory items
   */
  async getAll() {
    const response = await api.get("/inventory");
    return response.data.data;
  },

  /**
   * Fetch single item by ID
   */
  async getById(id) {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  /**
   * Create new inventory item
   */
  async create(itemData) {
    const response = await api.post("/inventory", itemData);
    return response.data.data;
  },

  /**
   * Update an inventory item
   */
  async update(id, updateData) {
    const response = await api.put(`/inventory/${id}`, updateData);
    return response.data.data;
  },

  /**
   * Delete an inventory item
   */
  async delete(id) {
    const response = await api.delete(`/inventory/${id}`);
    return response.data.data;
  },

  /**
   * Get deterministic sales velocity & low-stock intelligence analysis
   * @param {number} [days] - Optional analysis window in days (default 7)
   */
  async getAnalysis(days) {
    const params = days ? { days } : {};
    const response = await api.get("/inventory/analysis", { params });
    return response.data.data;
  },

  /**
   * Get deterministic analysis for a single inventory item
   * @param {string} id - Inventory item ID
   * @param {number} [days] - Optional analysis window in days
   */
  async getItemAnalysis(id, days) {
    const params = days ? { days } : {};
    const response = await api.get(`/inventory/${id}/analysis`, { params });
    return response.data.data;
  },
};

export default inventoryService;
