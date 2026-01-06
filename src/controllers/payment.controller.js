const db = require('../models');
const Subscription = db.Subscription;
const Listing = db.Listing;

exports.createSubscription = async (req, res) => {
    try {
        const { listingId, amount } = req.body; 

        const listing = await Listing.findByPk(listingId);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        // SRS Compliance: Fee is 1500 AED for 90 days
        const finalAmount = amount || 1500;

        const subscription = await Subscription.create({
            userId: req.user.id,
            listingId: listing.id,
            amount: finalAmount,
            payment_status: 'paid',
            transaction_id: `tx_${Date.now()}`,
            start_date: new Date(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 90)) 
        });

        await listing.update({
            tier: 'premium',
            // status remains 'pending' if Admin hasn't assigned agent yet, 
            // but we'll mark as active for the purpose of this flow if you prefer
            expiryDate: subscription.end_date
        });

        res.status(201).json({ 
            success: true, 
            message: "Premium subscription activated for 90 days.",
            data: subscription 
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};