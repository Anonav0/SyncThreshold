const salesService = require("../services/salesService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * @desc    Record a new sale and update inventory
 * @route   POST /api/sales
 * @access  Public
 */
const recordSale = asyncHandler(async (req, res) => {
  const { inventoryItemId, quantitySold } = req.body;

  if (!inventoryItemId || quantitySold === undefined || quantitySold === null) {
    return sendError(res, "inventoryItemId and quantitySold are required", 400);
  }

  const result = await salesService.recordSale({
    inventoryItemId,
    quantitySold,
  });

  return sendSuccess(res, result, 201);
});

/**
 * @desc    Get all sales records
 * @route   GET /api/sales
 * @access  Public
 */
const getSales = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await salesService.getAllSales({ page, limit });
  return sendSuccess(res, result.sales, 200);
});

/**
 * @desc    Get single sale by ID
 * @route   GET /api/sales/:id
 * @access  Public
 */
const getSaleById = asyncHandler(async (req, res) => {
  const sale = await salesService.getSaleById(req.params.id);

  if (!sale) {
    return sendError(res, "Sale record not found", 404);
  }

  return sendSuccess(res, sale, 200);
});

/**
 * @desc    Get sales for a specific inventory item
 * @route   GET /api/sales/inventory/:inventoryItemId
 * @access  Public
 */
const getSalesByInventoryItem = asyncHandler(async (req, res) => {
  const sales = await salesService.getSalesByInventoryItemId(
    req.params.inventoryItemId,
  );
  return sendSuccess(res, sales, 200);
});

module.exports = {
  recordSale,
  getSales,
  getSaleById,
  getSalesByInventoryItem,
};
