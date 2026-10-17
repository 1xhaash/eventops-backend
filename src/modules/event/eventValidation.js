import Joi from "joi";

const invitedEmail = Joi.string().trim().lowercase().email();

export const createEventValidation = Joi.object({
  title: Joi.string().trim().min(3).max(100).required(),

  description: Joi.string().trim().min(10).required(),

  venue: Joi.string().trim().min(3).required(),

  startsAt: Joi.date().iso().required(),

  endsAt: Joi.date().iso().greater(Joi.ref("startsAt")).required(),

  registrationDeadline: Joi.date().iso().max(Joi.ref("startsAt")).required(),

  capacity: Joi.number().integer().min(1).required(),

  price: Joi.number().min(0).required(),

  visibility: Joi.string().valid("public", "private").required(),

  invitedEmails: Joi.when("visibility", {
    is: "private",
    then: Joi.array().items(invitedEmail).unique().default([]),
    otherwise: Joi.array().max(0).default([]),
  }),
});

export const updateEventValidation = Joi.object({
  title: Joi.string().trim().min(3).max(100),

  description: Joi.string().trim().min(10),

  venue: Joi.string().trim().min(3),

  startsAt: Joi.date().iso(),

  endsAt: Joi.date().iso(),

  registrationDeadline: Joi.date().iso(),

  capacity: Joi.number().integer().min(1),

  price: Joi.number().min(0),

  visibility: Joi.string().valid("public", "private"),

  invitedEmails: Joi.when("visibility", {
    is: "public",
    then: Joi.array().max(0),
    otherwise: Joi.array().items(invitedEmail).unique(),
  }),

  removeInvitedEmails: Joi.when("visibility", {
    is: "public",
    then: Joi.array().max(0),
    otherwise: Joi.array().items(invitedEmail).unique(),
  }),
})
  .min(1)
  .unknown(false);

export const eventQueryValidation = Joi.object({
  search: Joi.string().trim().allow(""),
  venue: Joi.string().trim().allow(""),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  startsAfter: Joi.date().iso(),
  startsBefore: Joi.date().iso(),
  sort: Joi.string().valid("price", "-price", "-startsAt"),
  organizer: Joi.alternatives().try(
    Joi.string().valid("me"),
    Joi.string().length(24).hex(),
  ),
}).unknown(false);

export const inviteUsersValidation = Joi.object({
  invitedEmails: Joi.array().items(invitedEmail).min(1).unique().required(),
})
  .unknown(false)
  .required();

export const inviteEventIdValidation = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required();
