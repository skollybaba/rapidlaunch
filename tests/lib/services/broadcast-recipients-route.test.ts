import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, countRecipientsForSegmentMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  countRecipientsForSegmentMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/services/broadcast-service", () => ({
  countRecipientsForSegment: countRecipientsForSegmentMock,
}));
vi.mock("@/lib/api", async (orig) => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return actual;
});

import { GET as getRecipients } from "@/app/api/admin/broadcast/recipients/route";
import { NextRequest } from "next/server";

const adminUser = {
  _id: "A1",
  email: "admin@example.com",
  role: "admin" as const,
  name: "Admin",
};
const customerUser = {
  _id: "C1",
  email: "c@example.com",
  role: "customer" as const,
  name: "C",
};

function makeRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(adminUser);
  countRecipientsForSegmentMock.mockResolvedValue(3);
});

describe("GET /api/admin/broadcast/recipients", () => {
  it("returns count for a segment", async () => {
    const res = await getRecipients(
      makeRequest("/api/admin/broadcast/recipients?segmentType=COURSE_ENROLLEES&productId=P1")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, data: { count: 3 } });
    expect(countRecipientsForSegmentMock).toHaveBeenCalledWith(
      "COURSE_ENROLLEES",
      "P1"
    );
  });

  it("rejects non-admins", async () => {
    getCurrentUserMock.mockResolvedValueOnce(customerUser);
    const res = await getRecipients(
      makeRequest("/api/admin/broadcast/recipients?segmentType=ALL_USERS")
    );
    expect(res.status).toBe(403);
  });

  it("validates params", async () => {
    const res = await getRecipients(
      makeRequest("/api/admin/broadcast/recipients?segmentType=WEIRD")
    );
    expect(res.status).toBe(400);
  });
});
