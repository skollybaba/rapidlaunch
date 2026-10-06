import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/mail", () => ({
  brandLogoHtml: vi.fn().mockReturnValue("<img src='cid:agile-logo' alt='brand' />"),
}));

import { buildBroadcastEmail } from "@/lib/services/broadcast-template";

describe("buildBroadcastEmail", () => {
  it("builds a branded shell around the body", () => {
    const { html, text } = buildBroadcastEmail({
      headline: "Big news",
      bodyHtml: "<p>Hello <strong>Ada</strong></p>",
    });

    expect(html).toContain("<img src='cid:agile-logo'");
    expect(html).toContain("Big news");
    expect(html).toContain("<p>Hello <strong>Ada</strong></p>");
    expect(html).toContain("Rapid Launch");
    expect(text).toContain("Big news");
    expect(text).toContain("Hello Ada");
  });

  it("escapes the headline to prevent markup injection", () => {
    const { html } = buildBroadcastEmail({
      headline: "<img src=x onerror=bomb()>",
      bodyHtml: "<p>Hi</p>",
    });
    expect(html).toContain("&lt;img src=x onerror=bomb()&gt;");
    expect(html).not.toContain(">bomb()<");
  });

  it("styles editor typography for email clients", () => {
    const { html } = buildBroadcastEmail({
      headline: "News",
      bodyHtml: "<h2>Chapter 1</h2><blockquote>Quote</blockquote>",
    });
    expect(html).toContain(".email-body a");
    expect(html).toContain(".email-body blockquote");
    expect(html).toContain("max-width:600px");
  });
});