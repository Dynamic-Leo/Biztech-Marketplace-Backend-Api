const express = require('express');
const router = express.Router();
const controller = require('../controllers/listing.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// 1. Specific routes MUST come before generic /:id routes
router.get('/my-listings', protect, authorize('seller'), controller.getSellerListings);

// 2. Creation and Public routes
router.post('/', protect, authorize('seller'), controller.createListing);
router.get('/', controller.getListings); 

// 3. Generic ID route (moved to bottom)
router.get('/:id', async (req, res, next) => {
    if (req.headers.authorization) { 
        await protect(req, res, next); 
    } else { 
        next(); 
    }
}, controller.getListingById);

router.post('/:id/financing', protect, authorize('seller'), controller.requestFinancing);

module.exports = router;