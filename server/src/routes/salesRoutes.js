const express = require("express");
const router = express.Router();
const {
  recordSale,
  getSales,
  getSaleById,
  getSalesByInventoryItem,
} = require("../controllers/salesController");

router.route("/").get(getSales).post(recordSale);

router.route("/inventory/:inventoryItemId").get(getSalesByInventoryItem);

router.route("/:id").get(getSaleById);

module.exports = router;
