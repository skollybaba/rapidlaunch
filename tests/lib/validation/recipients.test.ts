import { describe, expect, it } from "vitest";

import {
  RECIPIENT_IMPORT_MAX,
  parseRecipientsCsv,
  parseRecipientsFile,
  parseRecipientsJson,
  splitCsvLine,
  validateImportedRecipients,
} from "@/lib/validation/recipients";

describe("splitCsvLine", () => {
  it("handles quoted fields, escaped quotes and trailing commas", () => {
    expect(splitCsvLine('"Ada,Obi",ada@example.com')).toEqual([
      "Ada,Obi",
      "ada@example.com",
    ]);
    expect(splitCsvLine('"Say ""hi""",hi@example.com')).toEqual([
      'Say "hi"',
      "hi@example.com",
    ]);
    expect(splitCsvLine("name,email,")).toEqual(["name", "email", ""]);
  });
});

describe("parseRecipientsCsv", () => {
  it("parses rows and ignores the header", () => {
    const result = parseRecipientsCsv(
      "name,email\nAda Obi,ada@example.com\nTunde,tunde@example.com"
    );
    expect(result.recipients).toEqual([
      { email: "ada@example.com", name: "Ada Obi" },
      { email: "tunde@example.com", name: "Tunde" },
    ]);
    expect(result.issues).toEqual([]);
    expect(result.droppedCount).toBe(0);
  });

  it("accepts a header-less list and lowercases emails", () => {
    const result = parseRecipientsCsv("Ada,ADA@example.com\n, other@example.com");
    expect(result.recipients).toEqual([
      { email: "ada@example.com", name: "Ada" },
      { email: "other@example.com" },
    ]);
  });

  it("reports invalid rows with their line numbers", () => {
    const result = parseRecipientsCsv(
      "name,email\nAda,not-an-email\nTunde,tunde@example.com"
    );
    expect(result.recipients).toEqual([
      { email: "tunde@example.com", name: "Tunde" },
    ]);
    expect(result.issues).toEqual([
      { row: 2, message: "Missing or invalid email address." },
    ]);
  });

  it("deduplicates by email and caps the list", () => {
    const rows = [
      "name,email",
      ...Array.from(
        { length: RECIPIENT_IMPORT_MAX + 3 },
        (_, i) => `Person ${i},person${i}@example.com`
      ),
      "Duplicate,ada@example.com",
    ].join("\n");
    const result = parseRecipientsCsv(rows);
    expect(result.recipients).toHaveLength(RECIPIENT_IMPORT_MAX);
    expect(result.recipients[0]).toEqual({
      email: "person0@example.com",
      name: "Person 0",
    });
    expect(result.droppedCount).toBeGreaterThan(0);
  });

  it("handles the BOM, blank lines and quoted commas", () => {
    const result = parseRecipientsCsv(
      "\uFEFFname,email\n\n\"Obi, Ada\",ada@example.com\n\n"
    );
    expect(result.recipients).toEqual([
      { email: "ada@example.com", name: "Obi, Ada" },
    ]);
  });
});

describe("parseRecipientsJson", () => {
  it("parses an array of objects", () => {
    const result = parseRecipientsJson(
      '[{"name":"Ada","email":"ada@example.com"},{"email":"tunde@example.com"}]'
    );
    expect(result.recipients).toEqual([
      { email: "ada@example.com", name: "Ada" },
      { email: "tunde@example.com" },
    ]);
  });

  it("accepts an array of plain email strings", () => {
    const result = parseRecipientsJson('["ada@example.com"]');
    expect(result.recipients).toEqual([{ email: "ada@example.com" }]);
  });

  it("flags bad rows and invalid JSON", () => {
    const mixed = parseRecipientsJson(
      '[{"name":"Ada","email":"broken"},{"name":"Tunde","email":"tunde@example.com"}]'
    );
    expect(mixed.recipients).toEqual([
      { email: "tunde@example.com", name: "Tunde" },
    ]);
    expect(mixed.issues[0].row).toBe(1);

    const invalid = parseRecipientsJson("{nope");
    expect(invalid.recipients).toEqual([]);
    expect(invalid.issues[0].message).toContain("not valid JSON");
  });

  it("rejects an empty array with guidance", () => {
    const result = parseRecipientsJson("[]");
    expect(result.recipients).toEqual([]);
    expect(result.issues[0].message).toContain("Expected an array");
  });
});

describe("parseRecipientsFile", () => {
  it("routes by file extension", () => {
    expect(
      parseRecipientsFile("list.csv", "name,email\nAda,ada@example.com")
        .recipients
    ).toHaveLength(1);
    expect(
      parseRecipientsFile("list.json", '[{"name":"Ada","email":"ada@example.com"}]')
        .recipients
    ).toHaveLength(1);
  });
});

describe("validateImportedRecipients", () => {
  it("validates server-side recipients and drops duplicates", () => {
    const result = validateImportedRecipients([
      { name: "Ada", email: "ada@example.com" },
      { email: "ada@example.com" },
      { name: "Tunde", email: "tunde@example.com" },
    ]);
    expect(result).toEqual([
      { email: "ada@example.com", name: "Ada" },
      { email: "tunde@example.com", name: "Tunde" },
    ]);
  });

  it("rejects empty, oversized, or invalid batches", () => {
    expect(() => validateImportedRecipients([])).toThrowError(
      "Imported recipients list is empty."
    );
    expect(() => validateImportedRecipients([{ email: "nope" }])).toThrowError(
      "has an invalid email address."
    );
    expect(() =>
      validateImportedRecipients(
        Array.from({ length: RECIPIENT_IMPORT_MAX + 1 }, () => ({
          email: "x@example.com",
        }))
      )
    ).toThrowError("exceed the limit");
    expect(() => validateImportedRecipients([{ name: "Ada" }])).toThrowError(
      "invalid email address."
    );
  });
});