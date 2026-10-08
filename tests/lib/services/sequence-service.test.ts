import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbConnectMock,
  sequenceModelMock,
  subscriptionModelMock,
  userModelMock,
} = vi.hoisted(() => ({
  dbConnectMock: vi.fn().mockResolvedValue({}),
  sequenceModelMock: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
  subscriptionModelMock: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  userModelMock: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ default: dbConnectMock, dbConnect: dbConnectMock }));
vi.mock("@/models/EmailSequence", () => ({
  default: sequenceModelMock,
  EmailSequence: sequenceModelMock,
}));
vi.mock("@/models/EmailSequenceSubscription", () => ({
  EmailSequenceSubscription: subscriptionModelMock,
}));
vi.mock("@/models/User", () => ({ User: userModelMock }));

import { listSequenceSubscribers, listSequences, subscribeToSequence } from "@/lib/services/sequence-service";

interface Chain {
  select: () => Chain;
  populate: () => Chain;
  sort: () => Chain;
  skip: () => Chain;
  limit: () => Chain;
  lean: () => Chain;
  exec: () => Promise<unknown>;
  then: <T>(resolve: (value: unknown) => T) => Promise<T>;
}

function chain(result: unknown): Chain {
  const c: Chain = {
    select: () => c,
    populate: () => c,
    sort: () => c,
    skip: () => c,
    limit: () => c,
    lean: () => c,
    exec: async () => result,
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listSequences", () => {
  it("attaches a subscriber count to every sequence", async () => {
    sequenceModelMock.find.mockReturnValue(
      chain([
        { _id: "SEQ1", name: "Onboarding", productId: "P1", active: true, totalSteps: 2, steps: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { _id: "SEQ2", name: "Re-engagement", productId: "P1", active: false, totalSteps: 1, steps: [], createdAt: "2026-01-02", updatedAt: "2026-01-02" },
      ])
    );
    subscriptionModelMock.aggregate.mockResolvedValue([{ _id: "SEQ1", count: 4 }]);

    const result = await listSequences();

    expect(result[0]).toMatchObject({ _id: "SEQ1", subscriberCount: 4 });
    expect(result[1]).toMatchObject({ _id: "SEQ2", subscriberCount: 0 });
    expect(subscriptionModelMock.aggregate).toHaveBeenCalledWith([
      { $match: { sequenceId: { $in: ["SEQ1", "SEQ2"] } } },
      { $group: { _id: "$sequenceId", count: { $sum: 1 } } },
    ]);
  });

  it("skips the count aggregation when there are no sequences", async () => {
    sequenceModelMock.find.mockReturnValue(chain([]));

    const result = await listSequences();

    expect(result).toEqual([]);
    expect(subscriptionModelMock.aggregate).not.toHaveBeenCalled();
  });
});

describe("subscribeToSequence", () => {
  function activeSequence() {
    return {
      _id: "SEQ1",
      active: true,
      productId: "P1",
      steps: [
        { index: 0, subject: "One", title: "", body: "<p>hi</p>", triggerType: "immediate", delayHours: 0, sendAtHours: 0 },
      ],
    };
  }

  function mockCreate() {
    subscriptionModelMock.create.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: "SUB1",
      toObject: () => ({ _id: "SUB1", nextSendAt: doc.nextSendAt }),
    }));
  }

  it("snapshots only the first name from a supplied name", async () => {
    sequenceModelMock.findById.mockReturnValue(chain(activeSequence()));
    subscriptionModelMock.findOne.mockResolvedValue(null);
    mockCreate();

    await subscribeToSequence({
      email: "ada@example.com",
      sequenceId: "SEQ1",
      name: "Ada Lovelace",
    });

    expect(subscriptionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com", firstName: "Ada" })
    );
  });

  it("derives the first name from the registered user when none is supplied", async () => {
    sequenceModelMock.findById.mockReturnValue(chain(activeSequence()));
    userModelMock.findById.mockReturnValue(chain({ name: "Bola Tinubu" }));
    subscriptionModelMock.findOne.mockResolvedValue(null);
    mockCreate();

    await subscribeToSequence({
      email: "bola@example.com",
      sequenceId: "SEQ1",
      userId: "U1",
    });

    expect(userModelMock.findById).toHaveBeenCalledWith("U1");
    expect(subscriptionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Bola", userId: "U1" })
    );
  });

  it("without a name or user, stores no first name", async () => {
    sequenceModelMock.findById.mockReturnValue(chain(activeSequence()));
    subscriptionModelMock.findOne.mockResolvedValue(null);
    mockCreate();

    await subscribeToSequence({
      email: "anon@example.com",
      sequenceId: "SEQ1",
    });

    expect(subscriptionModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: undefined })
    );
  });

  it("returns null and does not subscribe when the sequence is inactive", async () => {
    sequenceModelMock.findById.mockReturnValue(
      chain({ _id: "SEQ1", active: false, productId: "P1", steps: [] })
    );

    const result = await subscribeToSequence({
      email: "ada@example.com",
      sequenceId: "SEQ1",
    });

    expect(result).toBeNull();
    expect(subscriptionModelMock.findOne).not.toHaveBeenCalled();
    expect(subscriptionModelMock.create).not.toHaveBeenCalled();
  });

  it("does not create a duplicate for an active subscriber", async () => {
    sequenceModelMock.findById.mockReturnValue(chain(activeSequence()));
    subscriptionModelMock.findOne.mockResolvedValue({
      toObject: () => ({ _id: "SUB1", nextSendAt: new Date("2026-03-01T00:00:00.000Z") }),
    });

    const result = await subscribeToSequence({
      email: "ada@example.com",
      sequenceId: "SEQ1",
      name: "Ada",
    });

    expect(result).toMatchObject({ _id: "SUB1" });
    expect(subscriptionModelMock.create).not.toHaveBeenCalled();
  });
});

describe("listSequenceSubscribers", () => {
  it("returns total count and a mapped list with names and status", async () => {
    subscriptionModelMock.find.mockReturnValue(
      chain([
        {
          _id: "S1",
          email: "ada@example.com",
          firstName: "Ada",
          subscribedAt: new Date("2026-01-01T00:00:00.000Z"),
          lastSentAt: new Date("2026-01-02T00:00:00.000Z"),
          nextSendAt: new Date("2026-01-03T00:00:00.000Z"),
          currentStepIndex: 1,
          completedAt: null,
          cancelledAt: null,
        },
        {
          _id: "S2",
          email: "bola@example.com",
          firstName: undefined,
          userId: { name: "Bola Tinubu" },
          subscribedAt: new Date("2026-02-01T00:00:00.000Z"),
          lastSentAt: null,
          nextSendAt: new Date("2026-02-02T00:00:00.000Z"),
          currentStepIndex: 0,
          completedAt: new Date("2026-02-03T00:00:00.000Z"),
          cancelledAt: null,
        },
        {
          _id: "S3",
          email: "chi@example.com",
          firstName: "Chi",
          subscribedAt: new Date("2026-03-01T00:00:00.000Z"),
          lastSentAt: null,
          nextSendAt: new Date("2026-03-02T00:00:00.000Z"),
          currentStepIndex: 0,
          completedAt: null,
          cancelledAt: new Date("2026-03-03T00:00:00.000Z"),
        },
      ])
    );
    subscriptionModelMock.countDocuments.mockResolvedValue(3);

    const result = await listSequenceSubscribers("SEQ1", { limit: 10, skip: 0 });

    expect(result.total).toBe(3);
    expect(subscriptionModelMock.find).toHaveBeenCalledWith({ sequenceId: "SEQ1" });
    expect(subscriptionModelMock.countDocuments).toHaveBeenCalledWith({ sequenceId: "SEQ1" });
    expect(result.subscribers).toHaveLength(3);
    expect(result.subscribers[0]).toMatchObject({
      _id: "S1",
      email: "ada@example.com",
      name: "Ada",
      status: "pending",
      currentStepIndex: 1,
      lastSentAt: "2026-01-02T00:00:00.000Z",
    });
    expect(result.subscribers[1]).toMatchObject({ name: "Bola Tinubu", status: "completed" });
    expect(result.subscribers[2]).toMatchObject({ name: "Chi", status: "cancelled" });
  });

  it("clamps pagination to sane bounds", async () => {
    subscriptionModelMock.find.mockReturnValue(
      chain([
        {
          _id: "S1",
          email: "ada@example.com",
          subscribedAt: new Date("2026-01-01T00:00:00.000Z"),
          nextSendAt: new Date("2026-01-02T00:00:00.000Z"),
          currentStepIndex: 0,
          completedAt: null,
          cancelledAt: null,
        },
      ])
    );
    subscriptionModelMock.countDocuments.mockResolvedValue(1);

    await listSequenceSubscribers("SEQ1", { limit: 9999, skip: -5 });

    expect(subscriptionModelMock.find).toHaveBeenCalledTimes(1);
    const call = subscriptionModelMock.find.mock.calls[0];
    expect(call).toEqual([{ sequenceId: "SEQ1" }]);
  });
});