module.exports = (sequelize, DataTypes) => {
    const Lead = sequelize.define("Lead", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        message: { type: DataTypes.TEXT, allowNull: false },
        status: { 
            type: DataTypes.ENUM('new', 'contacted', 'closed'), 
            defaultValue: 'new' 
        }
    });

    Lead.associate = (models) => {
        Lead.belongsTo(models.Listing, { foreignKey: 'listingId', as: 'Listing' });
        Lead.belongsTo(models.User, { foreignKey: 'buyerId', as: 'Buyer' });
    };

    return Lead;
};