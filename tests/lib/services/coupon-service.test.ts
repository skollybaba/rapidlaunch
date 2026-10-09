import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Coupon", () => ({
  Coupon: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("@/models/Order", () => ({
  Order: { find: vi.fn() },
}));

import { dbConnect } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { Order } from "@/models/Order";
import {
  applyCouponToCheckout,
  createCoupon,
  deleteCoupon,
  getAdminCoupons,
  getCouponById,
  getCouponPreview,
  releaseCouponReservation,
  setCouponActive,
  updateCoupon,
} from "@/lib/services/coupon-service";

const mockFind = vi.mocked(Coupon.find);
const mockFindOne = vi.mocked(Coupon.findOne);
const mockFindById = vi.mocked(Coupon.findById);
const mockCreate = vi.mocked(Coupon.create);
const mockFindByIdAndUpdate = vi.mocked(Coupon.findByIdAndUpdate);
const mockFindByIdAndDelete = vi.mocked(Coupon.findByIdAndDelete);
const mockFindOneAndUpdate = vi.mocked(Coupon.findOneAndUpdate);
const mockUpdateOne = vi.mocked(Coupon.updateOne);
const mockOrderFind = vi.mocked(Order.find);

function doc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "CPN1",
    code: "LAUNCH50",
    discountPercent: 50,
    appliesTo: "ALL",
    active: true,
    startsAt: null,
    endsAt: null,
    maxUses: null,
    usedCount: 0,
    redemptions: [],
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

function chain<T>(resolve: T) {
  return {
    sort: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(resolve),
  } as never;
}

function execOnly<T>(resolve: T) {
  return { exec: vi.fn().mockResolvedValue(resolve) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAdminCoupons", () => {
  it("returns rows with computed status, labels, and stringified ids", async () => {
    mockFind.mockReturnValue(chain([doc(), doc({ active: false })]));

    const rows = await getAdminCoupons();

    expect(dbConnect).toHaveBeenCalledTimes(1);
    expect(mockFind).toHaveBeenCalledWith({});
    expect(rows[0]).toMatchObject({
      id: "CPN1",
      code: "LAUNCH50",
      discountPercent: 50,
      status: "ACTIVE",
      statusLabel: "Active",
      appliesToLabel: "All products",
      usage: "0 used",
    });
    expect(rows[1].status).toBe("OFF");
    expect(rows[1].statusLabel).toBe("Inactive");
  });

  it("searches by code and filters by status", async () => {
    mockFind.mockReturnValue(chain([doc(), doc({ active: false })]));

    const rows = await getAdminCoupons({ q: "  launch ", status: "ACTIVE" });

    expect(mockFind).toHaveBeenCalledWith({
      $or: [{ code: { $regex: "LAUNCH", $options: "i" } }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ACTIVE");
  });

  it("labels scheduled, expired, and exhausted coupons", async () => {
    mockFind.mockReturnValue(
      chain([
        doc({ active: true, startsAt: new Date("2099-01-01T00:00:00Z") }),
        doc({ active: true, endsAt: new Date("2000-01-01T00:00:00Z") }),
        doc({ active: true, maxUses: 5, usedCount: 5 }),
      ])
    );

    const rows = await getAdminCoupons();

    expect(rows[0].status).toBe("SCHEDULED");
    expect(rows[1].status).toBe("EXPIRED");
    expect(rows[2].status).toBe("EXHAUSTED");
    expect(rows[2].usage).toBe("5 / 5");
  });
});

describe("getCouponById", () => {
  it("finds by id", async () => {
    mockFindById.mockReturnValue(chain(doc()));
    const found = await getCouponById("CPN1");
    expect(found).toMatchObject({ code: "LAUNCH50" });
  });
});

describe("createCoupon", () => {
  it("creates a coupon with normalized values", async () => {
    mockFindOne.mockReturnValue(chain(null));
    mockCreate.mockResolvedValue(doc() as never);

    const created = await createCoupon({
      code: " launch50 ",
      discountPercent: 50,
    });

    expect(mockFindOne).toHaveBeenCalledWith({ code: "LAUNCH50" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "LAUNCH50",
        discountPercent: 50,
        appliesTo: "ALL",
        active: false,
        maxUses: null,
      })
    );
    expect(created).toMatchObject({ code: "LAUNCH50" });
  });

  it("rejects a duplicate code", async () => {
    mockFindOne.mockReturnValue(chain(doc()));
    await expect(
      createCoupon({ code: "LAUNCH50", discountPercent: 10 })
    ).rejects.toMatchObject({ code: "COUPON_CODE_IN_USE", status: 409 });
  });
});

describe("updateCoupon", () => {
  it("updates the coupon", async () => {
    mockFindOne.mockReturnValue(chain(null));
    mockFindByIdAndUpdate.mockReturnValue(chain(doc({ discountPercent: 25 })));

    const updated = await updateCoupon("CPN1", {
      code: "LAUNCH50",
      discountPercent: 25,
    });

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "CPN1",
      expect.objectContaining({ $set: expect.objectContaining({ discountPercent: 25 }) }),
      { new: true }
    );
    expect(updated).toMatchObject({ discountPercent: 25 });
  });

  it("rejects a code used on another coupon", async () => {
    mockFindOne.mockReturnValue(chain(doc({ _id: "CPN2" })));
    await expect(
      updateCoupon("CPN1", { code: "LAUNCH50", discountPercent: 10 })
    ).rejects.toMatchObject({ code: "COUPON_CODE_IN_USE", status: 409 });
  });

  it("throws when the coupon is missing", async () => {
    mockFindOne.mockReturnValue(chain(null));
    mockFindByIdAndUpdate.mockReturnValue(chain(null));
    await expect(
      updateCoupon("NOPE", { code: "WHATEVER", discountPercent: 10 })
    ).rejects.toMatchObject({ code: "COUPON_NOT_FOUND", status: 404 });
  });
});

describe("setCouponActive", () => {
  it("sets the active flag", async () => {
    mockFindByIdAndUpdate.mockReturnValue(chain({ _id: "CPN1" }));
    await expect(setCouponActive("CPN1", true)).resolves.toBeUndefined();
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "CPN1",
      { $set: { active: true } },
      { new: true }
    );
  });

  it("throws when the coupon is missing", async () => {
    mockFindByIdAndUpdate.mockReturnValue(chain(null));
    await expect(setCouponActive("NOPE", true)).rejects.toMatchObject({
      code: "COUPON_NOT_FOUND",
      status: 404,
    });
  });
});

describe("deleteCoupon", () => {
  it("deletes the coupon", async () => {
    mockFindByIdAndDelete.mockReturnValue(execOnly(doc({ _id: "CPN1" })));
    await expect(deleteCoupon("CPN1")).resolves.toBeUndefined();
  });

  it("throws when the coupon is missing", async () => {
    mockFindByIdAndDelete.mockReturnValue(execOnly(null));
    await expect(deleteCoupon("NOPE")).rejects.toMatchObject({
      code: "COUPON_NOT_FOUND",
      status: 404,
    });
  });
});

describe("getCouponPreview", () => {
  it("returns the discount for an active coupon", async () => {
    mockFindOne.mockReturnValue(chain(doc({ discountPercent: 10 })));
    const preview = await getCouponPreview("LAUNCH10", "COURSE", 5_000_000);
    expect(preview).toMatchObject({
      code: "LAUNCH50",
      discountPercent: 10,
      discountMinor: 500_000,
      subtotalMinor: 5_000_000,
      totalMinor: 4_500_000,
      appliesTo: "ALL",
    });
  });

  it("fails for an unknown code", async () => {
    mockFindOne.mockReturnValue(chain(null));
    await expect(getCouponPreview("NOPE", "COURSE", 100)).rejects.toMatchObject({
      name: "CouponServiceError",
      code: "COUPON_NOT_FOUND",
      status: 404,
    });
  });

  it("fails for an inactive, scheduled, expired, or exhausted code", async () => {
    mockFindOne.mockReturnValue(chain(doc({ active: false })));
    await expect(getCouponPreview("X", "COURSE", 100)).rejects.toMatchObject({
      code: "COUPON_INACTIVE",
    });

    mockFindOne.mockReturnValue(chain(doc({ startsAt: new Date("2099-01-01T00:00:00Z") })));
    await expect(getCouponPreview("X", "COURSE", 100)).rejects.toMatchObject({
      code: "COUPON_NOT_YET_ACTIVE",
    });

    mockFindOne.mockReturnValue(chain(doc({ endsAt: new Date("2000-01-01T00:00:00Z") })));
    await expect(getCouponPreview("X", "COURSE", 100)).rejects.toMatchObject({
      code: "COUPON_EXPIRED",
    });

    mockFindOne.mockReturnValue(chain(doc({ maxUses: 1, usedCount: 1 })));
    await expect(getCouponPreview("X", "COURSE", 100)).rejects.toMatchObject({
      code: "COUPON_LIMIT_REACHED",
    });
  });

  it("fails when the coupon does not apply to the product type", async () => {
    mockFindOne.mockReturnValue(chain(doc({ appliesTo: "COURSE" })));
    await expect(getCouponPreview("X", "BOOK", 100)).rejects.toMatchObject({
      code: "COUPON_NOT_APPLICABLE",
    });
  });

  it("fails when the discount would make the order free", async () => {
    mockFindOne.mockReturnValue(chain(doc({ discountPercent: 99 })));
    await expect(getCouponPreview("X", "COURSE", 50)).rejects.toMatchObject({
      code: "COUPON_EXCEEDS_PRICE",
    });
  });

  it("previews normally when abandoned attempts alone consumed the usage limit", async () => {
    mockFindOne
      .mockReturnValueOnce(
        chain(
          doc({
            maxUses: 1,
            usedCount: 1,
            redemptions: [
              { email: "other@example.com", orderReference: "QL-OLD", usedAt: new Date() },
            ],
          })
        )
      )
      .mockReturnValueOnce(chain(doc({ maxUses: 1, discountPercent: 10 })));
    mockOrderFind.mockReturnValue(chain([]));
    mockUpdateOne.mockReturnValue(execOnly({ modifiedCount: 1 }));

    const preview = await getCouponPreview("LAUNCH50", "COURSE", 5_000_000);

    expect(preview).toMatchObject({
      code: "LAUNCH50",
      discountPercent: 10,
      discountMinor: 500_000,
      totalMinor: 4_500_000,
    });
  });
});

describe("applyCouponToCheckout", () => {
  const input = {
    code: "launch50",
    productType: "COURSE" as const,
    customerEmail: " Buyer@Example.com ",
    orderReference: "QL-XYZ123",
    subtotalMinor: 5_000_000,
  };

  it("reserves the coupon atomically and returns discounted totals", async () => {
    mockFindOne.mockReturnValue(chain(doc({ discountPercent: 10 })));
    mockFindOneAndUpdate.mockReturnValue(chain({ _id: "CPN1" }));

    const applied = await applyCouponToCheckout(input);

    expect(mockFindOne).toHaveBeenCalledWith({ code: "LAUNCH50" });
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "CPN1",
        usedCount: 0,
        "redemptions.email": { $ne: "buyer@example.com" },
      }),
      expect.objectContaining({
        $inc: { usedCount: 1 },
        $push: {
          redemptions: expect.objectContaining({
            email: "buyer@example.com",
            orderReference: "QL-XYZ123",
          }),
        },
      }),
      { new: true }
    );
    expect(applied).toMatchObject({
      couponId: "CPN1",
      code: "LAUNCH50",
      discountPercent: 10,
      discountMinor: 500_000,
      totalMinor: 4_500_000,
    });
  });

  it("rejects reuse by the same email when the previous order succeeded", async () => {
    mockFindOne.mockReturnValue(
      chain(
        doc({
          redemptions: [
            { email: "buyer@example.com", orderReference: "QL-OLD", usedAt: new Date() },
          ],
        })
      )
    );
    mockOrderFind.mockReturnValue(
      chain([{ orderReference: "QL-OLD", status: "PAID" }])
    );
    await expect(applyCouponToCheckout(input)).rejects.toMatchObject({
      code: "COUPON_ALREADY_USED",
      status: 409,
    });
  });

  it("allows reuse when the previous order did not succeed and releases the stale reservation", async () => {
    const stale = doc({
      redemptions: [
        { email: "buyer@example.com", orderReference: "QL-OLD", usedAt: new Date() },
      ],
    });
    const fresh = doc({ discountPercent: 10 });
    mockFindOne.mockReturnValueOnce(chain(stale)).mockReturnValueOnce(chain(fresh));
    mockOrderFind.mockReturnValue(chain([]));
    mockUpdateOne.mockReturnValue(execOnly({ modifiedCount: 1 }));
    mockFindOneAndUpdate.mockReturnValue(chain({ _id: "CPN1" }));

    const applied = await applyCouponToCheckout(input);

    expect(mockOrderFind).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReference: { $in: ["QL-OLD"] },
        status: { $in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] },
      })
    );
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "CPN1",
        "redemptions.orderReference": { $in: ["QL-OLD"] },
        usedCount: { $gte: 1 },
      }),
      expect.objectContaining({ $inc: { usedCount: -1 } })
    );
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "CPN1",
        usedCount: 0,
        "redemptions.email": { $ne: "buyer@example.com" },
      }),
      expect.anything(),
      { new: true }
    );
    expect(applied).toMatchObject({
      couponId: "CPN1",
      discountMinor: 500_000,
      totalMinor: 4_500_000,
    });
  });

  it("does not let abandoned attempts exhaust a single-use coupon", async () => {
    const stale = doc({
      maxUses: 1,
      usedCount: 1,
      redemptions: [
        { email: "other@example.com", orderReference: "QL-OLD", usedAt: new Date() },
      ],
    });
    const fresh = doc({ maxUses: 1, discountPercent: 10 });
    mockFindOne.mockReturnValueOnce(chain(stale)).mockReturnValueOnce(chain(fresh));
    mockOrderFind.mockReturnValue(chain([]));
    mockUpdateOne.mockReturnValue(execOnly({ modifiedCount: 1 }));
    mockFindOneAndUpdate.mockReturnValue(chain({ _id: "CPN1" }));

    const applied = await applyCouponToCheckout(input);

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ usedCount: 0 }),
      expect.anything(),
      { new: true }
    );
    expect(applied).toMatchObject({ couponId: "CPN1", totalMinor: 4_500_000 });
  });

  it("still reports a used-up coupon when only successful orders consumed it", async () => {
    mockFindOne.mockReturnValue(
      chain(
        doc({
          maxUses: 1,
          usedCount: 1,
          redemptions: [
            { email: "other@example.com", orderReference: "QL-OLD", usedAt: new Date() },
          ],
        })
      )
    );
    mockOrderFind.mockReturnValue(
      chain([{ orderReference: "QL-OLD", status: "PAID" }])
    );
    await expect(applyCouponToCheckout(input)).rejects.toMatchObject({
      code: "COUPON_LIMIT_REACHED",
      status: 400,
    });
  });

  it("throws COUPON_UNAVAILABLE when the atomic reservation loses a race", async () => {
    mockFindOne.mockReturnValue(chain(doc()));
    mockFindOneAndUpdate.mockReturnValue(chain(null));
    await expect(applyCouponToCheckout(input)).rejects.toMatchObject({
      code: "COUPON_UNAVAILABLE",
      status: 409,
    });
  });
});

describe("releaseCouponReservation", () => {
  it("decrements and pulls the redemption for the order", async () => {
    mockUpdateOne.mockReturnValue(execOnly({ modifiedCount: 1 }));
    await releaseCouponReservation("QL-XYZ123");

    expect(mockUpdateOne).toHaveBeenCalledWith(
      {
        "redemptions.orderReference": "QL-XYZ123",
        usedCount: { $gt: 0 },
      },
      {
        $inc: { usedCount: -1 },
        $pull: { redemptions: { orderReference: "QL-XYZ123" } },
      }
    );
  });
});