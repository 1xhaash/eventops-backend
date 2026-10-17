import {
  eventIdValidation,
  createBookingValidation,
  cancelBookingValidation,
} from "../modules/booking/booking.validation.js";

export const validateEventId = (req, res, next) => {
  const { error, value } = eventIdValidation.validate(req.params, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid event id",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.params = value;
  next();
};

export const validateCreateBooking = (req, res, next) => {
  const { error, value } = createBookingValidation.validate(req.body, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking data",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.body = value;
  next();
};

export const validateCancelBooking = (req, res, next) => {
  const { error, value } = cancelBookingValidation.validate(req.params, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking id",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.params = value;
  next();
};
