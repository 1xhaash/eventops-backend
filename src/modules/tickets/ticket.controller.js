import crypto from "node:crypto";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import Ticket from "../../../db/models/ticket.model.js";
import Event from "../../../db/models/eventModel.js";
import { bookingModel as Booking } from "../../../db/models/booking.model.js";
import { seatModel } from "../../../db/models/seat.model.js";
import { userModel } from "../../../db/models/users.model.js";
import { sendTicketEmail } from "../../service/email.service.js";

// لازم نستورد الموديلات اللي بنعمل عليها populate (Seat / User) عشان Mongoose
// يكون مسجّل الـ Models قبل تنفيذ الاستعلامات.
void seatModel;
void userModel;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// توليد QR Token عشوائي آمن (مش Math.random)
const generateQrToken = () => crypto.randomBytes(24).toString("hex");

// تحويل الـ Token لصورة QR (Data URL) عند الحاجة، من غير ما نخزّنها في الداتابيز
const buildQrDataUrl = (qrToken) =>
  QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 300,
  });

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * إنشاء التذكرة بعد تأكيد الحجز والدفع.
 * العملية Idempotent: لو التذكرة موجودة بترجعها زي ما هي.
 */
export const issueTicketForBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate("user", "name email")
    .populate("event", "title");

  if (!booking) {
    throw httpError(404, "Booking not found");
  }

  if (booking.status !== "confirmed") {
    throw httpError(409, "Ticket can only be issued for a confirmed booking");
  }

  let ticket = await Ticket.findOne({ booking: booking._id });

  if (!ticket) {
    try {
      ticket = await Ticket.create({
        booking: booking._id,
        event: booking.event?._id ?? booking.event,
        user: booking.user?._id ?? booking.user,
        qrToken: generateQrToken(),
        status: "valid",
      });
    } catch (error) {
      // لو حصل تسابق على نفس الحجز، نرجّع التذكرة اللي اتعملت بالفعل
      if (error?.code === 11000) {
        ticket = await Ticket.findOne({ booking: booking._id });
      } else {
        throw error;
      }
    }

    if (ticket && booking.user?.email && booking.event?.title) {
      const qrCodeDataUrl = await buildQrDataUrl(ticket.qrToken);
      await sendTicketEmail(
        booking.user.email,
        booking.event.title,
        ticket.qrToken,
        qrCodeDataUrl,
      );
    }
  }

  return ticket;
};

/**
 * GET /api/bookings/:id/ticket
 * صاحب الحجز (أو الـ Admin) بس هو اللي يقدر يجيب التذكرة.
 */
export const getBookingTicket = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isOwner = String(booking.user) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "You are not allowed to view this ticket" });
    }

    const ticket = await issueTicketForBooking(id);
    const qrCode = await buildQrDataUrl(ticket.qrToken);

    return res.status(200).json({
      success: true,
      message: "Ticket retrieved successfully",
      data: { ...ticket.toObject(), qrCode },
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

/**
 * POST /api/events/:id/check-in
 * التحقق من الـ QR وتسجيل الحضور مرة واحدة فقط بشكل Atomic.
 */
export const checkInTicket = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const event = await Event.findOne({ _id: id, organizer: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const { qrToken } = req.body;
    const ticket = await Ticket.findOne({ qrToken }).populate("booking", "status");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (String(ticket.event) !== String(event._id)) {
      return res
        .status(400)
        .json({ success: false, message: "Ticket does not belong to this event" });
    }

    if (ticket.status === "revoked") {
      return res.status(400).json({ success: false, message: "Ticket has been revoked" });
    }

    if (ticket.status === "used") {
      return res
        .status(409)
        .json({ success: false, message: "Ticket already checked in" });
    }

    if (!ticket.booking || ticket.booking.status !== "confirmed") {
      return res
        .status(409)
        .json({ success: false, message: "Booking is not confirmed" });
    }

    // تحديث ذرّي: يمنع تسجيل الحضور مرتين حتى مع الطلبات المتزامنة
    const checkedIn = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: "valid" },
      { $set: { status: "used", checkedInAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!checkedIn) {
      return res
        .status(409)
        .json({ success: false, message: "Ticket already checked in" });
    }

    return res.status(200).json({
      success: true,
      message: "Check-in successful",
      data: checkedIn,
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/:id/participants
 * قائمة المشاركين المؤكدين في الفعالية.
 */
export const getEventParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const event = await Event.findOne({ _id: id, organizer: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const bookings = await Booking.find({ event: event._id, status: "confirmed" })
      .populate("user", "name email")
      .populate("seat", "label")
      .sort({ createdAt: 1 });

    const tickets = await Ticket.find({ event: event._id });
    const ticketByBooking = new Map(
      tickets.map((ticket) => [String(ticket.booking), ticket]),
    );

    const participants = bookings.map((booking) => {
      const ticket = ticketByBooking.get(String(booking._id));

      return {
        booking: booking._id,
        user: booking.user,
        seat: booking.seat?.label ?? null,
        ticketStatus: ticket?.status ?? "not_issued",
        checkedInAt: ticket?.checkedInAt ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Participants retrieved successfully",
      data: {
        event: {
          _id: event._id,
          title: event.title,
          capacity: event.capacity,
          startsAt: event.startsAt,
        },
        count: participants.length,
        participants,
      },
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/:id/reports
 * ملخّص تقرير الفعالية (حجوزات + حضور + إيراد).
 */
export const getEventReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const event = await Event.findOne({ _id: id, organizer: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const [bookingsByStatus, ticketsIssued, checkedIn] = await Promise.all([
      Booking.aggregate([
        { $match: { event: event._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ event: event._id }),
      Ticket.countDocuments({ event: event._id, status: "used" }),
    ]);

    const statusCount = (status) =>
      bookingsByStatus.find((item) => item._id === status)?.count ?? 0;

    const confirmedBookings = statusCount("confirmed");

    return res.status(200).json({
      success: true,
      message: "Report generated successfully",
      data: {
        event: {
          _id: event._id,
          title: event.title,
          capacity: event.capacity,
          price: event.price,
          status: event.status,
        },
        capacity: event.capacity,
        bookings: {
          confirmed: confirmedBookings,
          pendingPayment: statusCount("pending_payment"),
          cancelled: statusCount("cancelled"),
          expired: statusCount("expired"),
        },
        tickets: {
          issued: ticketsIssued,
          checkedIn,
          notCheckedIn: ticketsIssued - checkedIn,
        },
        revenue: confirmedBookings * event.price,
      },
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/:id/reports/export
 * تصدير تقرير الفعالية كملف Excel باستخدام ExcelJS.
 */
export const exportEventReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const event = await Event.findOne({ _id: id, organizer: req.user._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const bookings = await Booking.find({ event: event._id, status: "confirmed" })
      .populate("user", "name email")
      .populate("seat", "label")
      .sort({ createdAt: 1 });

    const tickets = await Ticket.find({ event: event._id });
    const ticketByBooking = new Map(
      tickets.map((ticket) => [String(ticket.booking), ticket]),
    );

    const checkedIn = tickets.filter((ticket) => ticket.status === "used").length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "EventOps";
    workbook.created = new Date();

    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Metric", key: "metric", width: 28 },
      { header: "Value", key: "value", width: 32 },
    ];
    summary.addRows([
      { metric: "Event", value: event.title },
      { metric: "Event ID", value: String(event._id) },
      { metric: "Starts At", value: new Date(event.startsAt).toISOString() },
      { metric: "Capacity", value: event.capacity },
      { metric: "Confirmed Bookings", value: bookings.length },
      { metric: "Tickets Issued", value: tickets.length },
      { metric: "Checked In", value: checkedIn },
      { metric: "Not Checked In", value: tickets.length - checkedIn },
      { metric: "Revenue", value: bookings.length * event.price },
    ]);
    summary.getRow(1).font = { bold: true };

    const sheet = workbook.addWorksheet("Participants");
    sheet.columns = [
      { header: "#", key: "index", width: 6 },
      { header: "Name", key: "name", width: 26 },
      { header: "Email", key: "email", width: 30 },
      { header: "Seat", key: "seat", width: 10 },
      { header: "Booking ID", key: "booking", width: 26 },
      { header: "Ticket Status", key: "ticketStatus", width: 16 },
      { header: "Checked In At", key: "checkedInAt", width: 26 },
    ];
    sheet.getRow(1).font = { bold: true };

    bookings.forEach((booking, index) => {
      const ticket = ticketByBooking.get(String(booking._id));

      sheet.addRow({
        index: index + 1,
        name: booking.user?.name ?? "",
        email: booking.user?.email ?? "",
        seat: booking.seat?.label ?? "",
        booking: String(booking._id),
        ticketStatus: ticket?.status ?? "not_issued",
        checkedInAt: ticket?.checkedInAt
          ? new Date(ticket.checkedInAt).toISOString()
          : "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="event-${event._id}-report.xlsx"`,
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    if (res.headersSent) {
      return res.end();
    }
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};
