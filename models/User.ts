import { Schema, model, models, type Model } from "mongoose";

import { USER_ROLES, type UserDoc } from "@/types/user";

const UserSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    passwordHash: { type: String },
    provider: {
      type: String,
      enum: ["password", "google"],
      default: "password",
    },
    googleId: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
    },
  },
  { timestamps: true }
);

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);

export default User;
