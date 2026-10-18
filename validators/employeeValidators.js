const { body, param, query, checkExact } = require('express-validator');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const MAX_SALARY = 10_000_000; // sanity cap so typos like 50000000000 are rejected
const NAME_PATTERN = /^[\p{L}][\p{L} '.-]*$/u; // letters in any language, spaces, apostrophes, dots, dashes

// Builds the rule for one text field. `isRequired` is false for updates, where every field is optional.
function textField(fieldName, { isRequired, maxLength, pattern, patternMessage }) {
    let rule = body(fieldName);
    rule = isRequired
        ? rule.exists({ values: 'falsy' }).withMessage(`${fieldName} is required`).bail()
        : rule.optional();
    rule = rule
        .isString().withMessage(`${fieldName} must be a string`).bail()
        .trim()
        .isLength({ min: 1, max: maxLength }).withMessage(`${fieldName} must be 1 to ${maxLength} characters`).bail();
    if (pattern) rule = rule.matches(pattern).withMessage(patternMessage);
    return rule;
}

// All employee body fields. The owner ("user") is intentionally NOT here: it comes from the JWT,
// and checkExact() below rejects it if a client tries to send it.
function employeeFieldRules({ isRequired }) {
    const presence = (rule, fieldName) =>
        isRequired ? rule.exists({ values: 'null' }).withMessage(`${fieldName} is required`).bail() : rule.optional();

    return [
        textField('first_name', { isRequired, maxLength: 50, pattern: NAME_PATTERN, patternMessage: 'first_name may only contain letters, spaces, apostrophes, dots and dashes' }),
        textField('last_name', { isRequired, maxLength: 50, pattern: NAME_PATTERN, patternMessage: 'last_name may only contain letters, spaces, apostrophes, dots and dashes' }),
        textField('email', { isRequired, maxLength: 254 })
            .isEmail().withMessage('email must be a valid email address')
            .toLowerCase(),
        textField('position', { isRequired, maxLength: 100 }),
        textField('department', { isRequired, maxLength: 100 }),
        presence(body('salary'), 'salary')
            // Only real JSON numbers: "5000" (a string) or true would otherwise be quietly converted
            .custom((salary) => typeof salary === 'number').withMessage('salary must be a number').bail()
            .isFloat({ gt: 0, max: MAX_SALARY }).withMessage(`salary must be greater than 0 and at most ${MAX_SALARY}`)
            .toFloat(),
        presence(body('date_of_joining'), 'date_of_joining')
            .isString().withMessage('date_of_joining must be a string').bail()
            // strict + strictSeparator: "2024-02-30" and "2024/01/01" are rejected, "2024-01-15" passes
            .isISO8601({ strict: true, strictSeparator: true }).withMessage('date_of_joining must be a valid date in YYYY-MM-DD format')
            .toDate(),
    ];
}

const employeeIdRule = (location) =>
    location('eid')
        .exists({ values: 'falsy' }).withMessage('eid is required').bail()
        .isMongoId().withMessage('eid must be a valid employee ID');

const UNEXPECTED_FIELD = { message: 'Unexpected field' }; // replaced by a field-specific message in validateRequest.js

// POST /api/v1/emp/employees
const createEmployeeRules = checkExact(employeeFieldRules({ isRequired: true }), UNEXPECTED_FIELD);

// GET /api/v1/emp/employees/:eid
const employeeIdParamRules = [employeeIdRule(param)];

// PUT /api/v1/emp/employees/:eid -> any subset of fields, but at least one
const updateEmployeeRules = checkExact(
    [employeeIdRule(param), ...employeeFieldRules({ isRequired: false })],
    UNEXPECTED_FIELD
);

// Runs after validateRequest on PUT. A plain middleware rather than a body() rule, because a
// whole-body rule would make checkExact treat every field as allowed and leak into matchedData().
function requireAtLeastOneField(req, res, next) {
    if (!req.body || Object.keys(req.body).length === 0) {
        logger.warn('Validation failed', { method: req.method, path: req.originalUrl, fields: ['body'] });
        return next(new ApiError(400, 'Validation failed', [
            { field: 'body', message: 'Request body must contain at least one field to update' },
        ]));
    }
    next();
}

// DELETE /api/v1/emp/employees?eid=xxx
const employeeIdQueryRules = checkExact([employeeIdRule(query)], UNEXPECTED_FIELD);

module.exports = {
    createEmployeeRules,
    employeeIdParamRules,
    updateEmployeeRules,
    requireAtLeastOneField,
    employeeIdQueryRules,
};
