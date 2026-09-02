import "server-only";

import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().default("quicklaunch"),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CLASSROOM_OWNER_EMAIL: z.string().email().optional(),
  GOOGLE_CALENDAR_OWNER_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().optional()
  ),
  GOOGLE_CALENDAR_ORGANIZER_NAME: z.string().default("Agile Minds Hub"),
  GOOGLE_CALENDAR_TIME_ZONE: z.string().default("Africa/Lagos"),
  GOOGLE_CALENDAR_WORK_START: z.string().default("09:00"),
  GOOGLE_CALENDAR_WORK_END: z.string().default("17:00"),
  GOOGLE_SMTP_HOST: z.string().default("smtp.gmail.com"),
  GOOGLE_SMTP_PORT: z.coerce.number().default(465),
  GOOGLE_SMTP_USER: z.string().optional(),
  GOOGLE_SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM_NAME: z.string().default("Agile Minds Hub"),
  MAIL_FROM_EMAIL: z.string().email().optional(),
  REMINDER_CRON_SECRET: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
  throw new Error(`Invalid server environment configuration: ${details}`);
}

const data = parsed.data;

const authSecret = data.AUTH_SECRET ?? data.NEXTAUTH_SECRET;

if (data.NODE_ENV === "production" && !authSecret) {
  throw new Error(
    "Missing NEXTAUTH_SECRET (or AUTH_SECRET) in production environment"
  );
}

export const env = {
  ...data,
  authSecret,
  isProduction: data.NODE_ENV === "production",
} as const;

export type ServerEnv = typeof env;