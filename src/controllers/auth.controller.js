const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { Op } = require('sequelize');
const User = db.User;

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, agreed_commission, financial_means, mobile } = req.body;

        if (role === 'seller' && agreed_commission !== true) {
            return res.status(400).json({ message: "Sellers must agree to the 1% commission fee." });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            mobile,
            agreed_commission,
            financial_means,
            emailVerificationToken,
            emailVerificationTokenExpiry,
            isEmailVerified: false,
            account_status: 'pending'
        });

        // Email Service
        try {
            await axios.post(`${process.env.EMAIL_SERVICE_URL}/api/send/verification-email`, {
                email: email, // Use variable, not user.email
                emailVerificationToken: emailVerificationToken,
                domainName: process.env.FRONTEND_URL
            });
        } catch (mailError) {
            console.error("Email service failed:", mailError.message);
        }

        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email for the verification link.",
            email: email
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ message: "Invalid or missing token" });
    }

    try {
        const user = await User.findOne({
            where: {
                emailVerificationToken: token,
                emailVerificationTokenExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification token." });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationTokenExpiry = null;

        let message;
        // Auto-activate buyers
        if (user.role === 'buyer') {
            user.account_status = 'active';
            message = "Email verified and logged in successfully.";
        } else {
            // Sellers/Agents remain pending for admin
            user.account_status = 'pending';
            message = "Email verified. Your account is pending Admin approval.";
        }

        await user.save();
        res.status(200).json({ success: true, message: message });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verification check (skip for Admin/Agents if manually created/active)
        if (['buyer', 'seller'].includes(user.role)) {
            if (!user.isEmailVerified) {
                // Optional: Resend verification logic here if needed
                return res.status(403).json({ message: "Email not verified. Please check your inbox." });
            }
        }

        if (user.account_status === 'pending') {
            return res.status(403).json({ message: "Your account is pending Admin approval." });
        }

        if (user.account_status === 'rejected') {
            return res.status(403).json({ message: "Your account has been rejected. Contact support." });
        }

        res.json({
            success: true,
            token: generateToken(user.id),
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                phone: user.mobile,
                company: user.company_name,
                address: user.address,
                is_verified: user.isEmailVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, mobile, company_name, address } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update({
            name: name || user.name,
            mobile: mobile || user.mobile,
            company_name: company_name || user.company_name,
            address: address || user.address
        });

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.mobile,
                company: user.company_name,
                address: user.address
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    try {
        const user = await User.findOne({ where: { email } });

        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            
            // Standardizing on 'resetPasswordToken' based on your resetPassword function
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            await user.save();

            // Email Service
            try {
                await axios.post(`${process.env.EMAIL_SERVICE_URL}/api/send/password-reset-email`, {
                    email: user.email,
                    passwordResetToken: resetToken, // Send unhashed token
                    domainName: process.env.FRONTEND_URL,
                });
            } catch (err) {
                console.error("Email Service Error (Forgot Password):", err.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

exports.resetPassword = async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: "Password is required." });

    try {
        const resetPasswordToken = crypto.createHash("sha256").update(req.params.resettoken).digest("hex");

        const user = await User.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be 8+ chars with uppercase, lowercase, digit, and special char.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();

        res.status(200).json({ success: true, message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Error resetting password" });
    }
};