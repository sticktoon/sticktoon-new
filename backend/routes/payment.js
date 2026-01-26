const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  createOrder,
  updateOrderStatus,
} = require("../controllers/paymentController");

router.post("/create-order", auth, createOrder);
router.post("/update-order-status", updateOrderStatus);

module.exports = router;
