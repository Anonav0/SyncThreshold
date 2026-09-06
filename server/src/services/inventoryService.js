const InventoryItem = require("../models/InventoryItem");

/**
 * Service encapsulating database operations for Inventory Items
 */
class InventoryService {
  /**
   * Fetch all inventory items
   */
  async getAllItems() {
    return await InventoryItem.find().sort({ createdAt: -1 });
  }

  /**
   * Fetch a single inventory item by ID
   */
  async getItemById(id) {
    return await InventoryItem.findById(id);
  }

  /**
   * Create a new inventory item
   */
  async createItem(itemData) {
    const item = new InventoryItem(itemData);
    return await item.save();
  }

  /**
   * Update an existing inventory item by ID
   */
  async updateItem(id, updateData) {
    return await InventoryItem.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Delete an inventory item by ID
   */
  async deleteItem(id) {
    return await InventoryItem.findByIdAndDelete(id);
  }
}

module.exports = new InventoryService();
