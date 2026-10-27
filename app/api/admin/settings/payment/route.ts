import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isProviderConfigured } from "@/lib/providers/payment";
import {
  getDisplaySettings,
  getSelectedPaymentProvider,
  resolvePaymentProvider,
  setDisplaySettings,
  setPaymentProvider,
} from "@/lib/services/payment-settings-service";
import { PAYMENT_PROVIDER_SETTINGS } from "@/types/payment";

export const runtime = "nodejs";

const updatePaymentSettingsSchema = z
  .object({
    provider: z.enum(PAYMENT_PROVIDER_SETTINGS).optional(),
    displayCurrency: z.enum(["NGN", "USD", "AUTO", "LOCATION"]).optional(),
    ngnPerUsd: z.coerce.number().positive().optional(),
    usdPerNaira: z.coerce.number().positive().optional(),
  })
  .strict();

async function currentAdmin(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId),
    } as const;
  }
  if (user.role !== "admin") {
    return { error: apiError(403, "FORBIDDEN", "Admins only.", requestId) } as const;
  }
  return { user } as const;
}

async function paymentSettingsPayload() {
  const resolved = await resolvePaymentProvider();
  const selectedProvider = await getSelectedPaymentProvider();
  const display = await getDisplaySettings();
  return {
    provider: selectedProvider,
    effectiveProvider: resolved.provider,
    fellBack: resolved.fellBack,
    paystackConfigured: isProviderConfigured("paystack"),
    bachsConfigured: isProviderConfigured("bachs"),
    displayCurrency: display.displayCurrency,
    ngnPerUsd: display.ngnPerUsd,
    usdPerNaira: display.usdPerNaira,
  };
}

export async function GET() {
  const requestId = newRequestId();
  const auth = await currentAdmin(requestId);
  if ("error" in auth) return auth.error;

  try {
    return apiOk(await paymentSettingsPayload());
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = newRequestId();
  const auth = await currentAdmin(requestId);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON",
      requestId
    );
  }

  try {
    const parsed = updatePaymentSettingsSchema.parse(body);
    if (parsed.provider) {
      await setPaymentProvider(parsed.provider, auth.user.email);
    }
    if (
      parsed.displayCurrency !== undefined ||
      parsed.ngnPerUsd !== undefined ||
      parsed.usdPerNaira !== undefined
    ) {
      await setDisplaySettings(
        {
          displayCurrency: parsed.displayCurrency,
          ngnPerUsd: parsed.ngnPerUsd,
          usdPerNaira: parsed.usdPerNaira,
        },
        auth.user.email
      );
    }
    return apiOk(await paymentSettingsPayload());
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
