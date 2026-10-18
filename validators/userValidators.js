const { body, checkExact } = require('express-validator');

// Shared password policy. 72 is bcrypt's hard limit: anything past 72 bytes is silently ignored,
// so we reject it instead of letting users believe a longer password is stronger.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const usernameRule = () =>
    body('username')
        .exists({ values: 'falsy' }).withMessage('username is required').bail()
        .isString().withMessage('username must be a string').bail()
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('username must be 3 to 30 characters').bail()
        .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('username may only contain letters, numbers, dots, dashes and underscores')
        .toLowerCase();

const emailRule = () =>
    body('email')
        .exists({ values: 'falsy' }).withMessage('email is required').bail()
        .isString().withMessage('email must be a string').bail()
        .trim()
        .isLength({ max: 254 }).withMessage('email is too long').bail()
        .isEmail().withMessage('email must be a valid email address')
        .toLowerCase();

// POST /api/v1/user/signup
// checkExact rejects any field we didn't list (e.g. someone trying to send "_id" or "role")
const signupRules = checkExact(
    [
        usernameRule(),
        emailRule(),
        body('password')
            .exists({ values: 'falsy' }).withMessage('password is required').bail()
            .isString().withMessage('password must be a string').bail()
            .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
            .withMessage(`password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`).bail()
            .matches(/[a-z]/).withMessage('password must contain a lowercase letter')
            .matches(/[A-Z]/).withMessage('password must contain an uppercase letter')
            .matches(/[0-9]/).withMessage('password must contain a number'),
    ],
    { message: 'Unexpected field in request body' } // replaced by a field-specific message in validateRequest.js
);

// POST /api/v1/user/login
// Accepts { username, password } OR { email, password }. Only presence/type is checked here:
// the password policy is NOT re-checked at login (that would leak the policy to attackers and
// lock out accounts created under an older policy).
// (The whole-body rule sits OUTSIDE checkExact: a body() rule counts every field as "known",
// which would silently switch off the unexpected-field check.)
const loginRules = [
    checkExact(
        [
            body('username').optional().isString().withMessage('username must be a string').trim().toLowerCase(),
            body('email').optional().isString().withMessage('email must be a string').trim().toLowerCase(),
            body('password')
                .exists({ values: 'falsy' }).withMessage('password is required').bail()
                .isString().withMessage('password must be a string'),
        ],
        { message: 'Unexpected field in request body' }
    ),
    body().custom((requestBody) => {
        if (!requestBody || (!requestBody.username && !requestBody.email)) {
            throw new Error('username or email is required');
        }
        return true;
    }),
];

module.exports = { signupRules, loginRules };
