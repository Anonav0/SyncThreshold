const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const InventoryItem = require("../models/InventoryItem");

class SalesService {
  /**
   * Record a new sale with atomic stock decrement and transaction safety
   * @param {Object} params - { inventoryItemId, quantitySold }
   * @returns {Object} - { sale, inventory }
   */
  async recordSale({ inventoryItemId, quantitySold }) {
    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(inventoryItemId)) {
      const err = new Error(
        `Invalid inventory item identifier format: '${inventoryItemId}'`,
      );
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate quantitySold
    const qty = Number(quantitySold);
    if (!Number.isInteger(qty) || qty <= 0) {
      const err = new Error("Quantity sold must be an integer greater than 0");
      err.statusCode = 400;
      throw err;
    }

    // 3. Find the item to verify existence and get unitPrice
    const item = await InventoryItem.findById(inventoryItemId);
    if (!item) {
      const err = new Error("Inventory item not found");
      err.statusCode = 404;
      throw err;
    }

    // 4. Verify sufficient stock
    if (item.currentStock < qty) {
      const err = new Error(
        `Insufficient stock: requested ${qty}, available ${item.currentStock}`,
      );
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = item.unitPrice;
    const totalAmount = qty * unitPrice;

    // 5. Attempt transaction / atomic execution
    let session = null;
    let inTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      inTransaction = true;
    } catch {
      // In standalone or environments where replica-set transactions are unavailable
      session = null;
      inTransaction = false;
    }

    try {
      // Atomically decrement currentStock, asserting stock is still >= qty
      const updatedInventory = await InventoryItem.findOneAndUpdate(
        { _id: inventoryItemId, currentStock: { $gte: qty } },
        { $inc: { currentStock: -qty } },
        {
          new: true,
          runValidators: true,
          session: session || undefined,
        },
      );

      if (!updatedInventory) {
        const err = new Error(
          "Insufficient stock or item updated concurrently",
        );
        err.statusCode = 400;
        throw err;
      }

      // Create Sale document
      const sale = new Sale({
        inventoryItemId,
        quantitySold: qty,
        unitPrice,
        totalAmount,
        soldAt: new Date(),
      });

      await sale.save({ session: session || undefined });

      if (inTransaction && session) {
        await session.commitTransaction();
      }

      // Populate item details on sale object before returning
      sale.inventoryItemId = {
        _id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        supplier: item.supplier,
      };

      return {
        sale,
        inventory: updatedInventory,
      };
    } catch (error) {
      if (inTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Get all sales with optional pagination
   */
  async getAllSales({ page = 1, limit = 50 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      Sale.find()
        .populate("inventoryItemId", "name sku category supplier unitPrice")
        .sort({ soldAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Sale.countDocuments(),
    ]);

    return {
      sales,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get a single sale by ID
   */
  async getSaleById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error(`Invalid sale identifier format: '${id}'`);
      err.statusCode = 400;
      throw err;
    }

    return await Sale.findById(id).populate(
      "inventoryItemId",
      "name sku category supplier unitPrice",
    );
  }

  /**
   * Get all sales for a specific inventory item (sorted by soldAt DESC)
   */
  async getSalesByInventoryItemId(inventoryItemId) {
    if (!mongoose.Types.ObjectId.isValid(inventoryItemId)) {
      const err = new Error(
        `Invalid inventory item identifier format: '${inventoryItemId}'`,
      );
      err.statusCode = 400;
      throw err;
    }

    return await Sale.find({ inventoryItemId })
      .populate("inventoryItemId", "name sku category supplier unitPrice")
      .sort({ soldAt: -1 });
  }
}

module.exports = new SalesService();
