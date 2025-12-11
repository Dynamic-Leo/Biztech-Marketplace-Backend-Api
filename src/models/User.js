module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
        password: { type: DataTypes.STRING, allowNull: false },
        role: { 
            type: DataTypes.ENUM('admin', 'agent', 'seller', 'buyer'), 
            defaultValue: 'buyer' 
        },
        mobile: { type: DataTypes.STRING },
        
        // --- NEW FIELDS FOR OTP & APPROVAL ---
        otp: { type: DataTypes.STRING, allowNull: true },
        otp_expires_at: { type: DataTypes.DATE, allowNull: true },
        is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
        account_status: { 
            type: DataTypes.ENUM('pending', 'active', 'rejected'), 
            defaultValue: 'pending' 
        },

        // Buyer Specific
        financial_means: { 
            type: DataTypes.ENUM('<100k', '100k-1M', '>1M'),
            allowNull: true
        },
        // Seller Specific
        agreed_commission: { 
            type: DataTypes.BOOLEAN, 
            defaultValue: false 
        }
    });

    User.associate = (models) => {
        User.hasMany(models.Listing, { foreignKey: 'sellerId', as: 'Listings' });
        User.hasMany(models.Listing, { foreignKey: 'assignedAgentId', as: 'AssignedListings' });
        User.hasMany(models.Lead, { foreignKey: 'buyerId', as: 'Enquiries' });
    };

    return User;
};