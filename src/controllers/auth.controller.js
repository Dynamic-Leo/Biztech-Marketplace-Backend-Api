const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/email.service');
const { Op } = require('sequelize');
const User = db.User;

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, agreed_commission, financial_means, mobile } = req.body;

        // Validations
        if (role === 'seller' && agreed_commission !== true) {
            return res.status(400).json({ message: "Sellers must agree to the 1% commission fee." });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP (Expires in 10 minutes)
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Create User (Not verified yet)
        await User.create({
            name, 
            email, 
            password: hashedPassword, 
            role, 
            mobile,
            agreed_commission, 
            financial_means,
            otp: otp,
            otp_expires_at: otpExpires,
            is_verified: false,
            account_status: 'pending' // Everyone starts pending until email verified
        });

        // Send OTP Email
        await sendEmail(email, "Verify Your Account", `Your OTP is: ${otp}. It expires in 10 minutes.`);

        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email for the OTP.",
            email: email
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: "User is already verified" });
        }

        // Check OTP and Expiry
        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (new Date() > user.otp_expires_at) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        // Update User Status
        let responseData = {};
        
        if (user.role === 'buyer') {
            // Buyers are automatically activated after email verification
            await user.update({
                is_verified: true,
                account_status: 'active',
                otp: null,
                otp_expires_at: null
            });

            // Log them in immediately
            const token = generateToken(user.id);
            responseData = {
                success: true,
                message: "Email verified and logged in successfully.",
                token,
                user: { id: user.id, name: user.name, role: user.role, status: 'active' }
            };

        } else if (user.role === 'seller') {
            // Sellers verified email, but still need Admin approval
            await user.update({
                is_verified: true,
                account_status: 'pending', // Remains pending for Admin
                otp: null,
                otp_expires_at: null
            });

            responseData = {
                success: true,
                message: "Email verified. Your account is pending Admin approval.",
                requireApproval: true
            };
        } else {
            // Agent/Admin flow (if applicable)
             await user.update({
                is_verified: true,
                account_status: 'pending',
                otp: null,
                otp_expires_at: null
            });
             responseData = { success: true, message: "Verified." };
        }

        res.status(200).json(responseData);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if Email Verified
        if (!user.is_verified) {
            return res.status(403).json({ message: "Please verify your email address first." });
        }

        // Check Account Status (For Sellers waiting for admin)
        if (user.account_status === 'pending') {
            return res.status(403).json({ message: "Your account is pending Admin approval." });
        }

        if (user.account_status === 'rejected') {
            return res.status(403).json({ message: "Your account has been rejected. Contact support." });
        }

        res.json({
            success: true,
            token: generateToken(user.id),
            user: { id: user.id, name: user.name, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};