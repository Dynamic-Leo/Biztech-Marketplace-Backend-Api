const express = require('express');
const router = express.Router();
const controller = require('../controllers/lead.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Buyer creates lead
router.post('/', protect, authorize('buyer'), controller.createLead);
router.get('/leads/my-enquiries', protect, authorize('buyer'), controller.getBuyerEnquiries);


// Agent manages leads
router.get('/agent/leads', protect, authorize('agent'), controller.getAgentLeads); // Note: path modified in main app router to /api/v1/agent/leads
router.put('/agent/leads/:id', protect, authorize('agent'), controller.updateLeadStatus);

module.exports = router;