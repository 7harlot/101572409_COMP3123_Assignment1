const express = require('express');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiters');
const { signupRules, loginRules } = require('../validators/userValidators');
const validateRequest = require('../validators/validateRequest');
const { signup, login } = require('../controllers/userController');

const userRoutes = express.Router();

// Each route runs left to right: rate limit -> validation rules -> reject if invalid -> controller
userRoutes.post('/signup', signupLimiter, signupRules, validateRequest, signup);
userRoutes.post('/login', loginLimiter, loginRules, validateRequest, login);

module.exports = userRoutes;
