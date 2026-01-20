const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware'); 

router.post('/register', controller.register);
router.put('/verifyemail/:token', controller.verifyEmail); 
router.post('/forgot-password', controller.forgotPassword);  
router.put('/resetpassword/:token', controller.resetPassword); 
router.put('/profile', protect, controller.updateProfile);
router.post('/login', controller.login);

module.exports = router;