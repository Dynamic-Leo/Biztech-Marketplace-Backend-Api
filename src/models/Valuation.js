module.exports = (sequelize, DataTypes) => {
    const Valuation = sequelize.define("Valuation", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        contact_name: { type: DataTypes.STRING, allowNull: false },
        contact_email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
        phone: { type: DataTypes.STRING },
        business_details: { type: DataTypes.TEXT, allowNull: false },
        status: { 
            type: DataTypes.ENUM('new', 'reviewed', 'contacted'), 
            defaultValue: 'new' 
        }
    });

    return Valuation;
};