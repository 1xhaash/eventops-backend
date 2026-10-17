import express from "express";
import { verifyToken, verifyOrganizer } from "../../middleware/auth.middleware.js";
import { validateCheckIn } from "../../middleware/ticketMiddleware.js";
import {
  getBookingTicket,
  checkInTicket,
  getEventParticipants,
  getEventReport,
  exportEventReport,
} from "./ticket.controller.js";

// مسارات الـ Organizer الخاصة بالتذاكر والحضور والتقارير
export const eventTicketRoutes = express.Router();

eventTicketRoutes.get(
  "/:id/participants",
  verifyToken,
  verifyOrganizer,
  getEventParticipants,
);

eventTicketRoutes.post(
  "/:id/check-in",
  verifyToken,
  verifyOrganizer,
  validateCheckIn,
  checkInTicket,
);

eventTicketRoutes.get(
  "/:id/reports",
  verifyToken,
  verifyOrganizer,
  getEventReport,
);

eventTicketRoutes.get(
  "/:id/reports/export",
  verifyToken,
  verifyOrganizer,
  exportEventReport,
);

// مسارات الـ Participant الخاصة بالتذكرة
export const bookingTicketRoutes = express.Router();

bookingTicketRoutes.get("/:id/ticket", verifyToken, getBookingTicket);

export default eventTicketRoutes;
