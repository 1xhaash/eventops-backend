import mongoose from "mongoose";
import { userModel } from "../../../db/models/users.model.js";
import Event from "../../../db/models/eventModel.js";
import { bookingModel } from "../../../db/models/booking.model.js";
import { organizerApplicationModel } from "../../../db/models/organizerApplicationModel.js";

const getCollectionStats = async (model, dimensions) => {
  const facets = { total: [{ $count: "count" }] };

  for (const [key, field] of Object.entries(dimensions)) {
    facets[key] = [
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];
  }

  const [result = {}] = await model.aggregate([{ $facet: facets }]);
  const stats = { total: result.total?.[0]?.count ?? 0 };

  for (const key of Object.keys(dimensions)) {
    stats[key] = Object.fromEntries(
      (result[key] || []).map(({ _id, count }) => [_id ?? "unknown", count]),
    );
  }

  return stats;
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!["active", "blocked", "pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, blocked, pending, approved, or rejected",
      });
    }

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [users, events, bookings, organizerApplications] = await Promise.all([
      getCollectionStats(userModel, { byRole: "role", byStatus: "status" }),
      getCollectionStats(Event, { byVisibility: "visibility", byStatus: "status" }),
      getCollectionStats(bookingModel, { byStatus: "status" }),
      getCollectionStats(organizerApplicationModel, { byStatus: "status" }),
    ]);

    const [revenueAgg = {}] = await bookingModel.aggregate([
      { $match: { status: "confirmed" } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "ev",
        },
      },
      { $unwind: "$ev" },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$ev.price" },
          ticketsSold: { $sum: 1 },
        },
      },
    ]);

    const topEvents = await bookingModel.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$event", sold: { $sum: 1 } } },
      { $sort: { sold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "ev",
        },
      },
      { $unwind: "$ev" },
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          title: "$ev.title",
          price: "$ev.price",
          sold: 1,
        },
      },
    ]);

    const revenueByMonth = await bookingModel.aggregate([
      { $match: { status: "confirmed" } },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "ev",
        },
      },
      { $unwind: "$ev" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$ev.price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const recentApplications = await organizerApplicationModel
      .find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: {
        users,
        events,
        bookings,
        organizerApplications,
        revenue: revenueAgg.revenue ?? 0,
        ticketsSold: revenueAgg.ticketsSold ?? 0,
        topEvents,
        revenueByMonth,
        recentApplications,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllEvents = async (req, res, next) => {
  try {
    const events = await Event.find({})
      .populate("organizer", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: events,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;

    if (req.query.search) {
      const safe = String(req.query.search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const total = await userModel.countDocuments(filter);

    const users = await userModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
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
