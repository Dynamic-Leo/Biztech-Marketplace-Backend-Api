const db = require('../models');
const Valuation = db.Valuation;

exports.requestValuation = async (req, res) => {
    try {
        const { contactName, contactEmail, phone, businessDetails } = req.body;
        
        // Save to Database
        const valuation = await Valuation.create({
            contact_name: contactName || "Anonymous", // Handle optional fields
            contact_email: contactEmail,
            phone: phone,
            business_details: businessDetails
        });

        res.status(201).json({ 
            success: true, 
            message: "Valuation request saved successfully.",
            data: valuation
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};