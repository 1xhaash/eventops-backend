import express from "express";

import {
  getSeats,
  createBooking,
  getMyBookings,
  cancelBooking,
  cancelMyBooking,
} from "./booking.controller.js";

import {
  validateEventId,
  validateCreateBooking,
  validateCancelBooking,
} from "../../middleware/booking.middleware.js";

import {
  verifyToken,
  verifyTokenIfPresent,
  verifyOrganizer,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/events/:id/seats", verifyTokenIfPresent, validateEventId, getSeats);

router.post(
  "/events/:id/bookings",
  verifyToken,
  validateEventId,
  validateCreateBooking,
  createBooking,
);

router.get("/bookings/me", verifyToken, getMyBookings);

router.patch(
  "/bookings/:id/cancel",
  verifyToken,
  validateCancelBooking,
  cancelMyBooking,
);

router.patch(
  "/organizer/bookings/:id/cancel",
  verifyToken,
  verifyOrganizer,
  validateCancelBooking,
  cancelBooking,
);

export default router;
