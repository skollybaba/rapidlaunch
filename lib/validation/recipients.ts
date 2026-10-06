import { z } from "zod";

/** Hard cap on imported recipients per broadcast. */
export const RECIPIENT_IMPORT_MAX = 2000;

export interface ParsedRecipient {
  email: string;
  name?: string;
}

export interface RecipientRowIssue {
  row: number;
  message: string;
}

export interface RecipientParseResult {
  recipients: ParsedRecipient[];
  issues: RecipientRowIssue[];
  /** Rows that parsed into the file but were dropped (invalid or over cap). */
  droppedCount: number;
}

const emailSchema = z.string().trim().toLowerCase().email();

function normalizeRow(
  rawName: string | undefined,
  rawEmail: string | undefined
): { recipient?: ParsedRecipient; message?: string } {
  const emailResult = emailSchema.safeParse((rawEmail ?? "").trim());
  if (!emailResult.success) {
    return { message: "Missing or invalid email address." };
  }
  const name = (rawName ?? "").trim();
  return {
    recipient: name ? { email: emailResult.data, name } : { email: emailResult.data },
  };
}

/** Splits one CSV line, honouring double-quoted fields and escaped quotes. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const HEADER_ALIASES: Record<string, "name" | "email"> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  first_name: "name",
  email: "email",
  "e-mail": "email",
  mail: "email",
  "email address": "email",
};

function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map((cell) => HEADER_ALIASES[cell.toLowerCase()]);
  return normalized.includes("email");
}

function finish(
  recipients: ParsedRecipient[],
  issues: RecipientRowIssue[]
): RecipientParseResult {
  const seen = new Set<string>();
  const deduped: ParsedRecipient[] = [];
  let duplicateCount = 0;
  for (const recipient of recipients) {
    if (seen.has(recipient.email)) {
      duplicateCount++;
      continue;
    }
    seen.add(recipient.email);
    deduped.push(recipient);
  }

  const overflow = Math.max(0, deduped.length - RECIPIENT_IMPORT_MAX);
  const kept = overflow > 0 ? deduped.slice(0, RECIPIENT_IMPORT_MAX) : deduped;
  if (overflow > 0) {
    issues.push({
      row: 0,
      message: `Only the first ${RECIPIENT_IMPORT_MAX} recipients are kept; ${overflow} over the limit were dropped.`,
    });
  }

  return {
    recipients: kept,
    issues,
    droppedCount: duplicateCount + overflow + issues.filter((i) => i.row > 0).length,
  };
}

export function parseRecipientsCsv(text: string): RecipientParseResult {
  const recipients: ParsedRecipient[] = [];
  const issues: RecipientRowIssue[] = [];

  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { recipients: [], issues, droppedCount: 0 };
  }

  let start = 0;
  if (isHeaderRow(splitCsvLine(lines[0]))) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const { recipient, message } = normalizeRow(cells[0], cells[1]);
    if (message) {
      issues.push({ row: i + 1, message });
    } else if (recipient) {
      recipients.push(recipient);
    }
  }

  return finish(recipients, issues);
}

export function parseRecipientsJson(text: string): RecipientParseResult {
  const recipients: ParsedRecipient[] = [];
  const issues: RecipientRowIssue[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      recipients: [],
      issues: [{ row: 0, message: "The file is not valid JSON." }],
      droppedCount: 1,
    };
  }

  const rows: unknown[] = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { recipients?: unknown }).recipients)
      ? ((parsed as { recipients: unknown[] }).recipients)
      : [];

  if (rows.length === 0) {
    return {
      recipients: [],
      issues: [
        {
          row: 0,
          message:
            'Expected an array of entries like [{"name":"Ada","email":"ada@example.com"}].',
        },
      ],
      droppedCount: 1,
    };
  }

  rows.forEach((row, index) => {
    if (typeof row === "string") {
      const { recipient, message } = normalizeRow(undefined, row);
      if (message) issues.push({ row: index + 1, message });
      else if (recipient) recipients.push(recipient);
      return;
    }
    if (typeof row !== "object" || row === null) {
      issues.push({ row: index + 1, message: "Entry must be an object or email string." });
      return;
    }
    const record = row as Record<string, unknown>;
    const { recipient, message } = normalizeRow(
      typeof record.name === "string" ? record.name : undefined,
      typeof record.email === "string" ? record.email : undefined
    );
    if (message) issues.push({ row: index + 1, message });
    else if (recipient) recipients.push(recipient);
  });

  return finish(recipients, issues);
}

/** Dispatches to the right parser from a file name. */
export function parseRecipientsFile(fileName: string, text: string): RecipientParseResult {
  return fileName.toLowerCase().endsWith(".json")
    ? parseRecipientsJson(text)
    : parseRecipientsCsv(text);
}

/**
 * Validates recipients supplied by the client on the send request itself.
 * Rejects the batch when anything is over the cap or missing an email.
 */
export function validateImportedRecipients(
  input: unknown
): ParsedRecipient[] {
  if (!Array.isArray(input)) {
    throw new Error("Imported recipients must be an array.");
  }
  if (input.length === 0) {
    throw new Error("Imported recipients list is empty.");
  }
  if (input.length > RECIPIENT_IMPORT_MAX) {
    throw new Error(
      `Imported recipients exceed the limit of ${RECIPIENT_IMPORT_MAX}.`
    );
  }
  const seen = new Set<string>();
  const recipients: ParsedRecipient[] = [];
  for (const [index, entry] of input.entries()) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Recipient ${index + 1} is not valid.`);
    }
    const record = entry as Record<string, unknown>;
    const emailResult = emailSchema.safeParse(
      typeof record.email === "string" ? record.email : ""
    );
    if (!emailResult.success) {
      throw new Error(`Recipient ${index + 1} has an invalid email address.`);
    }
    if (seen.has(emailResult.data)) continue;
    seen.add(emailResult.data);
    const name = typeof record.name === "string" ? record.name.trim() : "";
    recipients.push(
      name ? { email: emailResult.data, name } : { email: emailResult.data }
    );
  }
  if (recipients.length === 0) {
    throw new Error("Imported recipients list has no valid entries.");
  }
  return recipients;
}

/** CSV template handed to the marketing team for imports. */
export const RECIPIENTS_CSV_TEMPLATE = [
  "name,email",
  "Ada Obi,ada@example.com",
  "Tunde Bello,tunde@example.com",
].join("\n");
