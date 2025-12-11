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
        
        // Private Data (Masked)
        legal_business_name: { type: DataTypes.STRING },
        full_address: { type: DataTypes.TEXT },
        owner_name: { type: DataTypes.STRING },

        // Meta
        tier: { 
            type: DataTypes.ENUM('basic', 'premium'), 
            defaultValue: 'basic' 
        },
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