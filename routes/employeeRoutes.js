const express = require('express');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../validators/validateRequest');
const {
    createEmployeeRules,
    employeeIdParamRules,
    updateEmployeeRules,
    requireAtLeastOneField,
    employeeIdQueryRules,
} = require('../validators/employeeValidators');
const employeeController = require('../controllers/employeeController');

const employeeRoutes = express.Router();

// Every employee route requires a valid JWT. This runs before validation,
// so an anonymous caller gets 401 and learns nothing about the expected fields.
employeeRoutes.use(authenticate);

employeeRoutes.get('/employees', employeeController.getAllEmployees);
employeeRoutes.post('/employees', createEmployeeRules, validateRequest, employeeController.createEmployee);
employeeRoutes.get('/employees/:eid', employeeIdParamRules, validateRequest, employeeController.getEmployeeById);
employeeRoutes.put('/employees/:eid', updateEmployeeRules, validateRequest, requireAtLeastOneField, employeeController.updateEmployee);
// The spec puts the id in the query string for DELETE: /employees?eid=xxx
employeeRoutes.delete('/employees', employeeIdQueryRules, validateRequest, employeeController.deleteEmployee);

module.exports = employeeRoutes;
