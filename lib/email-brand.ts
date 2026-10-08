import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface EmailAttachmentInput {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: "inline" | "attachment";
}

const EMAIL_LOGO_CID = "agile-logo";
let emailLogoCache: EmailAttachmentInput | null | undefined;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function logoCandidatePaths(): string[] {
  const segments = ["public", "images", "agile_logo.png"];
  return [
    path.join(process.cwd(), ...segments),
    path.join(__dirname, "..", "..", ...segments),
    path.join(__dirname, "..", "..", "..", ...segments),
  ];
}

function emailBrandLogo(): string {
  const src = emailLogoSrc();
  if (!src) return "";
  return `<img src="${src}" alt="Rapid Launch" width="80" height="36" style="display:block;margin:0 0 10px;width:80px;height:auto;" />`;
}

function emailLogoSrc(): string | null {
  if (emailLogoAttachment()) return `cid:${EMAIL_LOGO_CID}`;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return base ? `${base}/images/agile_logo.png` : null;
}

function emailLogoAttachment(): EmailAttachmentInput | null {
  if (emailLogoCache !== undefined) return emailLogoCache;
  emailLogoCache = null;
  for (const file of logoCandidatePaths()) {
    try {
      emailLogoCache = {
        filename: "agile-logo.png",
        cid: EMAIL_LOGO_CID,
        contentType: "image/png",
        contentDisposition: "inline",
        content: readFileSync(file),
      };
      break;
    } catch {
      // Try the next candidate path.
    }
  }
  if (emailLogoCache === null) {
    console.warn(
      "[mail] Brand logo file not found on disk; emails will reference the hosted copy instead."
    );
  }
  return emailLogoCache;
}

function emailAttachments(): EmailAttachmentInput[] {
  const logo = emailLogoAttachment();
  return logo ? [logo] : [];
}

/**
 * Brand logo markup for custom (non-templated) emails. References the inline
 * cid when the logo file is attached via {@link brandLogoAttachments},
 * otherwise falls back to the hosted copy.
 */
export function brandLogoHtml(): string {
  return emailBrandLogo();
}

/**
 * The inline brand logo attachment. Always pair it with emails that embed
 * {@link brandLogoHtml} so the cid reference resolves.
 */
export function brandLogoAttachments(): EmailAttachmentInput[] {
  return emailAttachments();
}
