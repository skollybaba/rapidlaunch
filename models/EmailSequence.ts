import mongoose from 'mongoose';

const EmailSequenceStepSchema = new mongoose.Schema(
  {
    index: {
      type: Number,
      required: true,
      min: 0,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    triggerType: {
      type: String,
      required: true,
      enum: ['immediate', 'after_hours'],
      default: 'after_hours',
    },
    delayHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sendAtHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const EmailSequenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
    totalSteps: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },

    steps: {
      type: [EmailSequenceStepSchema],
      required: true,
      validate: {
        validator: (steps: unknown[]) => Array.isArray(steps) && steps.length >= 1,
        message: 'At least one step is required',
      },
    },
  },
  {
    timestamps: true,
  }
);

EmailSequenceSchema.index({ productId: 1 });
EmailSequenceSchema.index({ active: 1 });
EmailSequenceSchema.index({ createdAt: -1 });

export const EmailSequence =
  mongoose.models.EmailSequence ||
  mongoose.model('EmailSequence', EmailSequenceSchema);

export default EmailSequence;
