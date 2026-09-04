import { describe, expect, it } from "vitest";

import { cn, estimateReadMinutes, formatDuration, formatPrice, slugify } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold"
    );
  });

  it("returns an empty string when nothing is passed", () => {
    expect(cn()).toBe("");
  });
});

describe("slugify", () => {
  it("lowercases and trims", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("collapses non-alphanumeric runs into single hyphens", () => {
    expect(slugify("Product: Fit & Manual")).toBe("product-fit-manual");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("--ready to go--")).toBe("ready-to-go");
  });

  it("keeps digits and empty strings safe", () => {
    expect(slugify("")).toBe("");
    expect(slugify("60 Minute Session")).toBe("60-minute-session");
  });
});

describe("formatPrice", () => {
  it("formats minor units in naira", () => {
    expect(formatPrice(5_000_000)).toContain("50,000");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toContain("0");
  });

  it("supports a custom currency", () => {
    expect(formatPrice(2_500, "USD")).toContain("25");
  });
});

describe("formatDuration", () => {
  it("returns null for missing duration", () => {
    expect(formatDuration()).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });

  it("formats minutes only", () => {
    expect(formatDuration(45)).toBe("45 min");
  });

  it("formats hours only", () => {
    expect(formatDuration(120)).toBe("2 hrs");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(185)).toBe("3 hr 5 min");
  });
});

describe("estimateReadMinutes", () => {
  it("returns null for empty or missing content", () => {
    expect(estimateReadMinutes()).toBeNull();
    expect(estimateReadMinutes("")).toBeNull();
    expect(estimateReadMinutes("<p></p>")).toBeNull();
  });

  it("estimates roughly one minute per 200 words", () => {
    const words = Array.from({ length: 800 }, (_, i) => `w${i}`).join(" ");
    expect(estimateReadMinutes(`<p>${words}</p>`)).toBe(4);
  });

  it("never returns zero for short content", () => {
    expect(estimateReadMinutes("<p>A short note.</p>")).toBe(1);
  });

  it("strips tags and decodes common entities", () => {
    const html =
      "<h2>Heading</h2><p>Hello &amp; goodbye &nbsp; now</p>";
    expect(estimateReadMinutes(html)).toBe(1);
  });
});