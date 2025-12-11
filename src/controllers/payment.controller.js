const db = require('../models');
const Subscription = db.Subscription;
const Listing = db.Listing;

// @desc    Simulate Payment for Premium Listing
// @route   POST /api/v1/payments/subscribe
exports.createSubscription = async (req, res) => {
    try {
        const { listingId, amount } = req.body; 

        // Check if listing exists
        const listing = await Listing.findByPk(listingId);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        // 1. Create Subscription Record
        // (Ensure Subscription model exists in src/models/Subscription.js)
        const subscription = await Subscription.create({
            userId: req.user.id,
            listingId: listing.id,
            amount: amount,
            payment_status: 'paid', // Mocking successful payment
            transaction_id: `tx_${Date.now()}`,
            start_date: new Date(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 90)) // +90 Days
        });

        // 2. Update Listing to Premium & Active
        await listing.update({
            tier: 'premium',
            status: 'active',
            expiryDate: subscription.end_date
        });

        res.status(201).json({ 
            success: true, 
            message: "Subscription successful. Listing upgraded to Premium.",
            data: subscription 
        });

    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ message: error.message });
    }
};