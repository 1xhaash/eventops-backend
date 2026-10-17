import mongoose from "mongoose";
import SupportTicket from "../../../db/models/supportTicket.model.js";
import { bookingModel } from "../../../db/models/booking.model.js";

const isAdmin = (user) => user && user.role === "admin";

/**
 * POST /api/tickets
 * Create a support ticket (any authenticated user).
 */
export const createTicket = async (req, res, next) => {
    try {
        const { subject, message, relatedBooking } = req.body;

        if (relatedBooking) {
            if (!mongoose.Types.ObjectId.isValid(relatedBooking)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid related booking ID",
                });
            }

            const booking = await bookingModel.findById(relatedBooking);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Related booking not found",
                });
            }

            const ownsBooking = String(booking.user) === String(req.user._id);

            if (!ownsBooking && !isAdmin(req.user)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only link your own bookings",
                });
            }
        }

        const ticket = await SupportTicket.create({
            user: req.user._id,
            subject,
            message,
            relatedBooking: relatedBooking || null,
            status: "open",
        });

        const populated = await SupportTicket.findById(ticket._id).populate(
            "user",
            "name email role",
        );

        return res.status(201).json({
            success: true,
            message: "Support ticket created successfully",
            data: populated,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/tickets
 * List tickets. Admin sees all (+ filters); a user sees only their own.
 */
export const getTickets = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const filter = {};

        if (!isAdmin(req.user)) {
            filter.user = req.user._id;
        }

        const allowedStatuses = ["open", "in_progress", "resolved", "closed"];

        if (req.query.status) {
            if (!allowedStatuses.includes(req.query.status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                    allowedStatuses,
                });
            }

            filter.status = req.query.status;
        }

        const total = await SupportTicket.countDocuments(filter);

        const tickets = await SupportTicket.find(filter)
            .populate("user", "name email role")
            .populate("relatedBooking", "status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: "Support tickets retrieved successfully",
            data: tickets,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/tickets/:id
 * Get a single ticket (owner or admin).
 */
export const getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ticket ID" });
        }

        const ticket = await SupportTicket.findById(id)
            .populate("user", "name email role")
            .populate("replies.author", "name email role")
            .populate("relatedBooking", "status");

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const owns = String(ticket.user?._id || ticket.user) === String(req.user._id);

        if (!owns && !isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        return res.status(200).json({
            success: true,
            message: "Ticket retrieved successfully",
            data: ticket,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * PATCH /api/tickets/:id
 * Admin: change status and/or add a reply.
 * Owner: add a follow-up message (does not change status).
 */
export const updateTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, message } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ticket ID" });
        }

        const ticket = await SupportTicket.findById(id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const owns = String(ticket.user) === String(req.user._id);

        if (!owns && !isAdmin(req.user)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        if (status !== undefined) {
            if (!isAdmin(req.user)) {
                return res.status(403).json({
                    success: false,
                    message: "Only admins can change ticket status",
                });
            }

            ticket.status = status;
        }

        if (message) {
            ticket.replies.push({
                author: req.user._id,
                authorRole: req.user.role,
                message,
            });
        }

        await ticket.save();

        const populated = await SupportTicket.findById(ticket._id)
            .populate("user", "name email role")
            .populate("replies.author", "name email role")
            .populate("relatedBooking", "status");

        return res.status(200).json({
            success: true,
            message: "Ticket updated successfully",
            data: populated,
        });
    } catch (error) {
        return next(error);
    }
};
