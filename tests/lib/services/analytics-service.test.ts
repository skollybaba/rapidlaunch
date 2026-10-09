import { beforeEach, describe, expect, it, vi } from "vitest";

import { emitAnalyticsEvent, orderEventKey } from "@/lib/services/analytics-service";

const updateOneMock = vi.fn();
const execMock = vi.fn();

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/AnalyticsEvent", () => ({
  AnalyticsEvent: {
    updateOne: (...args: unknown[]) => {
      updateOneMock(...args);
      return { exec: execMock };
    },
  },
}));

describe("analytics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateOneMock.mockReset();
    execMock.mockReset();
    execMock.mockResolvedValue({ upsertedCount: 1 });
  });

  it("records an event with an upsert keyed on eventKey", async () => {
    await emitAnalyticsEvent({
      eventType: "PAYMENT_SUCCEEDED",
      eventKey: "PAYMENT_SUCCEEDED:QL-1",
      productId: "P1",
      productType: "COURSE",
      customerEmail: "buyer@example.com",
    });

    expect(updateOneMock).toHaveBeenCalledWith(
      { eventKey: "PAYMENT_SUCCEEDED:QL-1" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          eventType: "PAYMENT_SUCCEEDED",
          productId: "P1",
          productType: "COURSE",
          customerEmail: "buyer@example.com",
        }),
      }),
      { upsert: true }
    );
    expect(execMock).toHaveBeenCalledTimes(1);
  });

  it("never throws when the database is unavailable", async () => {
    vi.mocked(execMock).mockRejectedValueOnce(
      new Error("connection refused")
    );

    await expect(
      emitAnalyticsEvent({
        eventType: "CHECKOUT_VIEWED",
        eventKey: "view:abc",
      })
    ).resolves.toBeUndefined();
  });

  it("builds deterministic order-scoped event keys for dedupe", () => {
    expect(orderEventKey("ORDER_CREATED", "QL-1")).toBe("ORDER_CREATED:QL-1");
    expect(orderEventKey("PAYMENT_STARTED", "QL-1")).toBe(
      "PAYMENT_STARTED:QL-1"
    );
  });
});