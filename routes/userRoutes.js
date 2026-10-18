const express = require('express');
const { authLimiter } = require('../middleware/rateLimiters');
const { signupRules, loginRules } = require('../validators/userValidators');
const validateRequest = require('../validators/validateRequest');
const { signup, login } = require('../controllers/userController');

const userRoutes = express.Router();

// Each route runs left to right: rate limit -> validation rules -> reject if invalid -> controller
userRoutes.post('/signup', authLimiter, signupRules, validateRequest, signup);
userRoutes.post('/login', authLimiter, loginRules, validateRequest, login);

module.exports = userRoutes;
