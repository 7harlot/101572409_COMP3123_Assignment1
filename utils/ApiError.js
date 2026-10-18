// An error that already knows which HTTP status it should produce.
// Controllers/middleware `throw new ApiError(404, 'Employee not found')` and the
// central error handler turns it into the JSON response. `details` is optional
// extra info for the client (for example a list of validation problems).
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

module.exports = ApiError;
