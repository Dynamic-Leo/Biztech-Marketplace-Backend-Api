const db = require('../models');
const Lead = db.Lead;
const Listing = db.Listing;
const User = db.User;
const { Op } = require('sequelize');

exports.createLead = async (req, res) => {
    try {
        const { listingId, message } = req.body;
        const buyerId = req.user.id;

        // Check if listing exists
        const listing = await Listing.findByPk(listingId);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        // Check for recent enquiry (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const existingLead = await Lead.findOne({
            where: {
                listingId,
                buyerId,
                createdAt: {
                    [Op.gte]: sevenDaysAgo // Greater than or equal to 7 days ago
                }
            }
        });

        if (existingLead) {
            return res.status(400).json({ 
                message: "You have already enquired about this business recently. Please wait 7 days before enquiring again." 
            });
        }

        // Create new lead
        const lead = await Lead.create({
            listingId,
            buyerId,
            message
        });

        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAgentLeads = async (req, res) => {
    try {
        // Find leads for listings assigned to this agent
        const leads = await Lead.findAll({
            include: [
                { 
                    model: Listing, 
                    as: 'Listing', 
                    where: { assignedAgentId: req.user.id },
                    attributes: ['title', 'id']
                },
                {
                    model: User,
                    as: 'Buyer',
                    attributes: ['name', 'email', 'financial_means']
                }
            ]
        });

        res.status(200).json({ success: true, count: leads.length, data: leads });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    try {
        const lead = await Lead.findByPk(req.params.id, {
            include: [{ model: Listing, as: 'Listing' }]
        });
        
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Authorization check: Only assigned agent
        if (lead.Listing.assignedAgentId !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await lead.update({ status: req.body.status });
        res.status(200).json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBuyerEnquiries = async (req, res) => {
    try {
        const leads = await Lead.findAll({
            where: { buyerId: req.user.id },
            include: [{ model: Listing, as: 'Listing', attributes: ['title', 'id'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: leads });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};