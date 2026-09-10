import { describe, expect, it } from "vitest";

import {
  richContentToHtml,
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