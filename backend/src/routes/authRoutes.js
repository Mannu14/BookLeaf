const express = require('express');
const router = express.Router();
const { login, getMe, getDemoUsers } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.get('/demo-users', getDemoUsers);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;

