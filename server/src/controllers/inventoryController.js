const inventoryService = require("../services/inventoryService");
const inventoryAnalysisService = require("../services/inventoryAnalysisService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Helper to parse and validate optional ?days= query parameter
 */
const parseDaysParam = (queryDays) => {
  if (queryDays === undefined || queryDays === null || queryDays === "") {
    return undefined;
  }
  const parsed = Number(queryDays);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(
      'Query parameter "days" must be a positive integer greater than 0',
    );
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

/**
 * @desc    Get all inventory items
 * @route   GET /api/inventory
 * @access  Public
 */
const getInventory = asyncHandler(async (req, res) => {
  const items = await inventoryService.getAllItems();
  return sendSuccess(res, items, 200);
});

/**
 * @desc    Get inventory velocity & low-stock intelligence analysis for all items
 * @route   GET /api/inventory/analysis
 * @access  Public
 */
const getInventoryAnalysis = asyncHandler(async (req, res) => {
  const days = parseDaysParam(req.query.days);
  const analysis = await inventoryAnalysisService.analyzeAllInventory({ days });
  return sendSuccess(res, analysis, 200);
});

/**
 * @desc    Get single inventory item by ID
 * @route   GET /api/inventory/:id
 * @access  Public
 */
const getInventoryItemById = asyncHandler(async (req, res) => {
  const item = await inventoryService.getItemById(req.params.id);

  if (!item) {
    return sendError(res, "Inventory item not found", 404);
  }

  return sendSuccess(res, item, 200);
});

/**
 * @desc    Get velocity & low-stock intelligence analysis for a single item
 * @route   GET /api/inventory/:id/analysis
 * @access  Public
 */
const getSingleInventoryAnalysis = asyncHandler(async (req, res) => {
  const days = parseDaysParam(req.query.days);
  const analysis = await inventoryAnalysisService.analyzeItem(req.params.id, {
    days,
  });
  return sendSuccess(res, analysis, 200);
});

/**
 * @desc    Create new inventory item
 * @route   POST /api/inventory
 * @access  Public
 */
const createInventoryItem = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    category,
    currentStock,
    reorderThreshold,
    unitPrice,
    averageDailySales,
    supplier,
    lastRestockedAt,
  } = req.body;

  const newItem = await inventoryService.createItem({
    name,
    sku,
    category,
    currentStock,
    reorderThreshold,
    unitPrice,
    averageDailySales,
    supplier,
    lastRestockedAt,
  });

  return sendSuccess(res, newItem, 201);
});

/**
 * @desc    Update an inventory item
 * @route   PUT /api/inventory/:id
 * @access  Public
 */
const updateInventoryItem = asyncHandler(async (req, res) => {
  const existingItem = await inventoryService.getItemById(req.params.id);

  if (!existingItem) {
    return sendError(res, "Inventory item not found", 404);
  }

  const updatedItem = await inventoryService.updateItem(
    req.params.id,
    req.body,
  );
  return sendSuccess(res, updatedItem, 200);
});

/**
 * @desc    Delete an inventory item
 * @route   DELETE /api/inventory/:id
 * @access  Public
 */
const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getItemById(req.params.id);

  if (!item) {
    return sendError(res, "Inventory item not found", 404);
  }

  await inventoryService.deleteItem(req.params.id);
  return sendSuccess(
    res,
    { id: req.params.id, message: "Inventory item removed" },
    200,
  );
});

module.exports = {
  getInventory,
  getInventoryAnalysis,
  getInventoryItemById,
  getSingleInventoryAnalysis,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
