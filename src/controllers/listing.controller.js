const db = require('../models');
const { Op } = require('sequelize');
const Listing = db.Listing;
const User = db.User;
const Lead = db.Lead;

exports.getListings = async (req, res) => {
    try {
        const { location, minPrice, maxPrice, minProfit, industry, searchTerm } = req.query;
        
        let whereClause = { status: 'active' };

        // Real Filter Logic
        if (location) whereClause.region = { [Op.like]: `%${location}%` };
        if (industry) whereClause.industry = industry;
        
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
        }

        if (minProfit) {
            whereClause.net_profit = { [Op.gte]: parseFloat(minProfit) };
        }

        if (searchTerm) {
            whereClause.title = { [Op.like]: `%${searchTerm}%` };
        }

        const listings = await Listing.findAll({
            where: whereClause,
            // SRS FR-B-002: Premium listings MUST appear at the top
            order: [
                [db.sequelize.literal("FIELD(tier, 'premium', 'basic')"), 'ASC'],
                ['createdAt', 'DESC']
            ],
            // Mask private data for search results
            attributes: { 
                exclude: ['legal_business_name', 'full_address', 'owner_name'] 
            }
        });

        res.status(200).json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all listings belonging to the logged-in seller
exports.getSellerListings = async (req, res) => {
    try {
        const listings = await Listing.findAll({
            where: { sellerId: req.user.id },
            include: [
                {
                    model: Lead,
                    as: 'Leads',
                    attributes: ['id']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ 
            success: true, 
            data: listings 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createListing = async (req, res) => {
    try {
        const { 
            title, industry, price, net_profit, turnover, region, 
            legal_business_name, full_address, owner_name, tier 
        } = req.body;

        const listing = await Listing.create({
            sellerId: req.user.id,
            title, 
            industry, 
            price, 
            net_profit, 
            turnover, 
            region,
            legal_business_name, 
            full_address, 
            owner_name,
            tier: tier || 'basic',
            status: 'pending'
        });

        res.status(201).json({ success: true, data: listing });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getListings = async (req, res) => {
    try {
        const { location, priceMax, industry, searchTerm } = req.query;
        let whereClause = { status: 'active' };

        if (location) whereClause.region = { [Op.like]: `%${location}%` };
        if (industry) whereClause.industry = { [Op.like]: `%${industry}%` };
        if (priceMax) whereClause.price = { [Op.lte]: priceMax };
        if (searchTerm) whereClause.title = { [Op.like]: `%${searchTerm}%` };

        const listings = await Listing.findAll({
            where: whereClause,
            order: [
                [db.sequelize.literal("FIELD(tier, 'premium', 'basic')"), 'ASC'],
                ['createdAt', 'DESC']
            ],
            attributes: { exclude: ['legal_business_name', 'full_address', 'owner_name'] }
        });

        res.status(200).json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getListingById = async (req, res) => {
    try {
        const listing = await Listing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        let isAuthorized = false;
        
        if (req.user) {
            if (req.user.role === 'admin') isAuthorized = true;
            if (req.user.role === 'seller' && listing.sellerId === req.user.id) isAuthorized = true;
            if (req.user.role === 'agent' && listing.assignedAgentId === req.user.id) isAuthorized = true;
        }

        let response = listing.toJSON();

        if (!isAuthorized) {
            delete response.legal_business_name;
            delete response.full_address;
            delete response.owner_name;
            await listing.increment('views');
        }

        res.status(200).json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.requestFinancing = async (req, res) => {
    try {
        const listing = await Listing.findByPk(req.params.id);
        if(!listing) return res.status(404).json({ message: "Listing not found" });

        if (listing.sellerId !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        if (listing.tier !== 'premium') return res.status(400).json({ message: "Only Premium sellers can request financing support" });

        await listing.update({ financing_requested: true });
        res.status(200).json({ success: true, message: "Financing request sent to agent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};  


exports.getAgentAssignedListings = async (req, res) => {
    try {
        const listings = await Listing.findAll({
            where: { assignedAgentId: req.user.id },
            include: [{ model: User, as: 'Seller', attributes: ['name', 'email'] }],
            order: [['updatedAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: listings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Agent updates the status of deliverables (Sale Pack, etc.)
exports.updateListingDeliverables = async (req, res) => {
    try {
        const listing = await Listing.findByPk(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        // Security Check: Only the assigned agent can update deliverables
        if (listing.assignedAgentId !== req.user.id) {
            return res.status(403).json({ message: "You are not the assigned agent for this listing" });
        }

        // We only allow updating deliverable-specific boolean fields
        const allowedUpdates = [
            'sale_pack_ready', 
            'financial_analysis_ready', 
            'legal_attestation_ready', 
            'transfer_arrangements_ready'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        await listing.update(updates);
        res.status(200).json({ success: true, data: listing });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};