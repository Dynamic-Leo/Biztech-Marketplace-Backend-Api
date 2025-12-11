const db = require('../models');
const bcrypt = require('bcryptjs');
const User = db.User;
const Listing = db.Listing;

exports.createAgent = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ 
            name, email, password: hashedPassword, role: 'agent' 
        });
        res.status(201).json({ success: true, data: { id: user.id, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPendingListings = async (req, res) => {
    try {
        const listings = await Listing.findAll({
            where: { status: 'pending' },
            include: [{ model: User, as: 'Seller', attributes: ['name', 'email'] }]
        });
        res.status(200).json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.assignAgent = async (req, res) => {
    try {
        const { listingId, agentId } = req.body;
        
        const listing = await Listing.findByPk(listingId);
        if(!listing) return res.status(404).json({ message: "Listing not found" });

        const agent = await User.findOne({ where: { id: agentId, role: 'agent' } });
        if(!agent) return res.status(404).json({ message: "Agent not found" });

        await listing.update({
            assignedAgentId: agentId,
            status: 'active' // SRS: Status active upon assignment
        });

        res.status(200).json({ success: true, message: "Agent assigned, Listing Active", data: listing });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};