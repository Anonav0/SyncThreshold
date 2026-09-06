const express = require("express");
const router = express.Router();
const {
  getInventory,
  getInventoryAnalysis,
  getInventoryItemById,
  getSingleInventoryAnalysis,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require("../controllers/inventoryController");

// Base routes
router.route("/").get(getInventory).post(createInventoryItem);

// Analysis routes (must be declared before /:id)
router.get("/analysis", getInventoryAnalysis);
router.get("/:id/analysis", getSingleInventoryAnalysis);

// Specific item CRUD routes
router
  .route("/:id")
  .get(getInventoryItemById)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
