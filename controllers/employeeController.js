const { matchedData } = require('express-validator');
const employeeService = require('../services/employeeService');

// matchedData() returns only fields that passed validation (already trimmed and converted),
// so nothing unvalidated from req.body ever reaches the database.
const validatedBody = (req) => matchedData(req, { locations: ['body'] });

// GET /api/v1/emp/employees -> 200
async function getAllEmployees(req, res) {
    const employees = await employeeService.listEmployees(req.user.id);
    res.status(200).json({ status: true, count: employees.length, employees });
}

// POST /api/v1/emp/employees -> 201
async function createEmployee(req, res) {
    const employee = await employeeService.createEmployee(req.user.id, validatedBody(req));
    res.status(201).json({
        status: true,
        message: 'Employee created successfully',
        employee_id: employee.id,
        employee,
    });
}

// GET /api/v1/emp/employees/:eid -> 200
async function getEmployeeById(req, res) {
    const employee = await employeeService.getOwnedEmployee(req.user.id, req.params.eid);
    res.status(200).json({ status: true, employee });
}

// PUT /api/v1/emp/employees/:eid -> 200 (send any fields you want to change)
async function updateEmployee(req, res) {
    const employee = await employeeService.updateEmployee(req.user.id, req.params.eid, validatedBody(req));
    res.status(200).json({ status: true, message: 'Employee updated successfully', employee });
}

// DELETE /api/v1/emp/employees?eid=xxx -> 204 (No Content means no response body)
async function deleteEmployee(req, res) {
    await employeeService.deleteEmployee(req.user.id, req.query.eid);
    res.status(204).send();
}

module.exports = { getAllEmployees, createEmployee, getEmployeeById, updateEmployee, deleteEmployee };
