import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  sendBroadcastMock,
  renderBroadcastEmailMock,
  writeUploadMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  sendBroadcastMock: vi.fn(),
  renderBroadcastEmailMock: vi.fn(),
  writeUploadMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/services/broadcast-service", () => ({
  sendBroadcast: sendBroadcastMock,
  renderBroadcastEmail: renderBroadcastEmailMock,
  BroadcastServiceError: class BroadcastServiceError extends Error {},
}));
vi.mock("@/lib/storage", () => ({ writeUpload: writeUploadMock }));

import { NextRequest } from "next/server";
import { POST as postBroadcast } from "@/app/api/admin/broadcast/route";
import { GET as getTemplate } from "@/app/api/admin/broadcast/template/route";
import { POST as postPreview } from "@/app/api/admin/broadcast/preview/route";
import { RECIPIENTS_CSV_TEMPLATE } from "@/lib/validation/recipients";

const adminUser = { _id: "A1", email: "admin@example.com", role: "admin", name: "Admin" };
const staffUser = { _id: "S1", email: "staff@example.com", role: "customer", name: "St" };

function formData(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.append(key, value);
  return form;
}

async function jsonRequest(path: string, body: unknown): Promise<NextRequest> {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(adminUser);
  sendBroadcastMock.mockResolvedValue({
    recipients: 2,
    sent: 2,
    failed: 0,
    broadcastId: "BC1",
  });
  renderBroadcastEmailMock.mockResolvedValue({
    html: "<!doctype html><html></html>",
    text: "hello",
  });
  writeUploadMock.mockResolvedValue({
    key: "abc.pdf",
    name: "spec.pdf",
    size: 5,
    type: "application/pdf",
    url: "https://res.cloudinary.com/x/upload/abc.pdf",
  });
});

describe("POST /api/admin/broadcast", () => {
  it("rejects unauthored and non-admin callers", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const unauth = await postBroadcast(
      await jsonRequest("/api/admin/broadcast", {})
    );
    expect(unauth.status).toBe(401);
    expect(sendBroadcastMock).not.toHaveBeenCalled();

    getCurrentUserMock.mockResolvedValueOnce(staffUser);
    const forbidden = await postBroadcast(
      await jsonRequest("/api/admin/broadcast", {})
    );
    expect(forbidden.status).toBe(403);
    expect(sendBroadcastMock).not.toHaveBeenCalled();
  });

  it("sends a segmented broadcast from form fields", async () => {
    const form = formData({
      title: "Big news",
      subject: "Hello",
      bodyHtml: "<p>Hi</p>",
      segmentType: "COURSE_ENROLLEES",
      productId: "P1",
    });
    const response = await postBroadcast(
      new NextRequest("http://localhost/api/admin/broadcast", {
        method: "POST",
        body: form,
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      data: { recipients: 2, sent: 2, failed: 0, broadcastId: "BC1" },
    });
    expect(sendBroadcastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentType: "COURSE_ENROLLEES",
        productId: "P1",
        attachmentKeys: [],
      }),
      { userId: "A1", email: "admin@example.com" }
    );
  });

  it("uploads and passes an attachment through", async () => {
    const form = formData({
      title: "News",
      subject: "Subject",
      bodyHtml: "<p>Hi</p>",
      segmentType: "ALL_USERS",
    });
    form.append("attachment", new File(["PDF!"], "spec.pdf", { type: "application/pdf" }));

    const response = await postBroadcast(
      new NextRequest("http://localhost/api/admin/broadcast", {
        method: "POST",
        body: form,
      })
    );
    const json = await response.json();

    expect(json.ok).toBe(true);
    expect(writeUploadMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      "spec.pdf",
      "application/pdf"
    );
    expect(sendBroadcastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentKeys: ["abc.pdf"],
        attachmentName: "spec.pdf",
      }),
      expect.anything()
    );
  });

  it("passes JSON-parsed imported recipients", async () => {
    const form = formData({
      title: "News",
      subject: "Subject",
      bodyHtml: "<p>Hi</p>",
      segmentType: "IMPORTED",
      importedRecipients: JSON.stringify([{ email: "a@b.com" }]),
    });
    const response = await postBroadcast(
      new NextRequest("http://localhost/api/admin/broadcast", {
        method: "POST",
        body: form,
      })
    );

    expect(response.status).toBe(200);
    expect(sendBroadcastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentType: "IMPORTED",
        importedRecipients: [{ email: "a@b.com" }],
      }),
      expect.anything()
    );
  });

  it("rejects malformed imported JSON", async () => {
    const form = formData({
      title: "News",
      subject: "Subject",
      bodyHtml: "<p>Hi</p>",
      segmentType: "IMPORTED",
      importedRecipients: "{not json",
    });
    const response = await postBroadcast(
      new NextRequest("http://localhost/api/admin/broadcast", {
        method: "POST",
        body: form,
      })
    );
    const json = await response.json();

    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_IMPORT");
    expect(sendBroadcastMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/broadcast/template", () => {
  it("serves a CSV attachment to admins", async () => {
    const response = await getTemplate();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "rapid-launch-recipients-template.csv"
    );
    expect(await response.text()).toBe(RECIPIENTS_CSV_TEMPLATE);
  });

  it("blocks non-admins", async () => {
    getCurrentUserMock.mockResolvedValueOnce(staffUser);
    const response = await getTemplate();
    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/broadcast/preview", () => {
  it("returns the rendered brand email", async () => {
    const response = await postPreview(
      await jsonRequest("/api/admin/broadcast/preview", {
        title: "Launch",
        subject: "Hello Ada",
        bodyHtml: "<p>Go</p>",
      })
    );
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.html).toContain("<html>");
    expect(renderBroadcastEmailMock).toHaveBeenCalledWith({
      title: "Launch",
      subject: "Hello Ada",
      bodyHtml: "<p>Go</p>",
    });
  });

  it("requires title and body", async () => {
    const response = await postPreview(
      await jsonRequest("/api/admin/broadcast/preview", {
        title: "Launch",
        bodyHtml: "  ",
      })
    );
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("EMPTY_PREVIEW");
  });

  it("blocks non-admins", async () => {
    getCurrentUserMock.mockResolvedValueOnce(staffUser);
    const response = await postPreview(
      await jsonRequest("/api/admin/broadcast/preview", {
        title: "Launch",
        bodyHtml: "<p>Go</p>",
      })
    );
    expect(response.status).toBe(403);
  });
});