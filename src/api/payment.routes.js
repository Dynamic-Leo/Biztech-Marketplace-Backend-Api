const express = require('express');
const router = express.Router();
const controller = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Debugging check (will print to console if undefined)
if (!controller.createSubscription) {
    console.error("❌ Error: controller.createSubscription is undefined in payment.routes.js");
}
if (!protect) {
    console.error("❌ Error: 'protect' middleware is undefined in payment.routes.js");
}

router.post('/subscribe', protect, authorize('seller'), controller.createSubscription);

module.exports = router;