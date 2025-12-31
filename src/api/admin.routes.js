const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Apply protection to all admin routes
router.use(protect);
router.use(authorize('admin'));

// Stats & User Management
router.get('/stats', controller.getDashboardStats);
router.get('/users', controller.getUsers);
router.put('/users/:id/status', controller.updateUserStatus);

// Listing & Agent Management
router.post('/create-agent', controller.createAgent);
router.get('/pending-listings', controller.getPendingListings);
router.post('/assign-agent', controller.assignAgent);

module.exports = router;