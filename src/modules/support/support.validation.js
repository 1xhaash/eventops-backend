import Joi from "joi";

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid ID format" });

export const createTicketSchema = Joi.object({
  subject: Joi.string().trim().min(3).max(120).required(),
  message: Joi.string().trim().min(5).max(2000).required(),
  relatedBooking: objectId.optional().allow(null, ""),
});

export const updateTicketSchema = Joi.object({
  status: Joi.string()
    .valid("open", "in_progress", "resolved", "closed")
    .optional(),
  message: Joi.string().trim().min(1).max(2000).optional(),
})
  .min(1)
  .messages({ "object.min": "Provide a status or a message to update" });

export const ticketIdParamSchema = Joi.object({
  id: objectId.required(),
});
