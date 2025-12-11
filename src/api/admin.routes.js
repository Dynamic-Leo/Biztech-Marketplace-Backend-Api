const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/create-agent', protect, authorize('admin'), controller.createAgent);
router.get('/pending-listings', protect, authorize('admin'), controller.getPendingListings);
router.post('/assign-agent', protect, authorize('admin'), controller.assignAgent);

module.exports = router;