const cron = require('node-cron');
const { Op } = require('sequelize');
const db = require('../models');
const Listing = db.Listing;
const { sendEmail } = require('./email.service');

const initCronJobs = () => {
    // Run every day at midnight: '0 0 * * *'
    cron.schedule('0 0 * * *', async () => {
        console.log('--- Running Daily Listing Expiry Check ---');
        try {
            const today = new Date();
            
            // Find active premium listings that have expired
            const expiredListings = await Listing.findAll({
                where: {
                    status: 'active',
                    expiryDate: { [Op.lt]: today }, // Less than today
                    tier: 'premium'
                },
                include: ['Seller']
            });

            for (const listing of expiredListings) {
                // Update status
                listing.status = 'expired';
                await listing.save();

                // Notify Seller
                if (listing.Seller && listing.Seller.email) {
                    await sendEmail(
                        listing.Seller.email, 
                        "Your Listing Has Expired", 
                        `Your listing "${listing.title}" has expired. Please renew your subscription.`
                    );
                }
            }
            console.log(`Processed ${expiredListings.length} expired listings.`);
        } catch (error) {
            console.error('Cron Job Error:', error);
        }
    });
};

module.exports = initCronJobs;