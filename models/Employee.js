const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
    {
        first_name: { type: String, required: [true, 'first_name is required'], trim: true, maxlength: 50 },
        last_name: { type: String, required: [true, 'last_name is required'], trim: true, maxlength: 50 },
        email: {
            type: String,
            required: [true, 'email is required'],
            trim: true,
            lowercase: true,
            maxlength: 254,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'],
        },
        position: { type: String, required: [true, 'position is required'], trim: true, maxlength: 100 },
        salary: { type: Number, required: [true, 'salary is required'], min: [0.01, 'salary must be positive'] },
        date_of_joining: { type: Date, required: [true, 'date_of_joining is required'] },
        department: { type: String, required: [true, 'department is required'], trim: true, maxlength: 100 },

        // The owner: the user who created this employee. This is the User -> Employee relationship.
        // It is always set from the verified JWT on the server, never from the request body.
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true, // every employee query filters by owner, so index it
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        versionKey: false,
    }
);

// Two different users may both have an employee with the same email,
// but one user can't add the same employee email twice (-> 409 Conflict).
employeeSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
