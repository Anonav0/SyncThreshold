import api from "./api";

/**
 * Sales Service for communicating with backend sales APIs
 */
export const salesService = {
  /**
   * Record a new sale
   * @param {Object} saleData - { inventoryItemId, quantitySold }
   * @returns {Promise<Object>} - { sale, inventory }
   */
  async recordSale(saleData) {
    const response = await api.post("/sales", saleData);
    return response.data.data;
  },

  /**
   * Get all sales records
   * @param {Object} params - { page, limit }
   */
  async getAllSales(params = {}) {
    const response = await api.get("/sales", { params });
    return response.data.data;
  },

  /**
   * Get a single sale by ID
   * @param {string} id
   */
  async getSaleById(id) {
    const response = await api.get(`/sales/${id}`);
    return response.data.data;
  },

  /**
   * Get sales history for a specific inventory item
   * @param {string} inventoryItemId
   */
  async getSalesByInventoryItem(inventoryItemId) {
    const response = await api.get(`/sales/inventory/${inventoryItemId}`);
    return response.data.data;
  },
};

export default salesService;
