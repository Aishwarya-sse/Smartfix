const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/signup', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);

router.get('/leaderboard', authController.getLeaderboard);
router.post('/update-location', auth, authController.updateLocation);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
