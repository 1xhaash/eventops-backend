import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    provider: {
      type: String,
      enum: ['mock', 'paymob', 'stripe'],
      required: true,
      default: 'mock',
    },
    // Reference ID from the payment provider (unique when present)
    providerRef: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values (no providerRef for mock)
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
    },
    net: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;