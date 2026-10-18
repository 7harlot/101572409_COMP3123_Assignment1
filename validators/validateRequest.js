const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Turns one express-validator error into { field, message } for the response
function describeValidationError(validationError) {
    // checkExact() reports all unexpected fields together; name them so the client knows what to remove
    if (validationError.type === 'unknown_fields') {
        const unknownFieldNames = validationError.fields.map((unknownField) => unknownField.path);
        return { field: unknownFieldNames.join(', '), message: `Unexpected field(s): ${unknownFieldNames.join(', ')}` };
    }
    // Rules on the whole body (e.g. "username or email is required") have an empty path
    return { field: validationError.path || 'body', message: validationError.msg };
}

// Runs after a list of express-validator rules. If any rule failed, stop here with a 400
// that lists every problem, so the client can fix them all in one go.
function validateRequest(req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map(describeValidationError);

    // Log which fields failed, never their values (they could be passwords)
    logger.warn('Validation failed', {
        method: req.method,
        path: req.originalUrl,
        fields: [...new Set(details.map((detail) => detail.field))], // a field can fail several rules; list it once
    });

    next(new ApiError(400, 'Validation failed', details));
}

module.exports = validateRequest;
