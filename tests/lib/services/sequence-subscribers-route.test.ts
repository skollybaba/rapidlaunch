import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, listSequenceSubscribersMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listSequenceSubscribersMock: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: requireAdminMock,
  isAdminEmail: vi.fn(() => true),
  adminEmails: vi.fn(() => ["admin@example.com"]),
}));
vi.mock("@/lib/services/sequence-service", () => ({
  listSequenceSubscribers: listSequenceSubscribersMock,
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/email-sequences/[id]/subscribers/route";

const adminUser = { _id: "A1", email: "admin@example.com", role: "admin", name: "Admin" };
const context = (id = "SEQ1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(adminUser);
  listSequenceSubscribersMock.mockResolvedValue({
    total: 2,
    subscribers: [
      { _id: "S1", email: "ada@example.com", name: "Ada", status: "pending", subscribedAt: "2026-01-01T00:00:00.000Z", lastSentAt: null, nextSendAt: "2026-01-02T00:00:00.000Z", currentStepIndex: 0 },
      { _id: "S2", email: "bola@example.com", name: "Bola", status: "completed", subscribedAt: "2026-01-01T00:00:00.000Z", lastSentAt: "2026-01-01T00:00:00.000Z", nextSendAt: "2026-01-02T00:00:00.000Z", currentStepIndex: 1 },
    ],
  });
});

function getRequest(query = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/email-sequences/SEQ1/subscribers${query}`
  );
}

describe("GET /api/admin/email-sequences/[id]/subscribers", () => {
  it("returns the subscriber list for admins", async () => {
    const res = await GET(getRequest("?limit=10&skip=0"), context());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBe(2);
    expect(body.data.subscribers[0]).toMatchObject({ email: "ada@example.com" });
    expect(listSequenceSubscribersMock).toHaveBeenCalledWith("SEQ1", { limit: 10, skip: 0 });
  });

  it("rejects an invalid sequence id", async () => {
    const res = await GET(getRequest(), context(""));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(listSequenceSubscribersMock).not.toHaveBeenCalled();
  });

  it("rejects invalid query parameters", async () => {
    const res = await GET(getRequest("?limit=0"), context());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(listSequenceSubscribersMock).not.toHaveBeenCalled();
  });

  it("returns an error when the service fails", async () => {
    listSequenceSubscribersMock.mockRejectedValueOnce(new Error("db down"));

    const res = await GET(getRequest(), context());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });
});