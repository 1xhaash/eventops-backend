import { checkInValidation } from "../modules/tickets/ticket.validation.js";

export const validateCheckIn = (req, res, next) => {
  const { error, value } = checkInValidation.validate(req.body, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid check-in data",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.body = value;
  next();
};
