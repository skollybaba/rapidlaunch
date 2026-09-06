import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { env } from "@/lib/env";
import {
  createMailAdapter,
  MailProviderError,
} from "@/lib/providers/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(value: string | undefined) {
  if (!value) return undefined;
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
  }
  return `${value.slice(0, 2)}${"*".repeat(Math.max(3, value.length - 2))}`;
}

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const secret = request.nextUrl.searchParams.get("secret") ?? "";
  if (secret !== env.REMINDER_CRON_SECRET) {
    return apiError(401, "UNAUTHORIZED", "Missing or invalid secret.", requestId);
  }

  const user = env.GOOGLE_SMTP_USER;
  const target = env.MAIL_FROM_EMAIL ?? user;

  if (!user || !env.GOOGLE_SMTP_PASSWORD || !target) {
    return apiOk({
      configured: false,
      host: env.GOOGLE_SMTP_HOST,
      port: env.GOOGLE_SMTP_PORT,
      user: mask(user),
      fromEmail: mask(env.MAIL_FROM_EMAIL),
      smtpUserMatchesFrom:
        Boolean(env.MAIL_FROM_EMAIL && user === env.MAIL_FROM_EMAIL),
    });
  }

  const adapter = createMailAdapter();
  const startedAt = Date.now();

  try {
    await adapter.sendEmail({
      to: target,
      subject: "Rapid Launch SMTP diagnostic",
      html: "<p>This is a latency probe from the SMTP diagnostic endpoint.</p>",
      text: "This is a latency probe from the SMTP diagnostic endpoint.",
    });
    return apiOk({
      configured: true,
      host: env.GOOGLE_SMTP_HOST,
      port: env.GOOGLE_SMTP_PORT,
      user: mask(user),
      fromEmail: mask(env.MAIL_FROM_EMAIL),
      smtpUserMatchesFrom:
        Boolean(env.MAIL_FROM_EMAIL && user === env.MAIL_FROM_EMAIL),
      sentTo: mask(target),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (error instanceof MailProviderError) {
      return apiOk({
        configured: true,
        host: env.GOOGLE_SMTP_HOST,
        port: env.GOOGLE_SMTP_PORT,
        user: mask(user),
        fromEmail: mask(env.MAIL_FROM_EMAIL),
        smtpUserMatchesFrom:
          Boolean(env.MAIL_FROM_EMAIL && user === env.MAIL_FROM_EMAIL),
        latencyMs: Date.now() - startedAt,
        error: { code: error.code, retryable: error.retryable },
      });
    }
    throw error;
  }
}