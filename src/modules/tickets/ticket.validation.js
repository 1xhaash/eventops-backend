import Joi from "joi";

export const checkInValidation = Joi.object({
  qrToken: Joi.string().trim().min(8).max(128).required(),
});
