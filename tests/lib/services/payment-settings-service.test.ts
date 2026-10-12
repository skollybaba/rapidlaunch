import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/providers/payment", () => ({
  isProviderConfigured: vi.fn(),
}));

vi.mock("@/models/PlatformSetting", () => ({
  PlatformSetting: { findOne: vi.fn(), updateOne: vi.fn() },
}));

import { isProviderConfigured } from "@/lib/providers/payment";
import {
  getSelectedPaymentProvider,
  resolvePaymentProvider,
  setPaymentProvider,
} from "@/lib/services/payment-settings-service";
import { PlatformSetting } from "@/models/PlatformSetting";

const mockIsProviderConfigured = vi.mocked(isProviderConfigured);
const mockFindOne = vi.mocked(PlatformSetting.findOne);
const mockUpdateOne = vi.mocked(PlatformSetting.updateOne);

function lean(value: unknown): never {
  return { lean: () => ({ exec: () => Promise.resolve(value) }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSelectedPaymentProvider", () => {
  it("returns the stored provider", async () => {
    mockFindOne.mockReturnValue(lean({ paymentProvider: "bachs" }));
    await expect(getSelectedPaymentProvider()).resolves.toBe("bachs");
  });

  it("defaults to paystack for a missing or invalid value", async () => {
    mockFindOne.mockReturnValue(lean(null));
    expect(await getSelectedPaymentProvider()).toBe("paystack");

    mockFindOne.mockReturnValue(lean({ paymentProvider: "stripe" }));
    expect(await getSelectedPaymentProvider()).toBe("paystack");
  });

  it("defaults to Paystack when the database is unreachable", async () => {
    mockFindOne.mockImplementation(() => {
      throw new Error("no connection");
    });
    await expect(getSelectedPaymentProvider()).resolves.toBe("paystack");
  });
});

describe("resolvePaymentProvider", () => {
  it("uses Bachs when it is selected and configured", async () => {
    mockFindOne.mockReturnValue(lean({ paymentProvider: "bachs" }));
    mockIsProviderConfigured.mockReturnValue(true);

    await expect(resolvePaymentProvider()).resolves.toEqual({
      provider: "bachs",
      requested: "bachs",
      fellBack: false,
    });
  });

  it("falls back to Paystack when Bachs has no key", async () => {
    mockFindOne.mockReturnValue(lean({ paymentProvider: "bachs" }));
    mockIsProviderConfigured.mockReturnValue(false);

    await expect(resolvePaymentProvider()).resolves.toEqual({
      provider: "paystack",
      requested: "bachs",
      fellBack: true,
      reason: "PROVIDER_NOT_CONFIGURED",
    });
  });

  it("keeps Paystack selected even when it is not configured", async () => {
    mockFindOne.mockReturnValue(lean({ paymentProvider: "paystack" }));
    mockIsProviderConfigured.mockReturnValue(false);

    await expect(resolvePaymentProvider()).resolves.toEqual({
      provider: "paystack",
      requested: "paystack",
      fellBack: false,
    });
  });

  it("defaults to Paystack when no setting is stored", async () => {
    mockFindOne.mockReturnValue(lean(null));
    mockIsProviderConfigured.mockReturnValue(true);

    const resolved = await resolvePaymentProvider();
    expect(resolved.provider).toBe("paystack");
    expect(resolved.fellBack).toBe(false);
  });
});

describe("setPaymentProvider", () => {
  it("upserts the selection with the acting admin", async () => {
    mockUpdateOne.mockResolvedValue({} as never);

    await setPaymentProvider("bachs", "owner@example.com");

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { key: "payment" },
      { $set: { paymentProvider: "bachs", updatedBy: "owner@example.com" } },
      { upsert: true }
    );
  });
});
