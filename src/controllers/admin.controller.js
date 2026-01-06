const db = require('../models');
const bcrypt = require('bcryptjs');
const User = db.User;
const Listing = db.Listing;

// @desc    Get Admin Dashboard Stats (Dynamic Counts)
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const pendingApprovals = await User.count({ 
            where: { account_status: 'pending', role: 'seller' } 
        });
        const activeListings = await Listing.count({ 
            where: { status: 'active' } 
        });
        const totalAgents = await User.count({ 
            where: { role: 'agent' } 
        });
        
        // Revenue Calculation: Based on codebase AED 499 tier
        const premiumCount = await Listing.count({ 
            where: { tier: 'premium', status: 'active' } 
        });
        const monthlyRevenue = premiumCount * 499;

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                pendingApprovals,
                activeListings,
                totalAgents,
                monthlyRevenue
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Users with Filters
exports.getUsers = async (req, res) => {
    try {
        const { role, status } = req.query;
        let whereClause = {};
        
        // Don't show admins in the general user management list
        whereClause.role = { [db.Sequelize.Op.ne]: 'admin' };

        if (role) whereClause.role = role;
        if (status) whereClause.account_status = status;

        const users = await User.findAll({ 
            where: whereClause,
            attributes: { exclude: ['password', 'otp'] },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve/Reject Seller Account
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update({ account_status: status });
        res.status(200).json({ success: true, message: `User is now ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get listings that need an agent assigned
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

// @desc    Assign Agent and Activate Ad
exports.assignAgent = async (req, res) => {
    try {
        const { listingId, agentId } = req.body;
        const listing = await Listing.findByPk(listingId);
        if(!listing) return res.status(404).json({ message: "Listing not found" });

        // Update listing status and set expiry date to 30 days by default (or 90 for premium)
        const validityDays = listing.tier === 'premium' ? 90 : 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + validityDays);

        await listing.update({
            assignedAgentId: agentId,
            status: 'active',
            expiryDate: expiryDate
        });

        res.status(200).json({ success: true, message: "Agent assigned and Listing activated" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Internal Agent Account
exports.createAgent = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if exists
        const exists = await User.findOne({ where: { email } });
        if(exists) return res.status(400).json({ message: "Email already in use" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            role: 'agent', 
            is_verified: true, 
            account_status: 'active' 
        });

        res.status(201).json({ success: true, message: "Agent created" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};