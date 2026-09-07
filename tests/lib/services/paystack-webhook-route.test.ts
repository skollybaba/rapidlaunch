import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { processPaystackWebhook, processPaystackWebhookEvent } = vi.hoisted(
  () => ({
    processPaystackWebhook: vi.fn(),
    processPaystackWebhookEvent: vi.fn(),
  })
);

const { afterMock } = vi.hoisted(() => ({ afterMock: vi.fn() }));

vi.mock("@/lib/services/order-service", () => ({
  processPaystackWebhook,
  processPaystackWebhookEvent,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: afterMock,
  };
});

import { POST } from "@/app/api/webhooks/paystack/route";
import { NextRequest } from "next/server";

function makeRequest(body: string, signature: string) {
  return new NextRequest("http://localhost/api/webhooks/paystack", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/webhooks/paystack", () => {
  it("returns 200 OK instantly and registers the background step for accepted events", async () => {
    processPaystackWebhook.mockResolvedValue({
      accepted: true,
      duplicate: false,
      requestId: "R1",
      event: "charge.success",
      eventKey: "charge.success:7",
      data: { id: 7 },
    });

    const response = await POST(makeRequest('{"event":"charge.success"}', "sig"));
    processPaystackWebhookEvent.mockResolvedValue(undefined);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(processPaystackWebhook).toHaveBeenCalledWith(
      '{"event":"charge.success"}',
      "sig"
    );
    expect(afterMock).toHaveBeenCalledTimes(1);

    const callback = afterMock.mock.calls[0][0] as () => Promise<void>;
    await callback();
    expect(processPaystackWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "R1" })
    );
  });

  it("never schedules background processing for a rejected webhook", async () => {
    processPaystackWebhook.mockResolvedValue({
      accepted: false,
      reason: "INVALID_SIGNATURE",
      requestId: "R2",
    });

    const response = await POST(makeRequest("{}", "bad"));

    expect(response.status).toBe(401);
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("does not reprocess duplicate events", async () => {
    processPaystackWebhook.mockResolvedValue({
      accepted: true,
      duplicate: true,
      requestId: "R3",
    });

    const response = await POST(makeRequest("{}", "sig"));

    expect(response.status).toBe(200);
    expect(afterMock).not.toHaveBeenCalled();
  });
});