const express = require('express');
const router = express.Router();
const controller = require('../controllers/valuation.controller');

router.post('/', controller.requestValuation);

module.exports = router;