require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const db = require('./src/models');
const initCronJobs = require('./src/services/cron.service');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration (Updated for Auth Integration)
// We allow the specific frontend origin to send credentials (cookies/headers)
const corsOptions = {
  origin: [
    'https://marketplace.biztech.ae',      // <--- ADD THIS (Your Production Frontend)
    'http://localhost:5173',               // <--- ADD THIS (Your Local Development)
    'https://api.marketplace.biztech.ae',  // Your API Domain
    process.env.CLIENT_URL                 // Environment variable fallback
  ],
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
app.use(cors(corsOptions));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: 'Too many requests from this IP.'
});
app.use('/api', limiter);

// 4. Prevent Parameter Pollution
app.use(hpp());

app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/v1/auth', require('./src/api/auth.routes'));
app.use('/api/v1/admin', require('./src/api/admin.routes'));
app.use('/api/v1/listings', require('./src/api/listing.routes'));
app.use('/api/v1', require('./src/api/lead.routes'));
app.use('/api/v1/valuation', require('./src/api/valuation.routes'));
app.use('/api/v1/payments', require('./src/api/payment.routes'));

// Specific Controller Routes
const leadController = require('./src/controllers/lead.controller');
const { protect, authorize } = require('./src/middleware/auth.middleware');
app.post('/api/v1/leads', protect, authorize('buyer'), leadController.createLead);
app.get('/api/v1/agent/leads', protect, authorize('agent'), leadController.getAgentLeads);

// Sync DB & Start
db.sequelize.sync({ alter: true }).then(() => {
    console.log("✅ Database Synced");
    initCronJobs();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch((err) => {
    console.error("❌ DB Error:", err.message);
});