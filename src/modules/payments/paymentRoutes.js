import { Router } from 'express';
import * as paymentController from './paymentController.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  initiatePaymentSchema,
  transactionIdParamSchema,
  bookingIdParamSchema,
  webhookSchema,
} from './payment.validation.js';

const paymentRouter = Router();

// POST /api/payments/initiate — start a payment for a booking
paymentRouter.post(
  '/initiate',
  validate(initiatePaymentSchema, 'body'),
  paymentController.initiatePayment
);

// POST /api/payments/mock-confirm/:transactionId — simulate payment success (mock only)
paymentRouter.post(
  '/mock-confirm/:transactionId',
  validate(transactionIdParamSchema, 'params'),
  paymentController.mockConfirmPayment
);

// GET /api/payments/booking/:bookingId — get transaction linked to a booking
paymentRouter.get(
  '/booking/:bookingId',
  validate(bookingIdParamSchema, 'params'),
  paymentController.getTransactionByBooking
);

// GET /api/payments/:transactionId — get a single transaction by ID
paymentRouter.get(
  '/:transactionId',
  validate(transactionIdParamSchema, 'params'),
  paymentController.getTransactionById
);

// POST /api/payments/webhook/paymob — real gateway webhook (Paymob)
paymentRouter.post(
  '/webhook/paymob',
  validate(webhookSchema, 'body'),
  paymentController.handleWebhook
);

// POST /api/payments/webhook/stripe — real gateway webhook (Stripe)
paymentRouter.post(
  '/webhook/stripe',
  validate(webhookSchema, 'body'),
  paymentController.handleWebhook
);

export default paymentRouter;