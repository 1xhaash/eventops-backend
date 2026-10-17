import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["available", "held", "booked"],
            default: "available",
            required: true,
        },
        heldBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        holdExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

seatSchema.index({ event: 1, label: 1 }, { unique: true });

export const seatModel = mongoose.model("Seat", seatSchema);
