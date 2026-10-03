import { beforeEach, describe, expect, it, vi } from "vitest";

const { createLead: createLeadMock } = vi.hoisted(() => ({
  createLead: vi.fn(),
}));

const { getCurrentUser: getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/lead-service", () => ({ createLead: createLeadMock }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

import { POST as createLeadRoute } from "@/app/api/leads/route";
import { GET as listLeadsRoute } from "@/app/api/admin/leads/route";
import { PATCH as updateLeadRoute } from "@/app/api/admin/leads/[leadId]/route";
import { NextRequest } from "next/server";

function leadRequest(body: unknown) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validInterest = {
  mode: "interest",
  productSlug: "building-your-product-with-ai",
  name: "Ada",
  email: "ada@example.com",
  whatYouAreBuilding: "A logistics dashboard",
  helpNeeded: "First working version",
};

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLeadMock.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      offering: "AI_BUILD_PRICED",
      productTitle: "Building Your Product with AI",
      quotedPriceMinor: 100_000_000,
      currency: "NGN",
      requiresQuote: false,
    });
  });

  it("accepts a valid interest submission", async () => {
    const response = await createLeadRoute(leadRequest(validInterest));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(createLeadMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a submission missing required fields", async () => {
    const response = await createLeadRoute(
      leadRequest({ ...validInterest, name: "" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no engagement", async () => {
    const response = await createLeadRoute(
      leadRequest({ ...validInterest, productSlug: undefined })
    );

    expect(response.status).toBe(400);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown enquiry mode", async () => {
    const response = await createLeadRoute(
      leadRequest({ ...validInterest, mode: "cheat" })
    );

    expect(response.status).toBe(400);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new NextRequest("http://localhost/api/leads", {
      method: "POST",
      body: "{not json",
    });
    const response = await createLeadRoute(request);

    expect(response.status).toBe(400);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  it("does not let a client set the price or the lead status", async () => {
    await createLeadRoute(
      leadRequest({
        ...validInterest,
        priceMinor: 0,
        status: "CLOSED_WON",
        quotedPriceMinor: 1,
      })
    );

    expect(createLeadMock).not.toHaveBeenCalled();
  });
});

describe("admin lead routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request to list submissions", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await listLeadsRoute(
      new NextRequest("http://localhost/api/admin/leads")
    );

    expect(response.status).toBe(401);
  });

  it("rejects a signed-in non-admin from listing submissions", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "customer" });

    const response = await listLeadsRoute(
      new NextRequest("http://localhost/api/admin/leads")
    );

    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated request to update a submission", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await updateLeadRoute(
      new NextRequest("http://localhost/api/admin/leads/abc", {
        method: "PATCH",
        body: JSON.stringify({ status: "QUOTED" }),
      }),
      { params: Promise.resolve({ leadId: "abc" }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejects a non-admin from updating a submission", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "customer" });

    const response = await updateLeadRoute(
      new NextRequest("http://localhost/api/admin/leads/abc", {
        method: "PATCH",
        body: JSON.stringify({ status: "QUOTED" }),
      }),
      { params: Promise.resolve({ leadId: "abc" }) }
    );

    expect(response.status).toBe(403);
  });
});