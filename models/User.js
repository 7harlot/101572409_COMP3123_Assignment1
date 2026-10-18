const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Cost factor for bcrypt: each +1 doubles the hashing time. 12 is ~250ms per hash,
// slow enough to make guessing passwords from a stolen database expensive.
const BCRYPT_SALT_ROUNDS = 12;

// Field names follow the assignment spec (snake_case timestamps)
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'username is required'],
            unique: true, // creates a unique index; duplicates fail with error code 11000 -> 409
            trim: true,
            lowercase: true, // "Ben" and "ben" count as the same username
            minlength: 3,
            maxlength: 30,
        },
        email: {
            type: String,
            required: [true, 'email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'password is required'],
            // Never loaded by default; login asks for it explicitly with .select('+password')
            select: false,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        versionKey: false,
        toJSON: {
            // Last line of defence: even if a query selected the hash, it never leaves the API
            transform(document, returnedObject) {
                delete returnedObject.password;
                return returnedObject;
            },
        },
    }
);

// Hash the password right before it is written to MongoDB, so plain text is never stored.
// Only re-hash when it actually changed (otherwise saving a user would hash the hash).
userSchema.pre('save', async function hashPasswordBeforeSave() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
});

// bcrypt.compare re-hashes the attempt with the stored salt and compares in constant time
userSchema.methods.isPasswordCorrect = function isPasswordCorrect(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
