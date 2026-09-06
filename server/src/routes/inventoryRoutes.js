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
const {
  analyzeItemRisk,
  analyzeCandidatesRisk,
} = require("../controllers/aiController");

// Base routes
router.route("/").get(getInventory).post(createInventoryItem);

// AI Risk Analysis routes (declared before /:id)
router.post("/ai-analysis", analyzeCandidatesRisk);
router.post("/:id/ai-analysis", analyzeItemRisk);

// Deterministic Analysis routes (must be declared before /:id)
router.get("/analysis", getInventoryAnalysis);
router.get("/:id/analysis", getSingleInventoryAnalysis);

// Specific item CRUD routes
router
  .route("/:id")
  .get(getInventoryItemById)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
