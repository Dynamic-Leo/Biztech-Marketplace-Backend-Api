module.exports = (sequelize, DataTypes) => {
    const Subscription = sequelize.define("Subscription", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        currency: { type: DataTypes.STRING, defaultValue: 'AED' },
        payment_status: { 
            type: DataTypes.ENUM('pending', 'paid', 'failed'), 
            defaultValue: 'pending' 
        },
        transaction_id: { type: DataTypes.STRING }, // From Stripe/Gateway
        start_date: { type: DataTypes.DATE },
        end_date: { type: DataTypes.DATE }
    });

    Subscription.associate = (models) => {
        Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
        Subscription.belongsTo(models.Listing, { foreignKey: 'listingId', as: 'Listing' });
    };

    return Subscription;
};