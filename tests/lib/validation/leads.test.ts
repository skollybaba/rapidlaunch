import { describe, expect, it } from "vitest";

import {
  interestFormSchema,
  quoteFormSchema,
  updateLeadStatusSchema,
} from "@/lib/validation/leads";

const validInterest = {
  name: "Ada Lovelace",
  email: "Ada@Example.COM",
  whatYouAreBuilding: "A logistics dashboard for small distributors.",
  helpNeeded: "We need a working first version.",
};

const validQuote = {
  name: "Grace Hopper",
  email: "grace@example.com",
  whatYouAreBuilding: "An internal tool for our support team.",
  projectScope: "Build an internal triage tool with auth and reporting.",
};

describe("interestFormSchema", () => {
  it("accepts a minimal valid submission", () => {
    const parsed = interestFormSchema.parse(validInterest);
    expect(parsed.email).toBe("ada@example.com");
  });

  it("requires a name", () => {
    expect(() => interestFormSchema.parse({ ...validInterest, name: "  " })).toThrow();
  });

  it("requires a valid email", () => {
    expect(() =>
      interestFormSchema.parse({ ...validInterest, email: "not-an-email" })
    ).toThrow();
  });

  it("requires a description of what is being built", () => {
    expect(() =>
      interestFormSchema.parse({ ...validInterest, whatYouAreBuilding: "" })
    ).toThrow();
  });

  it("rejects fields it does not own, so a client cannot set price or status", () => {
    expect(() =>
      interestFormSchema.parse({
        ...validInterest,
        priceMinor: 0,
        status: "CLOSED_WON",
      })
    ).toThrow();
  });

  it("rejects an over-long description", () => {
    expect(() =>
      interestFormSchema.parse({
        ...validInterest,
        whatYouAreBuilding: "x".repeat(2001),
      })
    ).toThrow();
  });
});

describe("quoteFormSchema", () => {
  it("accepts a minimal valid quote submission", () => {
    expect(quoteFormSchema.parse(validQuote).email).toBe("grace@example.com");
  });

  it("requires a project scope", () => {
    expect(() =>
      quoteFormSchema.parse({ ...validQuote, projectScope: "   " })
    ).toThrow();
  });

  it("rejects a malformed website", () => {
    expect(() =>
      quoteFormSchema.parse({ ...validQuote, website: "not a url" })
    ).toThrow();
  });

  it("allows an empty website field", () => {
    expect(
      quoteFormSchema.parse({ ...validQuote, website: "" }).website
    ).toBe("");
  });

  it("coerces a submitted budget to a number", () => {
    const parsed = quoteFormSchema.parse({ ...validQuote, budgetMinor: "25000000" });
    expect(parsed.budgetMinor).toBe(25_000_000);
  });

  it("rejects a negative budget", () => {
    expect(() =>
      quoteFormSchema.parse({ ...validQuote, budgetMinor: -1 })
    ).toThrow();
  });

  it("rejects a client-supplied quoted price", () => {
    expect(() =>
      quoteFormSchema.parse({ ...validQuote, quotedPriceMinor: 1 })
    ).toThrow();
  });
});

describe("updateLeadStatusSchema", () => {
  it("accepts a known status", () => {
    expect(updateLeadStatusSchema.parse({ status: "QUOTED" }).status).toBe("QUOTED");
  });

  it("rejects an unknown status", () => {
    expect(() =>
      updateLeadStatusSchema.parse({ status: "PAYMENT_RECEIVED" })
    ).toThrow();
  });

  it("rejects attempts to set money fields", () => {
    expect(() =>
      updateLeadStatusSchema.parse({ status: "QUOTED", quotedPriceMinor: 1 })
    ).toThrow();
  });
});