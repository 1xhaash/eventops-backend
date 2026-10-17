import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'participant', 'organizer', 'admin'],
        default: 'participant'
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'approved', 'rejected', 'blocked'],
        default: 'active'
    },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date }
}, { timestamps: true });

export const userModel = mongoose.model("User", userSchema);