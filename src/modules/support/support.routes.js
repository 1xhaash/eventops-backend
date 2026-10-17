import express from "express";
import { verifyToken } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import {
  createTicketSchema,
  updateTicketSchema,
} from "./support.validation.js";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
} from "./support.controller.js";

const router = express.Router();

router.post(
  "/api/tickets",
  verifyToken,
  validate(createTicketSchema),
  createTicket,
);

router.get("/api/tickets", verifyToken, getTickets);

router.get("/api/tickets/:id", verifyToken, getTicketById);

router.patch(
  "/api/tickets/:id",
  verifyToken,
  validate(updateTicketSchema),
  updateTicket,
);

export const supportTicketRoutes = router;
export default router;
