import Joi from 'joi';

// Helper: validate MongoDB ObjectId format
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format — must be a 24-character hex string' });

// POST /api/payments/initiate
export const initiatePaymentSchema = Joi.object({
  bookingId: objectId.required().messages({ 'any.required': 'bookingId is required' }),
  amount: Joi.number().min(0).required().messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount must be 0 or more',
    'any.required': 'Amount is required',
  }),
  provider: Joi.string().valid('mock', 'paymob', 'stripe').default('mock'),
});

// Params: :transactionId
export const transactionIdParamSchema = Joi.object({
  transactionId: objectId.required().messages({ 'any.required': 'transactionId is required' }),
});

// Params: :bookingId
export const bookingIdParamSchema = Joi.object({
  bookingId: objectId.required().messages({ 'any.required': 'bookingId is required' }),
});

// POST /api/payments/webhook/paymob or /stripe
export const webhookSchema = Joi.object({
  providerRef: Joi.string().required().messages({ 'any.required': 'providerRef is required' }),
  status: Joi.string().valid('succeeded', 'failed', 'refunded').required().messages({
    'any.only': 'status must be one of: succeeded, failed, refunded',
    'any.required': 'status is required',
  }),
  provider: Joi.string().valid('paymob', 'stripe').required().messages({
    'any.required': 'provider is required',
  }),
}).unknown(true); // allow extra fields from real gateway payloads