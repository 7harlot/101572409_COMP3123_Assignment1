# COMP3123 Assignment 1: Secure Employee Management API

**Student ID:** 101572409

A RESTful backend API built with Node.js, Express and MongoDB. Users sign up and log in to get a JWT, then manage their own list of employees. Every employee belongs to the user who created it, and a user can never see, change or delete another user's employees.

## Contents

- [Technologies](#technologies)
- [Project structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Authorization (employee ownership)](#authorization-employee-ownership)
- [Validation](#validation)
- [Error handling and status codes](#error-handling-and-status-codes)
- [Security](#security)
- [Logging](#logging)
- [Health check](#health-check)
- [Testing with Postman](#testing-with-postman)
- [Sample test credentials](#sample-test-credentials)

## Technologies

| Purpose | Package |
|---|---|
| Runtime / web framework | Node.js 20+, Express 5 |
| Database / ODM | MongoDB (database `comp3123_assignment1`), Mongoose |
| Password hashing | bcryptjs (bcrypt algorithm, cost factor 12) |
| Authentication | jsonwebtoken (HS256 JWTs) |
| Validation | express-validator |
| Security headers | helmet |
| Rate limiting | express-rate-limit |
| Logging | winston |
| Configuration | dotenv |
| Development | nodemon |

## Project structure

```
101572409_COMP3123_Assignment1/
├── server.js                  # Entry point: loads config, connects to MongoDB, starts listening
├── app.js                     # Builds the Express app: middleware order, routers, 404, error handler
├── config/
│   ├── env.js                 # Reads and checks environment variables once, at startup
│   └── db.js                  # MongoDB connection (forces the comp3123_assignment1 database)
├── models/
│   ├── User.js                # username, email, hashed password, timestamps
│   └── Employee.js            # employee fields + `user` (ObjectId ref -> User = the owner)
├── routes/                    # URL + HTTP method -> middleware chain -> controller
│   ├── userRoutes.js          # /api/v1/user/...
│   ├── employeeRoutes.js      # /api/v1/emp/...
│   └── healthRoutes.js        # /health
├── controllers/               # Turn HTTP requests into service calls and send responses
├── services/                  # Business logic and database access
│   ├── authService.js         # signup, login, JWT sign/verify
│   └── employeeService.js     # employee CRUD with ownership checks
├── middleware/
│   ├── authenticate.js        # Verifies the Bearer JWT and sets req.user
│   ├── rateLimiters.js        # login, signup and general API limits
│   ├── requestLogger.js       # One log line per request
│   ├── notFound.js            # 404 for unknown routes
│   └── errorHandler.js        # Central error -> JSON response
├── validators/                # express-validator rules for each endpoint
├── utils/
│   ├── ApiError.js            # Error type that carries an HTTP status
│   └── logger.js              # Winston logger (console + logs/*.log)
├── logs/                      # Generated log files (git-ignored) + sample.log
├── postman/                   # Exported Postman collection
├── .env.example               # Template for .env (no real secrets)
└── package.json
```

A request flows like this:

```
route -> rate limiter -> authenticate (employee routes) -> validators -> controller -> service -> MongoDB
                                         any error at any step -> errorHandler -> JSON response
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/7harlot/101572409_COMP3123_Assignment1.git
   cd 101572409_COMP3123_Assignment1
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**: copy the template and fill it in (see [Configuration](#configuration)).
   ```bash
   cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
   ```
4. **Start MongoDB**: either use a MongoDB Atlas cluster (put its connection string in `MONGODB_URI`) or run MongoDB locally and use `mongodb://127.0.0.1:27017`. The database `comp3123_assignment1` is created automatically on the first write.
5. **Start the application**
   ```bash
   npm run dev     # restarts on file changes (nodemon)
   npm start       # plain node
   ```
   You should see `Connected to MongoDB` and `Server started` in the console.
6. **Test the API**: open http://localhost:3000/health, then import the Postman collection from `postman/` (see [Testing with Postman](#testing-with-postman)).

## Configuration

All settings come from environment variables, loaded from `.env` by dotenv. `.env` is listed in `.gitignore` and is never committed; `.env.example` shows the variables with placeholder values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | yes | | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | yes | | Secret used to sign JWTs, at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | `1h` | Token lifetime, e.g. `15m`, `1h`, `1d` |
| `PORT` | no | `3000` | HTTP port |
| `NODE_ENV` | no | `development` | Environment name (shown in startup log) |
| `LOG_LEVEL` | no | `info` | Minimum log level (`error`, `warn`, `info`, `debug`) |
| `LOGIN_RATE_LIMIT_MAX` | no | `10` | Failed logins allowed per IP per 15 minutes |
| `SIGNUP_RATE_LIMIT_MAX` | no | `20` | Signup attempts allowed per IP per 15 minutes |
| `API_RATE_LIMIT_MAX` | no | `100` | Total `/api` requests allowed per IP per 15 minutes |
| `TRUST_PROXY` | no | | Set to `1` when deployed behind a proxy so rate limits use the real client IP |

The app refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing, or if `JWT_SECRET` is shorter than 32 characters. The database name is always `comp3123_assignment1` (set in `config/db.js`), whatever the URI says.

## API endpoints

Base URL: `http://localhost:3000`. All request and response bodies are JSON.

| # | Method | Endpoint | Auth | Success | Purpose |
|---|---|---|---|---|---|
| 1 | POST | `/api/v1/user/signup` | no | 201 | Register a new user |
| 2 | POST | `/api/v1/user/login` | no | 200 | Log in with username **or** email + password, returns a JWT |
| 3 | GET | `/api/v1/emp/employees` | JWT | 200 | List the logged-in user's employees |
| 4 | POST | `/api/v1/emp/employees` | JWT | 201 | Create an employee owned by the logged-in user |
| 5 | GET | `/api/v1/emp/employees/{eid}` | JWT | 200 | Get one of the user's employees |
| 6 | PUT | `/api/v1/emp/employees/{eid}` | JWT | 200 | Update one of the user's employees |
| 7 | DELETE | `/api/v1/emp/employees?eid={eid}` | JWT | 204 | Delete one of the user's employees |
| | GET | `/health` | no | 200 | Health check |

Every success response has `"status": true`, every error has `"status": false` and a `message`.

### 1. Signup: `POST /api/v1/user/signup`

```json
{ "username": "usera_demo", "email": "usera@example.com", "password": "UserA_Pass123" }
```

**201 Created**
```json
{
  "status": true,
  "message": "User created successfully",
  "user_id": "6ad263bafc34c17fa7ecc756",
  "user": {
    "_id": "6ad263bafc34c17fa7ecc756",
    "username": "usera_demo",
    "email": "usera@example.com",
    "created_at": "2026-10-16T17:49:46.368Z",
    "updated_at": "2026-10-16T17:49:46.368Z"
  }
}
```
Errors: `400` validation failed, `409` username or email already exists, `429` too many attempts.

### 2. Login: `POST /api/v1/user/login`

Either of these bodies works:
```json
{ "username": "usera_demo", "password": "UserA_Pass123" }
{ "email": "usera@example.com", "password": "UserA_Pass123" }
```

**200 OK**
```json
{
  "status": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "1h",
  "user": { "_id": "...", "username": "usera_demo", "email": "usera@example.com", "created_at": "...", "updated_at": "..." }
}
```
Errors: `400` missing fields, `401` invalid credentials, `429` too many failed attempts.

### 3. List employees: `GET /api/v1/emp/employees`

**200 OK**
```json
{
  "status": true,
  "count": 1,
  "employees": [
    {
      "_id": "6ad263bcfc34c17fa7ecc759",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "position": "Developer",
      "salary": 75000,
      "date_of_joining": "2024-01-15T00:00:00.000Z",
      "department": "Engineering",
      "user": "6ad263bafc34c17fa7ecc756",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 4. Create employee: `POST /api/v1/emp/employees`

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "position": "Developer",
  "salary": 75000,
  "date_of_joining": "2024-01-15",
  "department": "Engineering"
}
```
**201 Created**: `{ "status": true, "message": "Employee created successfully", "employee_id": "...", "employee": { ... } }`

The owner (`user`) is taken from the JWT. Sending a `user` field is rejected with `400`.

### 5. Get employee: `GET /api/v1/emp/employees/{eid}`

**200 OK**: `{ "status": true, "employee": { ... } }`

### 6. Update employee: `PUT /api/v1/emp/employees/{eid}`

Send any of the employee fields; only those are changed. At least one field is required.
```json
{ "position": "Senior Developer", "salary": 85000 }
```
**200 OK**: `{ "status": true, "message": "Employee updated successfully", "employee": { ... } }`

### 7. Delete employee: `DELETE /api/v1/emp/employees?eid={eid}`

**204 No Content** (empty body).

Employee errors: `400` invalid input or invalid `eid`, `401` missing/invalid/expired token, `403` employee belongs to another user, `404` employee not found, `409` the user already has an employee with that email.

## Authentication

1. **Signup** stores the user with a bcrypt hash of the password (never the password itself).
2. **Login** finds the user by username or email and checks the password with `bcrypt.compare`. On success the server signs a **JWT** with `JWT_SECRET` (HS256). Its payload holds the user id (`sub`), the username and an expiry (`exp`, from `JWT_EXPIRES_IN`).
3. The client sends the token on every employee request in the **Authorization header**:
   ```
   Authorization: Bearer <jwt>
   ```
4. **`middleware/authenticate.js`** protects every `/api/v1/emp` route. It:
   - rejects a missing header, or one that isn't `Bearer <token>` (401)
   - verifies the signature and expiry with `jwt.verify`, only accepting HS256 (401 "Invalid token" / "Token has expired")
   - checks the user in the token still exists (401)
   - sets `req.user = { id, username }` for the rest of the request

Login failures always return the same message ("Invalid username/email or password"), and an unknown username still runs a bcrypt comparison, so the response doesn't reveal which usernames exist.

## Authorization (employee ownership)

**A user can only access employees belonging to that user.** The app guarantees this in four places:

1. **Relationship in the database.** Each Employee document has a `user` field: an ObjectId referencing the User who created it (`models/Employee.js`).
2. **The owner always comes from the verified JWT.** On create, `user` is set to `req.user.id`. The client cannot choose it: the validators reject a `user` field in the body.
3. **The list query is filtered by owner.** `GET /employees` runs `Employee.find({ user: req.user.id })`, so other users' employees are never even loaded.
4. **Single-employee routes check ownership before acting** (`services/employeeService.js`):
   - employee doesn't exist: **404 Not Found**
   - employee exists but `employee.user` is not the logged-in user: **403 Forbidden**, and an "Authorization failed" line is logged
   - update and delete then run with a filter on **both** `_id` and `user`, so the database write itself can only touch the caller's own document

Changing `eid` in the URL or query string can't bypass this, because the check compares the employee's stored owner with the user from the token, not with anything the client sends.

*Design note:* returning 403 tells a user that some other user's employee id exists. A stricter design returns 404 in both cases. This API uses 403 so the two situations are distinguishable, as the assignment lists them as separate cases.

## Validation

All input is validated with express-validator before it reaches a controller (`validators/`). Only fields that passed validation are passed on to the database (`matchedData`).

| Field | Rules |
|---|---|
| `username` | required, string, 3 to 30 characters, letters/numbers/`.`/`_`/`-`, stored lowercase |
| `email` (user & employee) | required, string, valid email format, at most 254 characters, stored lowercase |
| `password` | required, string, 8 to 72 characters, at least one lowercase letter, one uppercase letter and one number |
| `first_name`, `last_name` | required, string, 1 to 50 characters, letters, spaces, `'`, `.`, `-` |
| `position`, `department` | required, string, 1 to 100 characters |
| `salary` | required, JSON number (not a string), greater than 0, at most 10,000,000 |
| `date_of_joining` | required, valid calendar date in `YYYY-MM-DD` format (`2024-02-30` is rejected) |
| `eid` | required, valid MongoDB ObjectId |
| unknown fields | rejected (for example `role`, `user`, `_id`) |

Validation failures return **400** with every problem listed:
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email address" },
    { "field": "salary", "message": "salary must be greater than 0 and at most 10000000" }
  ]
}
```
Mongoose schema rules (required, min, match, unique indexes) are a second line of defence behind the validators.

## Error handling and status codes

All errors go through one handler, `middleware/errorHandler.js`, so every error response has the same shape: `{ "status": false, "message": "...", "errors": [...] }` (`errors` only for validation). Unexpected errors return a generic `"Internal server error"`: stack traces, database details and secrets are only written to `logs/error.log`, never sent to the client.

| Code | When this API returns it |
|---|---|
| 200 OK | Successful login, list, get and update |
| 201 Created | Signup and employee creation: a new resource was created |
| 204 No Content | Employee deleted: success with nothing to send back |
| 400 Bad Request | Validation failure, malformed JSON, invalid ObjectId, unexpected fields |
| 401 Unauthorized | Wrong login credentials; missing, invalid or expired JWT (who are you?) |
| 403 Forbidden | Valid JWT, but the employee belongs to another user (you're not allowed) |
| 404 Not Found | Employee doesn't exist, or the route doesn't exist |
| 409 Conflict | Username or email already registered; duplicate employee email for the same user |
| 413 Payload Too Large | Request body over 10 KB |
| 429 Too Many Requests | A rate limit was exceeded |
| 500 Internal Server Error | Anything unexpected (details logged, not returned) |
| 503 Service Unavailable | `/health` only: server is running but MongoDB isn't connected |

## Security

- **Password hashing:** passwords are hashed with bcrypt (cost 12, random salt per password) in a Mongoose `pre('save')` hook, so plain text is never stored. The password field has `select: false` and is removed again in `toJSON`, so a hash is never returned in a response. Passwords over 72 characters are rejected because bcrypt ignores everything after 72 bytes.
- **JWT:** signed with a secret of 32+ characters from `.env`, HS256 only (prevents `alg: none` and algorithm-swap attacks), with an expiry. Employee ownership is read only from the verified token.
- **Helmet:** sets HTTP security headers on every response, including `Content-Security-Policy` (limits where scripts/resources can load from, against XSS), `Strict-Transport-Security` (forces HTTPS), `X-Content-Type-Options: nosniff` (stops browsers guessing content types), `X-Frame-Options: SAMEORIGIN` (prevents clickjacking) and removes `X-Powered-By` (doesn't advertise Express).
- **Rate limiting:** see below.
- **Input validation:** every field is checked for type, length and format; unknown fields are rejected, and non-string values like `{"$ne": null}` are rejected, which blocks NoSQL operator injection. Request bodies are capped at 10 KB.
- **Environment variables:** the MongoDB URI and JWT secret live only in `.env`, which is git-ignored. `.env.example` holds placeholders only. Logs never contain passwords, hashes, tokens or the connection string.

### Rate limiting

Rate limiting caps how many requests one client (IP address) can make in a time window. It slows down password guessing, mass account creation and request floods. Counters are kept in memory, per IP, over a 15-minute window.

| Limiter | Applies to | Default limit (per IP / 15 min) |
|---|---|---|
| login | `POST /api/v1/user/login` | 10 **failed** attempts (successful logins don't count) |
| signup | `POST /api/v1/user/signup` | 20 attempts |
| api | every `/api/...` route | 100 requests |

When a limit is exceeded the API responds **429 Too Many Requests**:
```json
{ "status": false, "message": "Too many failed login attempts. Please try again in 15 minutes." }
```
with `RateLimit`, `RateLimit-Policy` and `Retry-After` headers telling the client when it can try again. The event is logged as "Rate limit exceeded". Restarting the server resets the counters.

**Tested:** running the "Rate limit demo" Postman folder with 12 iterations gives `401` for the first 10 wrong passwords and `429` after that (screenshot in the submission).

## Logging

Logs are written by Winston (`utils/logger.js`) to the **`logs/`** folder, one JSON object per line, and to the console:

- `logs/app.log`: everything at `LOG_LEVEL` and above
- `logs/error.log`: errors only, including stack traces of unexpected errors

What is logged (each line has a `timestamp` and `level`):

| Event | Example fields |
|---|---|
| Server startup and DB connection | `port`, `environment`, `database` |
| Every API request | `method`, `path`, `status`, `durationMs`, `ip`, `userId` |
| Authentication | signup succeeded/rejected, login succeeded/failed (`reason`), missing/invalid/expired token |
| Successful operations | employee created/updated/deleted with `userId` and `employeeId` |
| Validation failures | which `fields` failed (not their values) |
| Authorization failures | user tried to access another user's employee |
| Rate limiting | which limiter, `ip`, `path` |
| Errors | message and stack (error.log) |

**Intentionally never logged:** passwords or password hashes, request bodies, the `Authorization` header or any JWT, `JWT_SECRET`, and the MongoDB connection string.

Generated `*.log` files are git-ignored. **`logs/sample.log`** is a real log from a full Postman run, committed as evidence.

## Health check

`GET /health` (no authentication)

**200 OK** when the server and database are up:
```json
{
  "status": "ok",
  "service": "101572409_comp3123_assignment1",
  "version": "1.0.0",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-16T17:41:14.678Z",
  "database": "connected"
}
```
If the server is running but MongoDB is unreachable it returns **503** with `"status": "degraded"` and `"database": "disconnected"`, so it's clear which part is down.

## Testing with Postman

The collection is in `postman/COMP3123_Assignment1.postman_collection.json`.

1. In Postman, **Import** that file.
2. Start the server (`npm run dev`).
3. Run the folders in order (or use **Run collection**). Each request has tests, and tokens and employee ids are saved to collection variables automatically.

| Folder | What it shows |
|---|---|
| 0. Health | health check + Helmet headers |
| 1. Setup | creates User A and User B (re-runs accept 409) |
| 2. Signup | valid signup, duplicate username, duplicate email, invalid email, weak password, missing fields, unexpected field, malformed JSON |
| 3. Login | username+password, email+password, wrong password, unknown user, missing credentials |
| 4. Employees: User A CRUD | create, list, get, update, duplicate |
| 5. Validation and auth errors | missing fields, invalid email/salary/date, setting the owner, invalid id, non-existent id, missing/invalid/expired JWT |
| 6. Two-user ownership test | User B's employee; A and B each try to read, update and delete the other's employee (403); nothing changed |
| 7. Delete | delete own employee (204), then 404, missing `eid` (400) |
| 8. Unsupported route | 404 |
| 9. Rate limit demo | run separately with 12 iterations to see the 429 |

A full run (folders 0 to 8) is 46 requests and 93 assertions, all passing. To see a real "Token has expired" message, set `JWT_EXPIRES_IN=10s`, restart, log in, wait 10 seconds and call an employee endpoint.

## Sample test credentials

Created by the "Setup" folder of the Postman collection (test data only, not real accounts):

| User | Username | Email | Password |
|---|---|---|---|
| User A | `usera_demo` | `usera@example.com` | `UserA_Pass123` |
| User B | `userb_demo` | `userb@example.com` | `UserB_Pass123` |
