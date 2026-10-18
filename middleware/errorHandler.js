const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Converts known library errors into an ApiError with the right status code.
// Anything unrecognised becomes a generic 500 so internals never leak to the client.
function toApiError(error) {
    if (error instanceof ApiError) return error;

    // express.json() could not parse the body
    if (error.type === 'entity.parse.failed') {
        return new ApiError(400, 'Request body is not valid JSON');
    }
    if (error.type === 'entity.too.large') {
        return new ApiError(413, 'Request body is too large');
    }
    // Schema rules failed (backup for anything the validators layer missed)
    if (error instanceof mongoose.Error.ValidationError) {
        const details = Object.values(error.errors).map((fieldError) => ({
            field: fieldError.path,
            message: fieldError.message,
        }));
        return new ApiError(400, 'Validation failed', details);
    }
    // A value could not be converted to the schema type, e.g. a bad ObjectId
    if (error instanceof mongoose.Error.CastError) {
        return new ApiError(400, `Invalid value for ${error.path}`);
    }
    // MongoDB unique index violation
    if (error.code === 11000) {
        const duplicateFields = Object.keys(error.keyValue || {}).filter((field) => field !== 'user');
        return new ApiError(409, `A record with this ${duplicateFields.join(', ') || 'value'} already exists`);
    }

    return new ApiError(500, 'Internal server error');
}

// Express recognises an error handler by its 4 parameters, so `next` must stay even though unused
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
    const apiError = toApiError(error);

    if (apiError.statusCode >= 500) {
        // Full stack goes to logs/error.log only, never to the client
        logger.error('Unhandled error', { method: req.method, path: req.originalUrl, error: error.message, stack: error.stack });
    }

    const body = { status: false, message: apiError.message };
    if (apiError.details) body.errors = apiError.details;
    res.status(apiError.statusCode).json(body);
}

module.exports = errorHandler;
