import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  default: vi.fn(),
  dbConnect: vi.fn(),
}));

const {
  emailSequenceFind,
  emailSequenceFindById,
  subscriptionFindOne,
  subscriptionCreate,
  userFindById,
  dispatchEmailSequenceSteps,
} = vi.hoisted(() => ({
  emailSequenceFind: vi.fn(),
  emailSequenceFindById: vi.fn(),
  subscriptionFindOne: vi.fn(),
  subscriptionCreate: vi.fn(),
  userFindById: vi.fn(),
  dispatchEmailSequenceSteps: vi.fn(),
}));

vi.mock("@/models/EmailSequence", () => ({
  default: {
    find: (...args: unknown[]) => emailSequenceFind(...args),
    findById: (...args: unknown[]) => emailSequenceFindById(...args),
  },
  EmailSequence: {
    find: (...args: unknown[]) => emailSequenceFind(...args),
    findById: (...args: unknown[]) => emailSequenceFindById(...args),
  },
}));

vi.mock("@/models/EmailSequenceSubscription", () => ({
  EmailSequenceSubscription: {
    findOne: (...args: unknown[]) => subscriptionFindOne(...args),
    create: (...args: unknown[]) => subscriptionCreate(...args),
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    findById: (...args: unknown[]) => userFindById(...args),
  },
}));

vi.mock("@/lib/services/sequence-dispatch-service", () => ({
  dispatchEmailSequenceSteps,
}));

import { subscribeBuyerToOrderSequences } from "@/lib/services/sequence-service";

type Chain = {
  select: () => Chain;
  lean: () => Promise<unknown>;
  exec: () => Promise<unknown>;
};

function chain(result: unknown): Chain {
  const c: Chain = {
    select: () => c,
    lean: async () => result,
    exec: async () => result,
  };
  return c;
}

const PRODUCT_A = "64b00000000000000000000a";
const PRODUCT_B = "64b00000000000000000000b";

function orderDoc(overrides: Record<string, unknown> = {}) {
  return {
    orderReference: "QL-2001",
    customerEmail: "Buyer@Example.com",
    userId: "USER1",
    items: [{ productId: PRODUCT_A }, { productId: PRODUCT_B }],
    ...overrides,
  };
}

function storedSequence(overrides: Record<string, unknown> = {}) {
  return {
    _id: "SEQ1",
    active: true,
    productId: PRODUCT_A,
    steps: [
      {
        index: 0,
        subject: "Welcome",
        body: "<p>Welcome</p>",
        triggerType: "immediate",
        delayHours: 0,
        sendAtHours: 0,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  emailSequenceFind.mockReturnValue(chain([]));
  emailSequenceFindById.mockReturnValue(chain(storedSequence()));
  subscriptionFindOne.mockResolvedValue(null);
  subscriptionCreate.mockResolvedValue({
    toObject: () => ({ _id: "SUB1", nextSendAt: new Date() }),
  });
  userFindById.mockReturnValue(chain({ name: "Buyer Name" }));
  dispatchEmailSequenceSteps.mockResolvedValue({ sent: 1, failed: 0 });
});

describe("subscribeBuyerToOrderSequences", () => {
  it("subscribes the buyer to every active sequence for each product bought", async () => {
    emailSequenceFind.mockReturnValue(
      chain([
        { _id: "SEQ1", productId: PRODUCT_A },
        { _id: "SEQ2", productId: PRODUCT_B },
      ])
    );

    const result = await subscribeBuyerToOrderSequences(orderDoc());

    expect(result).toEqual({ matchedSequences: 2, subscribed: 2 });
    expect(emailSequenceFind).toHaveBeenCalledWith({
      active: true,
      productId: { $in: [PRODUCT_A, PRODUCT_B] },
    });
    expect(subscriptionCreate).toHaveBeenCalledTimes(2);
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "buyer@example.com",
        sequenceId: "SEQ1",
        productId: PRODUCT_A,
        userId: "USER1",
        firstName: "Buyer",
      })
    );
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sequenceId: "SEQ2", productId: PRODUCT_B })
    );
    expect(dispatchEmailSequenceSteps).toHaveBeenCalledTimes(1);
  });

  it("deduplicates repeated products in the same order", async () => {
    emailSequenceFind.mockReturnValue(chain([{ _id: "SEQ1", productId: PRODUCT_A }]));

    await subscribeBuyerToOrderSequences(
      orderDoc({ items: [{ productId: PRODUCT_A }, { productId: PRODUCT_A }] })
    );

    expect(emailSequenceFind).toHaveBeenCalledWith({
      active: true,
      productId: { $in: [PRODUCT_A] },
    });
  });

  it("does nothing when no active sequence matches the purchased products", async () => {
    const result = await subscribeBuyerToOrderSequences(orderDoc());

    expect(result).toEqual({ matchedSequences: 0, subscribed: 0 });
    expect(subscriptionCreate).not.toHaveBeenCalled();
    expect(dispatchEmailSequenceSteps).not.toHaveBeenCalled();
  });

  it("does nothing for an order with no items or no customer email", async () => {
    const noItems = await subscribeBuyerToOrderSequences(
      orderDoc({ items: [] })
    );
    const noEmail = await subscribeBuyerToOrderSequences(
      orderDoc({ customerEmail: "" })
    );

    expect(noItems).toEqual({ matchedSequences: 0, subscribed: 0 });
    expect(noEmail).toEqual({ matchedSequences: 0, subscribed: 0 });
    expect(emailSequenceFind).not.toHaveBeenCalled();
    expect(subscriptionCreate).not.toHaveBeenCalled();
  });

  it("reuses a live subscription instead of creating a second one", async () => {
    emailSequenceFind.mockReturnValue(chain([{ _id: "SEQ1", productId: PRODUCT_A }]));
    subscriptionFindOne.mockResolvedValue({
      _id: "SUB_EXISTING",
      toObject: () => ({ _id: "SUB_EXISTING" }),
    });

    const result = await subscribeBuyerToOrderSequences(
      orderDoc({ items: [{ productId: PRODUCT_A }] })
    );

    expect(result).toEqual({ matchedSequences: 1, subscribed: 1 });
    expect(subscriptionFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ sequenceId: "SEQ1", email: "buyer@example.com" })
    );
    expect(subscriptionCreate).not.toHaveBeenCalled();
    expect(dispatchEmailSequenceSteps).toHaveBeenCalledTimes(1);
  });

  it("keeps subscribing the rest when one sequence fails", async () => {
    emailSequenceFind.mockReturnValue(
      chain([
        { _id: "SEQ1", productId: PRODUCT_A },
        { _id: "SEQ2", productId: PRODUCT_B },
      ])
    );
    emailSequenceFindById
      .mockReturnValueOnce(chain(storedSequence()))
      .mockReturnValueOnce(chain(storedSequence({ _id: "SEQ2", productId: PRODUCT_B })));
    subscriptionCreate.mockRejectedValueOnce(new Error("write conflict"));

    const result = await subscribeBuyerToOrderSequences(orderDoc());

    expect(result).toEqual({ matchedSequences: 2, subscribed: 1 });
    expect(console.error).toHaveBeenCalledWith(
      "Sequence subscription failed for order",
      "QL-2001",
      expect.objectContaining({ sequenceId: "SEQ1" })
    );
    expect(subscriptionCreate).toHaveBeenCalledTimes(2);
    expect(dispatchEmailSequenceSteps).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when no subscription could be created", async () => {
    emailSequenceFind.mockReturnValue(chain([{ _id: "SEQ1", productId: PRODUCT_A }]));
    subscriptionFindOne.mockResolvedValue(null);
    subscriptionCreate.mockRejectedValueOnce(new Error("sequence closed"));

    const result = await subscribeBuyerToOrderSequences(
      orderDoc({ items: [{ productId: PRODUCT_A }] })
    );

    expect(result).toEqual({ matchedSequences: 1, subscribed: 0 });
    expect(dispatchEmailSequenceSteps).not.toHaveBeenCalled();
  });
});
