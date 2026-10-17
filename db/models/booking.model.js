import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        seat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seat",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending_payment", "confirmed", "cancelled", "expired"],
            default: "pending_payment",
            required: true,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

bookingSchema.index(
    { event: 1, user: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ["pending_payment", "confirmed"] },
        },
    },
);

bookingSchema.index(
    { event: 1, seat: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ["pending_payment", "confirmed"] },
        },
    },
);

export const bookingModel = mongoose.model("Booking", bookingSchema);
