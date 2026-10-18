const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Every function takes ownerId FIRST and it always comes from req.user (the verified JWT).
// Nothing in the request body or URL can change whose employees are read or written.

async function listEmployees(ownerId) {
    // The owner filter is part of the database query itself: other users' rows are never even loaded
    return Employee.find({ user: ownerId }).sort({ created_at: -1 });
}

async function createEmployee(ownerId, employeeFields) {
    const employee = await Employee.create({ ...employeeFields, user: ownerId });
    logger.info('Employee created', { userId: ownerId, employeeId: employee.id });
    return employee;
}

// Loads one employee and checks it belongs to ownerId.
//   no such employee           -> 404 Not Found
//   belongs to a different user -> 403 Forbidden (and an authorization-failure log line)
async function getOwnedEmployee(ownerId, employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw new ApiError(404, 'Employee not found');
    }
    if (!employee.user.equals(ownerId)) {
        logger.warn('Authorization failed: employee belongs to another user', { userId: ownerId, employeeId });
        throw new ApiError(403, 'You do not have permission to access this employee');
    }
    return employee;
}

async function updateEmployee(ownerId, employeeId, changes) {
    await getOwnedEmployee(ownerId, employeeId);
    // Filter by _id AND owner again, so the write itself can only ever touch the caller's document
    const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: employeeId, user: ownerId },
        changes,
        { new: true, runValidators: true }
    );
    logger.info('Employee updated', { userId: ownerId, employeeId, fields: Object.keys(changes) });
    return updatedEmployee;
}

async function deleteEmployee(ownerId, employeeId) {
    await getOwnedEmployee(ownerId, employeeId);
    await Employee.deleteOne({ _id: employeeId, user: ownerId });
    logger.info('Employee deleted', { userId: ownerId, employeeId });
}

module.exports = { listEmployees, createEmployee, getOwnedEmployee, updateEmployee, deleteEmployee };
