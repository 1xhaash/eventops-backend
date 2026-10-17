
import express from "express";
import { verifyToken, verifyAdmin } from "../../middleware/auth.middleware.js";
import {
  getAllEvents,
  getAllUsers,
  getDashboardStats,
  updateUserStatus,
} from "./admin.controller.js";

const router = express.Router();

// List / search users
router.get("/api/admin/users", verifyToken, verifyAdmin, getAllUsers);

// Update user status
router.patch(
  "/api/admin/users/:id/status",
  verifyToken,
  verifyAdmin,
  updateUserStatus
);

router.patch(
  "/api/admin/users/:id",
  verifyToken,
  verifyAdmin,
  updateUserStatus
);

// Dashboard statistics
router.get(
  "/api/admin/dashboard/stats",
  verifyToken,
  verifyAdmin,
  getDashboardStats
);

router.get(
  "/api/admin/stats",
  verifyToken,
  verifyAdmin,
  getDashboardStats
);

// List all events
router.get("/api/admin/events", verifyToken, verifyAdmin, getAllEvents);

export default router;
