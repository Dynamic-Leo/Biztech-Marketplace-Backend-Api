const express = require('express');
const router = express.Router();
const controller = require('../controllers/listing.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('seller'), controller.createListing);
router.get('/', controller.getListings); // Public Search

// Optional middleware: If token exists, attach user, else continue as guest
router.get('/:id', async (req, res, next) => {
    if (req.headers.authorization) { await protect(req, res, next); } 
    else { next(); }
}, controller.getListingById);

router.post('/:id/financing', protect, authorize('seller'), controller.requestFinancing);

module.exports = router;