export const USER_ROLES = ["customer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserDoc {
  _id: unknown;
  email: string;
  name?: string;
  passwordHash?: string;
  provider?: "password" | "google";
  googleId?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}
