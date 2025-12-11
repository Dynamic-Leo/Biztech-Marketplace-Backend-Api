const Sequelize = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import Models
db.User = require('./User')(sequelize, Sequelize);
db.Listing = require('./Listing')(sequelize, Sequelize);
db.Lead = require('./Lead')(sequelize, Sequelize);
// --- NEW MODELS ---
db.Subscription = require('./Subscription')(sequelize, Sequelize);
db.Valuation = require('./Valuation')(sequelize, Sequelize);

// Initialize associations
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

module.exports = db;