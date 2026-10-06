import mongoose from 'mongoose';

const EmailSequenceSubscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sequenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailSequence',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    currentStepIndex: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    nextSendAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    lastSentAt: {
      type: Date,
    },
    lastSentStepIndex: {
      type: Number,
    },
    failureCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    dispatchingAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

EmailSequenceSubscriptionSchema.index({
  sequenceId: 1,
  email: 1,
});
EmailSequenceSubscriptionSchema.index({ nextSendAt: 1, completedAt: 1, cancelledAt: 1 });
EmailSequenceSubscriptionSchema.index({ productId: 1 });
EmailSequenceSubscriptionSchema.index({ email: 1 });

export const EmailSequenceSubscription =
  mongoose.models.EmailSequenceSubscription ||
  mongoose.model('EmailSequenceSubscription', EmailSequenceSubscriptionSchema);

export default EmailSequenceSubscription;
