const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again in 15 minutes.' } },
});

router.post('/login', loginLimiter, validate(v.login), auth.login);
router.get('/me', authenticate, auth.me);

if (config.demoMode) {
  router.get('/demo-accounts', auth.demoAccounts);
}

module.exports = router;
