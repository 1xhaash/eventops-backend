import Event from "../../../db/models/eventModel.js";
import { seatModel } from "../../../db/models/seat.model.js";
import { bookingModel } from "../../../db/models/booking.model.js";
import Ticket from "../../../db/models/ticket.model.js";
import Transaction from "../payments/paymentModel.js";

const HOLD_MINUTES = 10;
const ACTIVE_STATUSES = ["pending_payment", "confirmed"];
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const ensureSeats = async (event) => {
  const existing = await seatModel.countDocuments({ event: event._id });

  if (existing > 0) return;

  const seats = Array.from({ length: event.capacity }, (_, i) => ({
    event: event._id,
    label: `S${i + 1}`,
  }));

  try {
    await seatModel.insertMany(seats, { ordered: false });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
};

const releaseExpiredHolds = async (filter = {}) => {
  const now = new Date();

  const expiredSeats = await seatModel
    .find({ ...filter, status: "held", holdExpiresAt: { $lt: now } })
    .select("_id");

  const seatIds = expiredSeats.map((seat) => seat._id);

  if (seatIds.length === 0) return;

  await seatModel.updateMany(
    { _id: { $in: seatIds } },
    { status: "available", heldBy: null, holdExpiresAt: null },
  );

  await bookingModel.updateMany(
    { seat: { $in: seatIds }, status: "pending_payment" },
    { status: "expired" },
  );
};

export const getSeats = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.visibility === "private") {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "You must be logged in to access this private event",
        });
      }

      const isOwner = String(event.organizer) === String(req.user._id);
      const userEmail = req.user.email?.trim().toLowerCase();
      const isInvited = (event.invitedEmails || []).some(
        (email) => email.trim().toLowerCase() === userEmail,
      );

      if (!isOwner && !isInvited) {
        return res.status(403).json({
          success: false,
          message: "You are not invited to this private event",
        });
      }
    }

    await ensureSeats(event);
    await releaseExpiredHolds({ event: event._id });

    const seats = await seatModel
      .find({ event: event._id })
      .collation({ locale: "en", numericOrdering: true })
      .sort({ label: 1 });

    return res.status(200).json({
      success: true,
      message: "Seats retrieved successfully",
      data: seats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve seats",
      errors: error.message,
    });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { seat: seatId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "This event is not open for booking",
      });
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed",
      });
    }

    if (event.visibility === "private") {
      const isOwner = String(event.organizer) === String(req.user._id);
      const userEmail = req.user.email?.trim().toLowerCase();
      const isInvited = (event.invitedEmails || []).some(
        (email) => email.trim().toLowerCase() === userEmail,
      );

      if (!isOwner && !isInvited) {
        return res.status(403).json({
          success: false,
          message: "You are not invited to this private event",
        });
      }
    }

    await ensureSeats(event);
    await releaseExpiredHolds({ event: event._id });

    const existingBooking = await bookingModel.findOne({
      event: event._id,
      user: userId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking for this event",
      });
    }

    const isFree = event.price === 0;
    const holdExpiresAt = isFree
      ? null
      : new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    const seat = await seatModel.findOneAndUpdate(
      { _id: seatId, event: event._id, status: "available" },
      {
        status: isFree ? "booked" : "held",
        heldBy: userId,
        holdExpiresAt,
      },
      { new: true },
    );

    if (!seat) {
      return res.status(409).json({
        success: false,
        message: "Seat is not available",
      });
    }

    try {
      const booking = await bookingModel.create({
        event: event._id,
        user: userId,
        seat: seat._id,
        status: isFree ? "confirmed" : "pending_payment",
        expiresAt: holdExpiresAt,
      });

      return res.status(201).json({
        success: true,
        message: isFree
          ? "Booking confirmed successfully"
          : "Seat held. Complete payment to confirm your booking",
        data: booking,
      });
    } catch (err) {
      await seatModel.updateOne(
        { _id: seat._id },
        { status: "available", heldBy: null, holdExpiresAt: null },
      );

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You already have an active booking for this event",
        });
      }

      throw err;
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
      errors: error.message,
    });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    await releaseExpiredHolds({ heldBy: req.user._id });

    const bookings = await bookingModel
      .find({ user: req.user._id })
      .populate("event")
      .populate("seat")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
      errors: error.message,
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await bookingModel.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const event = await Event.findById(booking.event);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (String(event.organizer) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel bookings for your own events",
      });
    }

    if (["cancelled", "expired"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    await booking.save();

    await seatModel.updateOne(
      { _id: booking.seat },
      { status: "available", heldBy: null, holdExpiresAt: null },
    );

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      errors: error.message,
    });
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * A participant cancels their OWN booking and gets refunded (mock):
 * frees the seat, revokes the ticket, marks the payment transaction as
 * refunded, and moves the booking to "cancelled". Allowed only until the
 * registration deadline (falls back to the event start when none is set).
 */
export const cancelMyBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own booking",
      });
    }

    if (["cancelled", "expired"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `This booking is already ${booking.status}`,
      });
    }

    const event = await Event.findById(booking.event);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This event has been cancelled by the organizer",
      });
    }

    // Cancellation window: until the registration deadline (or the event start).
    const deadline = new Date(event.registrationDeadline || event.startsAt);
    if (!isNaN(deadline) && new Date() > deadline) {
      return res.status(400).json({
        success: false,
        message: "You can no longer cancel this booking — the registration deadline has passed",
      });
    }

    // A ticket already scanned at the door can't be refunded.
    const ticket = await Ticket.findOne({ booking: booking._id });
    if (ticket && ticket.status === "used") {
      return res.status(409).json({
        success: false,
        message: "This ticket has already been checked in and can't be cancelled",
      });
    }

    // Release the seat.
    if (booking.seat) {
      await seatModel.updateOne(
        { _id: booking.seat },
        { status: "available", heldBy: null, holdExpiresAt: null },
      );
    }

    // Revoke the ticket (if any).
    if (ticket && ticket.status !== "revoked") {
      ticket.status = "revoked";
      await ticket.save();
    }

    // Refund the mock payment (succeeded → refunded, pending → failed).
    let refunded = false;
    let refundAmount = 0;
    const tx = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
    if (tx) {
      if (tx.status === "succeeded") {
        tx.status = "refunded";
        tx.refundedAt = new Date();
        await tx.save();
        refunded = true;
        refundAmount = tx.net ?? tx.amount ?? 0;
      } else if (tx.status === "pending") {
        tx.status = "failed";
        await tx.save();
      }
    }

    booking.status = "cancelled";
    booking.expiresAt = null;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: refunded
        ? "Booking cancelled — your payment has been refunded"
        : "Booking cancelled successfully",
      data: { booking, refunded, amount: refundAmount },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      errors: error.message,
    });
  }
};
