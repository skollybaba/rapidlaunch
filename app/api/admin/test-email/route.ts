import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { MailProviderError, createMailAdapter } from "@/lib/providers/mail";

export const runtime = "nodejs";

export async function POST() {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user)
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin")
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  try {
    await createMailAdapter().sendTestEmail();
    return apiOk({});
  } catch (error) {
    if (error instanceof MailProviderError) {
      if (error.code === "SMTP_NOT_CONFIGURED") {
        return apiError(
          502,
          "MAIL_SEND_FAILED",
          "SMTP is not configured on this server. Set GOOGLE_SMTP_USER and GOOGLE_SMTP_PASSWORD in the environment.",
          requestId
        );
      }
      return apiError(
        502,
        "MAIL_SEND_FAILED",
        `Could not send the test email (${error.code}).${error.message.replace(
          "Could not send email",
          ""
        )}`,
        requestId
      );
    }
    return handleApiError(error, requestId);
  }
}