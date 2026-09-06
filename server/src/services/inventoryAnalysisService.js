const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const Sale = require("../models/Sale");

class InventoryAnalysisService {
  /**
   * Get configured default analysis window in days
   */
  getDefaultAnalysisDays() {
    const envVal = parseInt(process.env.SALES_ANALYSIS_DAYS, 10);
    return !isNaN(envVal) && envVal > 0 ? envVal : 7;
  }

  /**
   * Get configured default warning days for stockout risk
   */
  getDefaultWarningDays() {
    const envVal = parseInt(process.env.STOCKOUT_WARNING_DAYS, 10);
    return !isNaN(envVal) && envVal > 0 ? envVal : 7;
  }

  /**
   * Calculate sales velocity: totalUnitsSold / days
   * @param {number} totalUnitsSold - Total units sold in the period
   * @param {number} days - Number of days in the period
   * @returns {number} - Units per day with 2 decimal precision
   */
  calculateSalesVelocity(totalUnitsSold, days) {
    if (!days || days <= 0 || !totalUnitsSold || totalUnitsSold <= 0) {
      return 0;
    }
    const velocity = totalUnitsSold / days;
    return Number(velocity.toFixed(2));
  }

  /**
   * Calculate estimated days until stockout: currentStock / salesVelocity
   * Returns null if salesVelocity <= 0 to avoid division by zero.
   * @param {number} currentStock - Current stock level
   * @param {number} salesVelocity - Units sold per day
   * @returns {number|null} - Days until stockout with 2 decimal precision or null
   */
  calculateDaysUntilStockout(currentStock, salesVelocity) {
    if (!salesVelocity || salesVelocity <= 0) {
      return null;
    }
    const days = currentStock / salesVelocity;
    return Number(days.toFixed(2));
  }

  /**
   * Deterministically classify product inventory risk status
   * Rule 1: currentStock < reorderThreshold -> LOW_STOCK
   * Rule 2: salesVelocity > 0 AND daysUntilStockout <= warningDays -> STOCKOUT_RISK
   * Rule 3: Otherwise -> HEALTHY
   * @param {number} currentStock
   * @param {number} reorderThreshold
   * @param {number} salesVelocity
   * @param {number|null} daysUntilStockout
   * @param {number} warningDays
   * @returns {'LOW_STOCK'|'STOCKOUT_RISK'|'HEALTHY'}
   */
  classifyStatus(
    currentStock,
    reorderThreshold,
    salesVelocity,
    daysUntilStockout,
    warningDays,
  ) {
    if (currentStock < reorderThreshold) {
      return "LOW_STOCK";
    }

    if (
      salesVelocity > 0 &&
      daysUntilStockout !== null &&
      daysUntilStockout <= warningDays
    ) {
      return "STOCKOUT_RISK";
    }

    return "HEALTHY";
  }

  /**
   * Analyze a single inventory item
   * @param {string|ObjectId} inventoryItemId
   * @param {Object} options - { days, warningDays }
   */
  async analyzeItem(inventoryItemId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(inventoryItemId)) {
      const err = new Error(
        `Invalid inventory item identifier format: '${inventoryItemId}'`,
      );
      err.statusCode = 400;
      throw err;
    }

    const item = await InventoryItem.findById(inventoryItemId);
    if (!item) {
      const err = new Error("Inventory item not found");
      err.statusCode = 404;
      throw err;
    }

    const days = options.days || this.getDefaultAnalysisDays();
    const warningDays = options.warningDays || this.getDefaultWarningDays();

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate sales within the configured window for this item
    const salesAggregation = await Sale.aggregate([
      {
        $match: {
          inventoryItemId: item._id,
          soldAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalUnitsSold: { $sum: "$quantitySold" },
        },
      },
    ]);

    const totalUnitsSold =
      salesAggregation.length > 0 ? salesAggregation[0].totalUnitsSold : 0;
    const salesVelocity = this.calculateSalesVelocity(totalUnitsSold, days);
    const daysUntilStockout = this.calculateDaysUntilStockout(
      item.currentStock,
      salesVelocity,
    );
    const status = this.classifyStatus(
      item.currentStock,
      item.reorderThreshold,
      salesVelocity,
      daysUntilStockout,
      warningDays,
    );

    return {
      inventoryItemId: item._id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      currentStock: item.currentStock,
      reorderThreshold: item.reorderThreshold,
      unitPrice: item.unitPrice,
      totalUnitsSold,
      analysisDays: days,
      salesVelocity,
      daysUntilStockout,
      status,
    };
  }

  /**
   * Analyze all inventory items efficiently using a single aggregation query
   * @param {Object} options - { days, warningDays }
   */
  async analyzeAllInventory(options = {}) {
    const days = options.days || this.getDefaultAnalysisDays();
    const warningDays = options.warningDays || this.getDefaultWarningDays();

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch all items and group sales in parallel
    const [items, salesByItem] = await Promise.all([
      InventoryItem.find().sort({ createdAt: -1 }),
      Sale.aggregate([
        {
          $match: {
            soldAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$inventoryItemId",
            totalUnitsSold: { $sum: "$quantitySold" },
          },
        },
      ]),
    ]);

    // Create lookup map for totalUnitsSold: Map<inventoryItemIdString, number>
    const salesMap = new Map();
    for (const entry of salesByItem) {
      if (entry._id) {
        salesMap.set(entry._id.toString(), entry.totalUnitsSold);
      }
    }

    return items.map((item) => {
      const totalUnitsSold = salesMap.get(item._id.toString()) || 0;
      const salesVelocity = this.calculateSalesVelocity(totalUnitsSold, days);
      const daysUntilStockout = this.calculateDaysUntilStockout(
        item.currentStock,
        salesVelocity,
      );
      const status = this.classifyStatus(
        item.currentStock,
        item.reorderThreshold,
        salesVelocity,
        daysUntilStockout,
        warningDays,
      );

      return {
        inventoryItemId: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        currentStock: item.currentStock,
        reorderThreshold: item.reorderThreshold,
        unitPrice: item.unitPrice,
        totalUnitsSold,
        analysisDays: days,
        salesVelocity,
        daysUntilStockout,
        status,
      };
    });
  }
}

module.exports = new InventoryAnalysisService();
