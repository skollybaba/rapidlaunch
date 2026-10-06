import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbConnectMock,
  userModelMock,
  enrollmentModelMock,
  bookingModelMock,
  orderModelMock,
  productModelMock,
  broadcastModelMock,
  readUploadMock,
  createMailAdapterMock,
  sendEmailMock,
  brandLogoAttachmentsMock,
  brandLogoHtmlMock,
} = vi.hoisted(() => {
  const sendEmailMock = vi.fn();
  const brandLogoAttachmentsMock = vi.fn().mockReturnValue([]);
  const brandLogoHtmlMock = vi.fn().mockReturnValue("<img alt='logo' />");
  return {
    dbConnectMock: vi.fn().mockResolvedValue({}),
    userModelMock: { find: vi.fn(), countDocuments: vi.fn() },
    enrollmentModelMock: { find: vi.fn(), distinct: vi.fn() },
    bookingModelMock: { find: vi.fn(), distinct: vi.fn() },
    orderModelMock: { find: vi.fn(), distinct: vi.fn() },
    productModelMock: { find: vi.fn(), findById: vi.fn() },
    broadcastModelMock: { find: vi.fn(), create: vi.fn() },
    readUploadMock: vi.fn(),
    createMailAdapterMock: vi.fn(() => ({
      sendEmail: sendEmailMock,
      sendTemplateEmail: vi.fn(),
      sendTestEmail: vi.fn(),
    })),
    sendEmailMock,
    brandLogoAttachmentsMock,
    brandLogoHtmlMock,
  };
});

vi.mock("@/lib/db", () => ({ dbConnect: dbConnectMock }));
vi.mock("@/models/User", () => ({ User: userModelMock }));
vi.mock("@/models/Enrollment", () => ({ Enrollment: enrollmentModelMock }));
vi.mock("@/models/Booking", () => ({ Booking: bookingModelMock }));
vi.mock("@/models/Order", () => ({ Order: orderModelMock }));
vi.mock("@/models/Product", () => ({ Product: productModelMock }));
vi.mock("@/models/Broadcast", () => ({
  Broadcast: broadcastModelMock,
  BROADCAST_SEGMENT_TYPES: [
    "ALL_USERS",
    "COURSE_ENROLLEES",
    "SESSION_REGISTRANTS",
    "PENDING_ORDERS",
    "IMPORTED",
  ],
}));
vi.mock("@/lib/storage", () => ({ readUpload: readUploadMock }));
vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: createMailAdapterMock,
  brandLogoAttachments: brandLogoAttachmentsMock,
  brandLogoHtml: brandLogoHtmlMock,
}));

import {
  applyPersonalization,
  getBroadcastOptions,
  listBroadcasts,
  renderBroadcastEmail,
  sendBroadcast,
  BroadcastServiceError,
} from "@/lib/services/broadcast-service";

const actor = { userId: "U1", email: "admin@example.com" };

function chain(execResult: unknown): never {
  const query: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(execResult),
  };
  return query as never;
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Big news",
    subject: "Hello {{name}}",
    bodyHtml: "<p>Hi {{name}}, visit https://example.com</p>",
    segmentType: "ALL_USERS",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue({ providerMessageId: "m1", sentAt: new Date() });
  brandLogoAttachmentsMock.mockReturnValue([{ filename: "agile-logo.png" }]);
});

afterEach(() => {
  brandLogoAttachmentsMock.mockReturnValue([]);
});

describe("applyPersonalization", () => {
  it("replaces name and email tokens", () => {
    expect(
      applyPersonalization("Hi {{name}} <{{email}}>", {
        email: "ada@example.com",
        name: "Ada",
      })
    ).toBe("Hi Ada <ada@example.com>");
  });

  it("falls back to \"there\" without a name", () => {
    expect(applyPersonalization("Hi {{name}}", { email: "ada@example.com" })).toBe(
      "Hi there"
    );
  });

  it("escapes names when the target is HTML", () => {
    expect(
      applyPersonalization("<p>{{name}}</p>", { email: "a@b.com", name: "<script>x" }, {
        html: true,
      })
    ).toBe("<p>&lt;script&gt;x</p>");
  });
});

describe("sendBroadcast — segment resolution", () => {
  it("resolves ALL_USERS from non-admin accounts", async () => {
    userModelMock.find.mockReturnValue(
      chain([
        { _id: "U1", email: "ada@example.com", name: "Ada" },
        { _id: "U2", email: "tunde@example.com" },
      ])
    );
    broadcastModelMock.create.mockResolvedValue({ _id: "BC1" });

    const result = await sendBroadcast(baseInput(), actor);

    expect(userModelMock.find).toHaveBeenCalledWith({ role: { $ne: "admin" } });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ recipients: 2, sent: 2, failed: 0 });
    expect(broadcastModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Big news",
        segmentType: "ALL_USERS",
        recipientCount: 2,
        sentCount: 2,
        failedCount: 0,
        status: "COMPLETED",
        createdByUserId: "U1",
        createdByEmail: "admin@example.com",
      })
    );
  });

  it("resolves COURSE_ENROLLEES scoped to a course", async () => {
    enrollmentModelMock.find.mockReturnValue(
      chain([{ _id: "E1", userId: "U1" }])
    );
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "ada@example.com", name: "Ada" }])
    );
    productModelMock.findById.mockReturnValue(chain({ _id: "P1", title: "AI Course" }));
    broadcastModelMock.create.mockResolvedValue({ _id: "BC2" });

    await sendBroadcast(baseInput({ segmentType: "COURSE_ENROLLEES", productId: "P1" }), actor);

    expect(enrollmentModelMock.find).toHaveBeenCalledWith({
      status: "ACTIVE",
      courseId: "P1",
    });
    expect(userModelMock.find).toHaveBeenCalledWith({
      _id: { $in: ["U1"] },
    });
    expect(broadcastModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ segmentProductTitle: "AI Course" })
    );
  });

  it("returns no recipients when no one is enrolled", async () => {
    enrollmentModelMock.find.mockReturnValue(chain([]));
    broadcastModelMock.create.mockResolvedValue({ _id: "BC3" });
    await expect(
      sendBroadcast(baseInput({ segmentType: "COURSE_ENROLLEES" }), actor)
    ).rejects.toMatchObject({
      code: "NO_RECIPIENTS",
      status: 400,
    });
  });

  it("resolves SESSION_REGISTRANTS from bookings (excludes cancelled/failed)", async () => {
    bookingModelMock.find.mockReturnValue(
      chain([
        { customerEmail: "ada@example.com", customerName: "Ada" },
        { customerEmail: "tunde@example.com" },
      ])
    );
    broadcastModelMock.create.mockResolvedValue({ _id: "BC4" });

    await sendBroadcast(baseInput({ segmentType: "SESSION_REGISTRANTS" }), actor);

    expect(bookingModelMock.find).toHaveBeenCalledWith({
      status: { $nin: ["CANCELLED", "FAILED"] },
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("resolves PENDING_ORDERS and pulls names from user accounts", async () => {
    orderModelMock.find.mockReturnValue(
      chain([
        { customerEmail: "ada@example.com", userId: "U1" },
        { customerEmail: "guest@example.com", userId: null },
      ])
    );
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "ada@example.com", name: "Ada" }])
    );
    broadcastModelMock.create.mockResolvedValue({ _id: "BC5" });

    await sendBroadcast(baseInput({ segmentType: "PENDING_ORDERS" }), actor);

    expect(orderModelMock.find).toHaveBeenCalledWith({
      status: "PENDING",
    });
    const calls = sendEmailMock.mock.calls.map((c) => c[0].to);
    expect(calls).toContain("ada@example.com");
    expect(calls).toContain("guest@example.com");
  });

  it("uses the imported list and records it as the segment", async () => {
    broadcastModelMock.create.mockResolvedValue({ _id: "BC6" });
    const imported = [
      { email: "csv@example.com", name: "From CSV" },
      { email: "json@example.com" },
    ];

    await sendBroadcast(
      baseInput({ segmentType: "IMPORTED", importedRecipients: imported }),
      actor
    );

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(broadcastModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ segmentType: "IMPORTED" })
    );
  });

  it("rejects imported recipients on non-imported segments", async () => {
    await expect(
      sendBroadcast(
        baseInput({ importedRecipients: [{ email: "x@y.com" }] }),
        actor
      )
    ).rejects.toMatchObject({ code: "UNEXPECTED_IMPORT", status: 400 });
  });

  it("rejects an invalid imported list", async () => {
    await expect(
      sendBroadcast(
        baseInput({
          segmentType: "IMPORTED",
          importedRecipients: [{ email: "nope" }],
        }),
        actor
      )
    ).rejects.toMatchObject({ code: "INVALID_IMPORT", status: 400 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects a broadcast with zero recipients overall", async () => {
    userModelMock.find.mockReturnValue(chain([]));
    await expect(sendBroadcast(baseInput(), actor)).rejects.toMatchObject({
      code: "NO_RECIPIENTS",
    });
  });
});

describe("sendBroadcast — composition and delivery", () => {
  it("personalizes subject and body per recipient and escapes names", async () => {
    userModelMock.find.mockReturnValue(
      chain([
        { _id: "U1", email: "ada@example.com", name: "Ada" },
        { _id: "U2", email: "tunde@example.com" },
      ])
    );
    broadcastModelMock.create.mockResolvedValue({ _id: "BC7" });

    await sendBroadcast(baseInput(), actor);

    const [first, second] = sendEmailMock.mock.calls.map((c) => c[0]);
    expect(first).toMatchObject({ to: "ada@example.com", subject: "Hello Ada" });
    expect(first.html).toContain("Hi Ada");
    expect(second).toMatchObject({
      to: "tunde@example.com",
      subject: "Hello there",
    });
    expect(second.html).toContain("Hi there");
  });

  it("sanitizes the body before sending", async () => {
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "ada@example.com", name: "Ada" }])
    );
    broadcastModelMock.create.mockResolvedValue({ _id: "BC8" });

    await sendBroadcast(
      baseInput({
        bodyHtml:
          '<p>Welcome</p><script>alert("x")</script><img src="javascript:bad()" alt="x" />',
      }),
      actor
    );

    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.html).toContain("Welcome");
    expect(sent.html).not.toContain("<script");
    expect(sent.html).not.toContain("javascript:");
  });

  it("throws ATTACHMENT_MISSING when an attachment cannot be loaded", async () => {
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "ada@example.com", name: "Ada" }])
    );
    readUploadMock.mockResolvedValue(null);

    await expect(
      sendBroadcast(baseInput({ attachmentKeys: ["dead"] }), actor)
    ).rejects.toMatchObject({ code: "ATTACHMENT_MISSING", status: 400 });
  });

  it("attaches the brand logo alongside user files", async () => {
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "ada@example.com", name: "Ada" }])
    );
    readUploadMock.mockResolvedValue(Buffer.from("PDF"));
    broadcastModelMock.create.mockResolvedValue({ _id: "BC9" });

    await sendBroadcast(
      baseInput({ attachmentKeys: ["abc.pdf"], attachmentName: "spec.pdf" }),
      actor
    );

    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.attachments).toHaveLength(2);
    expect(sent.attachments[0]).toEqual({ filename: "agile-logo.png" });
    expect(sent.attachments[1]).toMatchObject({
      filename: "spec.pdf",
      contentType: "application/pdf",
    });
  });

  it("flags PARTIAL and FAILED outcomes", async () => {
    userModelMock.find.mockReturnValue(
      chain([
        { _id: "U1", email: "a@example.com", name: "A" },
        { _id: "U2", email: "b@example.com", name: "B" },
        { _id: "U3", email: "c@example.com", name: "C" },
      ])
    );
    sendEmailMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("SMTP reject"))
      .mockResolvedValueOnce({});

    broadcastModelMock.create.mockResolvedValue({ _id: "BC10" });
    const partial = await sendBroadcast(baseInput(), actor);
    expect(partial).toMatchObject({ sent: 2, failed: 1 });
    expect(broadcastModelMock.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "PARTIAL", sentCount: 2, failedCount: 1 })
    );

    sendEmailMock.mockRejectedValue(new Error("SMTP down"));
    broadcastModelMock.create.mockResolvedValue({ _id: "BC11" });
    const failed = await sendBroadcast(baseInput(), actor);
    expect(failed).toMatchObject({ sent: 0, failed: 3 });
    expect(broadcastModelMock.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "FAILED", sentCount: 0, failedCount: 3 })
    );
  });

  it("delivers an empty-body rejection after sanitizing", async () => {
    userModelMock.find.mockReturnValue(
      chain([{ _id: "U1", email: "a@example.com", name: "A" }])
    );
    await expect(
      sendBroadcast(baseInput({ bodyHtml: "<script>alert(1)</script>" }), actor)
    ).rejects.toMatchObject({ code: "EMPTY_BODY", status: 400 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("getBroadcastOptions", () => {
  it("returns counts and product dropdowns", async () => {
    userModelMock.countDocuments = vi.fn().mockResolvedValue(12);
    enrollmentModelMock.distinct.mockResolvedValue(["U1", "U2"]);
    bookingModelMock.distinct.mockResolvedValue(["a@example.com"]);
    orderModelMock.distinct.mockResolvedValue(["b@example.com"]);
    productModelMock.find.mockReturnValue(
      chain([{ _id: "P1", title: "AI Course" }, { _id: "P2", title: "Prompting" }])
    );
    orderModelMock.find.mockReturnValue(
      chain([{ items: [{ productId: "P1" }, { productId: "P2" }] }])
    );

    const options = await getBroadcastOptions();

    expect(options.counts).toEqual({
      allUsers: 12,
      courseEnrollees: 2,
      sessionRegistrants: 1,
      pendingOrders: 1,
    });
    expect(options.courses).toHaveLength(2);
    expect(options.sessions).toHaveLength(2);
    expect(options.orderProducts).toEqual([
      { id: "P1", title: "AI Course" },
      { id: "P2", title: "Prompting" },
    ]);
    expect(productModelMock.find).toHaveBeenCalledWith({ type: "COURSE" });
    expect(productModelMock.find).toHaveBeenCalledWith({ type: "CONSULTATION" });
  });
});

describe("listBroadcasts", () => {
  it("maps history rows with segment labels", async () => {
    broadcastModelMock.find.mockReturnValue(
      chain([
        {
          _id: "BC1",
          title: "Big news",
          subject: "Hello",
          segmentType: "COURSE_ENROLLEES",
          segmentProductTitle: "AI Course",
          recipientCount: 5,
          sentCount: 5,
          failedCount: 0,
          status: "COMPLETED",
          createdByEmail: "admin@example.com",
          createdAt: new Date("2026-09-01T10:00:00.000Z"),
        },
      ])
    );

    const rows = await listBroadcasts();

    expect(rows[0]).toMatchObject({
      id: "BC1",
      segmentLabel: "Course enrollees: AI Course",
      recipientCount: 5,
      createdAt: "2026-09-01T10:00:00.000Z",
    });
  });
});

describe("renderBroadcastEmail", () => {
  it("sanitizes then wraps the body in the brand shell", () => {
    const { html, text } = renderBroadcastEmail({
      title: "Launch day",
      bodyHtml: "<p>It's live!<img src=x onerror='boom()'></p>",
    });
    expect(html).toContain("Launch day");
    expect(html).toContain("email-body");
    expect(html).not.toContain("onerror");
    expect(text).toContain("It's live!");
  });

  it("personalises tokens with a sample recipient and returns the subject", () => {
    const rendered = renderBroadcastEmail({
      title: "Hello {{name}}",
      subject: "For {{name}}",
      bodyHtml: "<p>Hi {{name}}, your email is {{email}}.</p>",
    });
    expect(rendered.html).toContain("Hello Ada");
    expect(rendered.html).toContain("Hi Ada, your email is ada@example.com.");
    expect(rendered.html).not.toContain("{{name}}");
    expect(rendered.subject).toBe("For Ada");
  });

  it("swaps the inline logo cid for a hosted URL so the preview renders", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    brandLogoHtmlMock.mockReturnValue(
      "<img src='cid:agile-logo' alt='logo' />"
    );
    const { html } = renderBroadcastEmail({
      title: "News",
      bodyHtml: "<p>Hi</p>",
    });
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
    expect(html).toContain(
      "<img src='https://app.example.com/images/agile_logo.png'"
    );
    expect(html).not.toContain("cid:agile-logo");
  });
});

describe("BroadcastServiceError", () => {
  it("carries a code, message and status", () => {
    const error = new BroadcastServiceError("X", "Message", 404);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: "X", message: "Message", status: 404, name: "BroadcastServiceError" });
  });
});