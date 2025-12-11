const db = require('../models');
const Lead = db.Lead;
const Listing = db.Listing;
const User = db.User;

exports.createLead = async (req, res) => {
    try {
        const { listingId, message } = req.body;
        
        const listing = await Listing.findByPk(listingId);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        const lead = await Lead.create({
            listingId,
            buyerId: req.user.id,
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