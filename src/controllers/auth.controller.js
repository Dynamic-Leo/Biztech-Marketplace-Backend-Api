const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
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

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Create User (Not verified yet)
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
            account_status: 'pending' // Everyone starts pending until email verified
        });

         // calling email micro-service to send verification email
        axios.post(`${process.env.EMAIL_SERVICE_URL}/api/send/verification-email`, {
            email: user.email,
            emailVerificationToken: emailVerificationToken,
            domainName: process.env.FRONTEND_URL
        }).catch(err => {
            console.error("Failed to call email micro-service", err);
        });

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
    const { token } = req.params;

    if ( !token || token.length !== 64) {
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

        switch (user.role) {
            case 'buyer':
                user.account_status = 'active';
                message = "Email verified and logged in successfully.";
                break;
            case 'seller':
                user.account_status = 'pending';    
                message = "Email verified. Your account is pending Admin approval.";
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid user role." });
        }
        await user.save();
        res.status(200).json({ success: true, message: message });
    } catch (error) { 
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
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
        if (!user.isEmailVerified) {
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            user.emailVerificationToken = emailVerificationToken;
            user.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
            await user.save();

            // calling email micro-service to send verification email
            axios.post(`${process.env.EMAIL_SERVICE_URL}/api/send/verification-email`, {
                email: user.email,
                emailVerificationToken: emailVerificationToken,
                domainName: process.env.FRONTEND_URL
            }).catch(err => {
                console.error("Failed to call email micro-service");
            });
            return res.status(403).json({ message: "Email not verified. Please verify your email before logging in." });
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
            user: { id: user.id, name: user.name, role: user.role, is_verified: user.is_verified}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Reset Password
exports.resetPassword = async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required." });
  }

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
        message: 'Password must be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one digit, and one special character.'
      });
    }

    // Hash the new password
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

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (user) {

        const resetToken = crypto.randomBytes(32).toString('hex');
            
        // Set fields matching model definition
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        
        try {
            await user.save();
        } catch (dbError) {
            user.rollback(); 
            console.error("DB Save Error (Forgot Password):", dbError);
            return res.status(500).json({ message: "Database Error: Unable to save reset token." });
        }

        axios.post(`${getEmailServiceUrl()}/api/send/password-reset-email`, {
            email: user.email,
            passwordResetToken: resetToken,
            domainName: process.env.FRONTEND_URL,
        }).catch(err => console.error("Email Service Error (Forgot Password):", err.message));
    }

    res.status(200).json({ 
      success: true,
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server error processing request." });
  }
};