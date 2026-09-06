const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: [true, "Inventory item ID is required"],
      index: true,
    },
    quantitySold: {
      type: Number,
      required: [true, "Quantity sold is required"],
      min: [1, "Quantity sold must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity sold must be an integer",
      },
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    soldAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Sale = mongoose.model("Sale", saleSchema);

module.exports = Sale;
