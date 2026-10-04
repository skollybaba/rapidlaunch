import { Schema, model, type Model } from "mongoose";

import { ENROLLMENT_STATUSES, type EnrollmentDoc } from "@/types/lms";

const EnrollmentSchema = new Schema<EnrollmentDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    sourceOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    isBonus: { type: Boolean, default: false },
    completedLessonIds: { type: [String], default: [] },
    lastLessonId: { type: String, default: null },
    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One enrollment per student per course. Re-enrolling after a REVOKED access
// grant must update the existing record rather than create a second one.
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ userId: 1, status: 1 });
EnrollmentSchema.index({ courseId: 1, status: 1 });

export const Enrollment: Model<EnrollmentDoc> = model<EnrollmentDoc>(
  "Enrollment",
  EnrollmentSchema,
  undefined,
  { overwriteModels: true }
);

export default Enrollment;