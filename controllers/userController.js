const authService = require('../services/authService');
const config = require('../config/env');

// Controllers only translate HTTP <-> service calls. Express 5 forwards any thrown/rejected
// error to middleware/errorHandler.js, so there is no try/catch here.

// POST /api/v1/user/signup -> 201
async function signup(req, res) {
    const { username, email, password } = req.body;
    const user = await authService.registerUser({ username, email, password });

    res.status(201).json({
        status: true,
        message: 'User created successfully',
        user_id: user.id,
        user, // toJSON strips the password hash
    });
}

// POST /api/v1/user/login -> 200 with a JWT
async function login(req, res) {
    const { username, email, password } = req.body;
    const { user, token } = await authService.loginUser({ username, email, password });

    res.status(200).json({
        status: true,
        message: 'Login successful',
        token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiresIn,
        user,
    });
}

module.exports = { signup, login };
