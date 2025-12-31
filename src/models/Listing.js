module.exports = (sequelize, DataTypes) => {
    const Listing = sequelize.define("Listing", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        // Public Data
        title: { type: DataTypes.STRING, allowNull: false },
        industry: { type: DataTypes.STRING, allowNull: false },
        region: { type: DataTypes.STRING, allowNull: false },
        price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        net_profit: { type: DataTypes.DECIMAL(15, 2) },
        turnover: { type: DataTypes.DECIMAL(15, 2) },
        
        // Private Data
        legal_business_name: { type: DataTypes.STRING },
        full_address: { type: DataTypes.TEXT },
        owner_name: { type: DataTypes.STRING },

        // Tiering & SRS Deliverables
        tier: { 
            type: DataTypes.ENUM('basic', 'premium'), 
            defaultValue: 'basic' 
        },
        // NEW fields based on SRS screenshot:
        sale_pack_ready: { type: DataTypes.BOOLEAN, defaultValue: false }, // Business assessments
        financial_analysis_ready: { type: DataTypes.BOOLEAN, defaultValue: false }, // Analysis & projections
        legal_attestation_ready: { type: DataTypes.BOOLEAN, defaultValue: false }, // Final arrangements
        transfer_arrangements_ready: { type: DataTypes.BOOLEAN, defaultValue: false },

        status: { 
            type: DataTypes.ENUM('pending', 'active', 'sold', 'expired'), 
            defaultValue: 'pending' 
        },
        expiryDate: { type: DataTypes.DATE },
        views: { type: DataTypes.INTEGER, defaultValue: 0 },
        financing_requested: { type: DataTypes.BOOLEAN, defaultValue: false }
    });

    Listing.associate = (models) => {
        Listing.belongsTo(models.User, { foreignKey: 'sellerId', as: 'Seller' });
        Listing.belongsTo(models.User, { foreignKey: 'assignedAgentId', as: 'Agent' });
        Listing.hasMany(models.Lead, { foreignKey: 'listingId', as: 'Leads' });
    };

    return Listing;
};