const express = require("express");
const router = express.Router();
const {
  getInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require("../controllers/inventoryController");

router.route("/").get(getInventory).post(createInventoryItem);

router
  .route("/:id")
  .get(getInventoryItemById)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
