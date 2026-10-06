import { describe, expect, it } from "vitest";

import {
  richContentToHtml,
  sanitizeEmailHtml,
  sanitizeRichHtml,
} from "@/lib/rich-content";

describe("sanitizeRichHtml", () => {
  it("keeps headings, lists, and inline formatting from the editor", () => {
    const html =
      "<h2>Module one</h2><ul><li><strong>Scope</strong> and goals</li><li><em>Roadmap</em></li></ul><p>Do more with <code>AI</code>.</p><blockquote>Testimonials work.</blockquote>";
    const result = sanitizeRichHtml(html);
    expect(result).toContain("<h2>Module one</h2>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<strong>Scope</strong>");
    expect(result).toContain("<em>Roadmap</em>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("<code>AI</code>");
  });

  it("drops scripts and inline event handlers", () => {
    const html =
      '<p onclick="steal()">Hello</p><script>alert("x")</script><img src=x onerror="boom()" /><iframe src="ev"></iframe>';
    const result = sanitizeRichHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("iframe");
    expect(result).not.toContain("<img");
    expect(result).toContain("<p>Hello</p>");
  });

  it("blocks javascript: links", () => {
    const result = sanitizeRichHtml(
      '<a href="javascript:alert(1)">bad</a><a href="https://example.com">ok</a>'
    );
    expect(result).not.toContain("javascript:");
    expect(result).toContain("https://example.com");
    expect(result).toContain('target="_blank"');
  });

  it("returns an empty string for undefined or empty input", () => {
    expect(sanitizeRichHtml(undefined as unknown as string)).toBe("");
    expect(sanitizeRichHtml("")).toBe("");
  });
});

describe("richContentToHtml", () => {
  it("wraps legacy plain text in paragraphs", () => {
    const result = richContentToHtml("Line one.\n\nLine two.\n\nLine three.");
    expect(result).toMatch(/^<p>Line one\.<\/p><p>Line two\.<\/p><p>Line three\.<\/p>$/);
  });

  it("renders single hard breaks inside a plain text paragraph", () => {
    const result = richContentToHtml("Alpha\nBeta");
    expect(result).toContain("<p>Alpha<br />Beta</p>");
  });

  it("passes through editor HTML unchanged", () => {
    const html = "<h2>Intro</h2><p>Some <strong>bold</strong> words.</p>";
    expect(richContentToHtml(html)).toBe(html);
  });
});

describe("sanitizeEmailHtml", () => {
  it("keeps images and h4 for marketing bodies", () => {
    const html =
      '<h4>Offer</h4><img src="https://res.cloudinary.com/x/image/upload/a.png" alt="Art" /><ul><li>One</li></ul>';
    const result = sanitizeEmailHtml(html);
    expect(result).toContain("<h4>Offer</h4>");
    expect(result).toContain('src="https://res.cloudinary.com/x/image/upload/a.png"');
    expect(result).toContain("<ul>");
  });

  it("strips scripts, event handlers and iframes", () => {
    const html =
      '<p onclick="steal()">Hi</p><script>alert("x")</script><iframe src="ev"></iframe><a href="https://ok.example">ok</a>';
    const result = sanitizeEmailHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("iframe");
    expect(result).toContain("<p>Hi</p>");
    expect(result).toContain("https://ok.example");
  });

  it("keeps cid: images used by inlined brand assets", () => {
    const result = sanitizeEmailHtml('<img src="cid:agile-logo" alt="Logo" />');
    expect(result).toContain('src="cid:agile-logo"');
  });
});