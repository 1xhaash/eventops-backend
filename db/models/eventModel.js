
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    venue: {
      type: String,
      required: true,
      trim: true,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startsAt;
        },
        message: "Event end time must be after start time",
      },
    },

    registrationDeadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value <= this.startsAt;
        },
        message:
          "Registration deadline must be before or at the event start time",
      },
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a positive integer",
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      required: true,
    },

    invitedEmails: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  },
);

const Event = mongoose.model('Event', eventSchema);

export default Event;

