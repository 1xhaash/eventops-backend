import joi from "joi";

const objectId = joi
  .string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required();

export const eventIdValidation = joi.object({
  id: objectId,
});

export const createBookingValidation = joi.object({
  seat: objectId,
});

export const cancelBookingValidation = joi.object({
  id: objectId,
});
