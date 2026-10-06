import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

const findOneAndUpdate = vi.fn();
const updateOne = vi.fn();
const updateMany = vi.fn();
const findMock = vi.fn();

vi.mock("@/models/EmailSequenceSubscription", () => ({
  EmailSequenceSubscription: {
    find: (...args: unknown[]) => findMock(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => updateOne(...args),
    updateMany: (...args: unknown[]) => updateMany(...args),
  },
}));

vi.mock("@/models/EmailSequence", () => ({
  EmailSequence: {},
}));

const sendTemplateEmail = vi.fn();

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => ({ sendTemplateEmail })),
}));

import { dispatchEmailSequenceSteps } from "@/lib/services/sequence-dispatch-service";

type Chain = {
  select: () => Chain;
  populate: () => Chain;
  lean: () => Chain;
  exec: () => Promise<unknown>;
};

function chain(result: unknown): Chain {
  const c: Chain = {
    select: () => c,
    populate: () => c,
    lean: () => c,
    exec: async () => result,
  };
  return c;
}

function dueSubscription(overrides: Record<string, unknown> = {}) {
  return {
    _id: "SUB1",
    email: "learner@example.com",
    currentStepIndex: 0,
    dispatchingAt: null,
    sequenceId: {
      active: true,
      totalSteps: 3,
      intervalHours: 24,
      steps: [
        { index: 0, subject: "One", title: "", body: "<p>first</p>", delayHours: 0 },
        { index: 1, subject: "Two", title: "", body: "<p>second</p>", delayHours: 24 },
        { index: 2, subject: "Three", title: "", body: "<p>third</p>", delayHours: 24 },
      ],
    },
    ...overrides,
  };
}

function claim(value: unknown) {
  return { lean: async () => value };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMany.mockResolvedValue({ matchedCount: 0 });
  updateOne.mockResolvedValue({ modifiedCount: 1 });
  sendTemplateEmail.mockResolvedValue({ providerMessageId: "MSG1" });
  // First find returns candidate ids, second returns the populated docs.
  findMock.mockReturnValueOnce(chain([{ _id: "SUB1" }]));
});

describe("dispatchEmailSequenceSteps", () => {
  it("sends the due step and advances to the next step", async () => {
    findMock.mockReturnValueOnce(chain([dueSubscription()]));
    findOneAndUpdate.mockReturnValueOnce(claim(dueSubscription({ dispatchingAt: new Date() })));

    const result = await dispatchEmailSequenceSteps();

    expect(sendTemplateEmail).toHaveBeenCalledTimes(1);
    expect(sendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "sequence_step",
        to: "learner@example.com",
        variables: expect.objectContaining({ subject: "One" }),
      })
    );
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    // Advances to step 1 with a 24h delay and frees the claim.
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "SUB1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          currentStepIndex: 1,
          dispatchingAt: null,
        }),
      })
    );
  });

  it("completes the subscription on the last step", async () => {
    const sub = dueSubscription({
      currentStepIndex: 2,
      sequenceId: {
        active: true,
        totalSteps: 3,
        intervalHours: 24,
        steps: [
          { index: 0, subject: "One", body: "", delayHours: 0 },
          { index: 1, subject: "Two", body: "", delayHours: 24 },
          { index: 2, subject: "Three", body: "<p>last</p>", delayHours: 24 },
        ],
      },
    });
    findMock.mockReturnValueOnce(chain([sub]));
    findOneAndUpdate.mockReturnValueOnce(claim({ ...sub, dispatchingAt: new Date() }));

    const result = await dispatchEmailSequenceSteps();

    expect(result.sent).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "SUB1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          completedAt: expect.any(Date),
          dispatchingAt: null,
        }),
      })
    );
  });

  it("skips subscriptions whose sequence is inactive and frees the claim", async () => {
    findMock.mockReturnValueOnce(
      chain([dueSubscription({ sequenceId: { active: false, steps: [] } })])
    );
    findOneAndUpdate.mockReturnValueOnce(claim({}));

    const result = await dispatchEmailSequenceSteps();

    expect(sendTemplateEmail).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "SUB1" },
      expect.objectContaining({ $set: { dispatchingAt: null } })
    );
  });

  it("skips a subscription another runner has already claimed", async () => {
    findMock.mockReturnValueOnce(chain([dueSubscription()]));
    findOneAndUpdate.mockReturnValueOnce(claim(null));

    const result = await dispatchEmailSequenceSteps();

    expect(sendTemplateEmail).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("records a failure when the provider errors", async () => {
    sendTemplateEmail.mockRejectedValueOnce(new Error("SMTP down"));
    findMock.mockReturnValueOnce(chain([dueSubscription()]));
    findOneAndUpdate.mockReturnValueOnce(claim({ dispatchingAt: new Date() }));

    const result = await dispatchEmailSequenceSteps();

    expect(result.failed).toBe(1);
    expect(result.outcomes[0]).toMatchObject({ sent: false, error: "SMTP down" });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "SUB1" },
      expect.objectContaining({
        $inc: { failureCount: 1 },
        $set: { dispatchingAt: null },
      })
    );
  });

  it("releases stale claims left by a crashed process", async () => {
    findMock.mockReturnValueOnce(chain([]));

    const result = await dispatchEmailSequenceSteps();

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(0);
  });

  it("returns an empty result when nothing is due", async () => {
    findMock.mockReturnValueOnce(chain([]));

    const result = await dispatchEmailSequenceSteps();

    expect(result).toMatchObject({ processed: 0, sent: 0, skipped: 0, failed: 0 });
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });
});
