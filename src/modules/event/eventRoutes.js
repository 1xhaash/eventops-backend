
import express from "express";

import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  cancelEvent,
  inviteUsersToEvent,
} from "./eventController.js";

import {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventQuery,
  validateInviteUsers,
} from "../../middleware/eventMiddleware.js";

import {
  verifyToken,
  verifyTokenIfPresent,
  verifyOrganizer,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  verifyOrganizer,
  validateCreateEvent,
  createEvent,
);
router.get("/", verifyTokenIfPresent, validateEventQuery, getAllEvents);

router.get("/:id", verifyTokenIfPresent, getEventById);

router.patch(
  "/:id",
  verifyToken,
  verifyOrganizer,
  validateUpdateEvent,
  updateEvent,
);

router.post("/:id/cancel", verifyToken, verifyOrganizer, cancelEvent);

// Added: Invite users to a private event
router.post(
  "/:id/invites",
  verifyToken,
  verifyOrganizer,
  validateInviteUsers,
  inviteUsersToEvent,
);

export default router;
