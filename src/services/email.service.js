const nodemailer = require('nodemailer');

// Create the transporter using credentials from .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports (587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

exports.sendEmail = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'BizTech Support'}" <${process.env.FROM_EMAIL}>`,
            to: to,
            subject: subject,
            text: text, // Plain text body
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0D1B2A;">BizTech Verification</h2>
                    <p style="font-size: 16px;">${text}</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;" />
                    <small style="color: #999;">If you didn't request this code, please ignore this email.</small>
                   </div>` // HTML body
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return false;
    }
};