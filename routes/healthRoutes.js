const express = require('express');
const { getHealth } = require('../controllers/healthController');

const healthRoutes = express.Router();

healthRoutes.get('/', getHealth);

module.exports = healthRoutes;
