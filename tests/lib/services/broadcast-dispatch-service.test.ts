import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

const findMock = vi.fn();
const updateManyMock = vi.fn();

vi.mock("@/models/Broadcast", () => ({
  Broadcast: {
    find: (...args: unknown[]) => findMock(...args),
    updateMany: (...args: unknown[]) => updateManyMock(...args),
  },
}));

const deliverScheduledBroadcastMock = vi.fn();

vi.mock("@/lib/services/broadcast-service", () => ({
  deliverScheduledBroadcast: (...args: unknown[]) =>
    deliverScheduledBroadcastMock(...args),
}));

import { dispatchDueBroadcasts } from "@/lib/services/broadcast-dispatch-service";

type Chain = {
  select: () => Chain;
  lean: () => Chain;
  exec: () => Promise<unknown>;
};

function chain(result: unknown): Chain {
  const c: Chain = {
    select: () => c,
    lean: () => c,
    exec: async () => result,
  };
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  updateManyMock.mockResolvedValue({ matchedCount: 0 });
  findMock.mockReturnValue(chain([]));
  deliverScheduledBroadcastMock.mockResolvedValue({
    delivered: true,
    skipped: false,
    recipients: 1,
    sent: 1,
    failed: 0,
  });
});

describe("dispatchDueBroadcasts", () => {
  it("sweeps stale claims and returns an empty result when nothing is due", async () => {
    const result = await dispatchDueBroadcasts();

    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock.mock.calls[0][0]).toMatchObject({
      status: "SCHEDULED",
      dispatchingAt: { $ne: null },
    });
    expect(findMock).toHaveBeenCalledWith({
      status: "SCHEDULED",
      scheduledFor: { $lte: expect.any(Date) },
      dispatchingAt: null,
    });
    expect(result).toMatchObject({
      processed: 0,
      delivered: 0,
      skipped: 0,
      failed: 0,
    });
    expect(deliverScheduledBroadcastMock).not.toHaveBeenCalled();
  });

  it("fires every due campaign and tallies the outcomes", async () => {
    findMock.mockReturnValueOnce(chain([{ _id: "BC1" }, { _id: "BC2" }]));
    deliverScheduledBroadcastMock
      .mockResolvedValueOnce({
        delivered: true,
        skipped: false,
        recipients: 2,
        sent: 2,
        failed: 0,
      })
      .mockResolvedValueOnce({
        delivered: false,
        skipped: true,
        recipients: 0,
        sent: 0,
        failed: 0,
      });

    const result = await dispatchDueBroadcasts();

    expect(deliverScheduledBroadcastMock).toHaveBeenCalledWith("BC1");
    expect(deliverScheduledBroadcastMock).toHaveBeenCalledWith("BC2");
    expect(result).toMatchObject({
      processed: 2,
      delivered: 1,
      skipped: 1,
      failed: 0,
    });
  });

  it("counts a terminal failure without throwing", async () => {
    findMock.mockReturnValueOnce(chain([{ _id: "BC1" }]));
    deliverScheduledBroadcastMock.mockResolvedValueOnce({
      delivered: false,
      skipped: false,
      recipients: 0,
      sent: 0,
      failed: 0,
      error: "The email body is missing.",
    });

    const result = await dispatchDueBroadcasts();

    expect(result.failed).toBe(1);
    expect(result.outcomes[0]).toMatchObject({
      broadcastId: "BC1",
      delivered: false,
      error: "The email body is missing.",
    });
  });

  it("keeps dispatching the other campaigns when one delivery throws", async () => {
    findMock.mockReturnValueOnce(chain([{ _id: "BC1" }, { _id: "BC2" }]));
    deliverScheduledBroadcastMock
      .mockRejectedValueOnce(new Error("SMTP down"))
      .mockResolvedValueOnce({
        delivered: true,
        skipped: false,
        recipients: 1,
        sent: 1,
        failed: 0,
      });

    const result = await dispatchDueBroadcasts();

    expect(result).toMatchObject({
      processed: 2,
      delivered: 1,
      failed: 1,
    });
    expect(result.outcomes[0]).toMatchObject({
      broadcastId: "BC1",
      error: "SMTP down",
    });
    expect(result.outcomes[1]).toMatchObject({
      broadcastId: "BC2",
      delivered: true,
    });
  });
});
