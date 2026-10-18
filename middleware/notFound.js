const ApiError = require('../utils/ApiError');

// Reached only when no route matched: unsupported path or method
function notFound(req, res, next) {
    next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = notFound;
