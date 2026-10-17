
import {
  createEventValidation,
  updateEventValidation,
  eventQueryValidation,
  inviteUsersValidation,
  inviteEventIdValidation,
} from "../modules/event/eventValidation.js";


export const validateEventQuery = (req, res, next) => {
  const { error, value } = eventQueryValidation.validate(req.query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid event query parameters",
      errors: error.details.map((detail) => detail.message),
    });
  }

  if (
    value.minPrice !== undefined &&
    value.maxPrice !== undefined &&
    value.minPrice > value.maxPrice
  ) {
    return res.status(400).json({
      success: false,
      message: "Minimum price cannot be greater than maximum price",
    });
  }

  if (
    value.startsAfter &&
    value.startsBefore &&
    value.startsAfter > value.startsBefore
  ) {
    return res.status(400).json({
      success: false,
      message: "Start date range is invalid",
    });
  }

  req.validatedQuery = value;
  next();
};



export const validateCreateEvent = (req, res, next) => {
  const { error, value } = createEventValidation.validate(req.body, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid event data",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.body = value;

  next();
};

export const validateUpdateEvent = (req, res, next) => {
  const { error, value } = updateEventValidation.validate(req.body, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid event data",
      errors: error.details.map((detail) => detail.message),
    });
  }

  req.body = value;

  next();
};

export const validateInviteUsers = (req, res, next) => {
  const { error: idError } = inviteEventIdValidation.validate(req.params?.id);
  const { error, value } = inviteUsersValidation.validate(req.body, {
    abortEarly: false,
    convert: true,
  });

  if (idError || error) {
    return res.status(400).json({
      success: false,
      message: "Invalid invitation data",
      errors: [
        ...(idError ? ["Event ID must be a 24-character hexadecimal ObjectId"] : []),
        ...(error ? error.details.map((detail) => detail.message) : []),
      ],
    });
  }

  req.body = value;
  next();
};
