import "server-only";

import { brandLogoHtml } from "@/lib/email-brand";

const FONT_STACK =
  "font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const INK = "#141414";
const PAPER = "#fcfaf8";
const TERRACOTTA = "#c75d3c";
const MUTED = "#6b6b76";
const BORDER = "#eee7de";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Body styles for rich-text written in the admin editor. Email clients drop
 * class attributes, so every rule targets element selectors only.
 */
const BODY_CSS = `
  .email-body { color:#35374a; font-size:15px; line-height:1.65; ${FONT_STACK} }
  .email-body p { margin:0 0 16px; }
  .email-body h1, .email-body h2, .email-body h3, .email-body h4 {
    color:${INK}; font-weight:700; line-height:1.25; margin:28px 0 12px;
  }
  .email-body h1 { font-size:26px; }
  .email-body h2 { font-size:21px; }
  .email-body h3 { font-size:18px; }
  .email-body h4 { font-size:16px; }
  .email-body ul, .email-body ol { margin:0 0 16px; padding-left:22px; }
  .email-body li { margin:0 0 8px; }
  .email-body a { color:${TERRACOTTA}; font-weight:600; text-decoration:underline; }
  .email-body blockquote {
    margin:0 0 16px; padding:12px 18px; border-left:3px solid ${TERRACOTTA};
    background:${"#fae9e0"}; color:${INK}; border-radius:0 10px 10px 0;
  }
  .email-body img { max-width:100%; height:auto; border-radius:12px; display:block; margin:0 auto 16px; }
  .email-body pre {
    margin:0 0 16px; padding:14px 16px; background:#f4f2ee; border-radius:10px;
    font-size:13px; white-space:pre-wrap; word-break:break-word;
  }
  .email-body code { font-family:Menlo,Consolas,monospace; font-size:13px; }
  .email-body hr { border:0; border-top:1px solid ${BORDER}; margin:24px 0; }
`;

export interface BroadcastEmailContent {
  headline: string;
  bodyHtml: string;
}

/**
 * Wraps sanitized rich-text in the brand email shell: dark header with the
 * logo, white content card, warm paper background, branded footer.
 * The headline and body must already be personalized and sanitized.
 */
export function buildBroadcastEmail(content: BroadcastEmailContent): {
  html: string;
  text: string;
} {
  const headline = escapeHtml(content.headline);
  const brand = escapeHtml(process.env.MAIL_FROM_NAME || "Rapid Launch");
  const tagline =
    "Product strategy, AI learning, and MVP execution.";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${headline}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
${BODY_CSS}
@media only screen and (max-width:600px) {
  .email-shell { width:100% !important; }
  .email-pad { padding:20px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="email-shell" style="width:600px;max-width:600px;">
<tr><td style="background:${INK};border-radius:16px 16px 0 0;padding:8px 16px 6px;">
${brandLogoHtml()}
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${BORDER};border-top:0;padding:32px;" class="email-pad">
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${INK};${FONT_STACK}">${headline}</h1>
<div class="email-body">${content.bodyHtml}</div>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${BORDER};border-top:0;border-radius:0 0 16px 16px;padding:20px 32px 26px;" class="email-pad">
<p style="margin:0;font-size:13px;color:${MUTED};${FONT_STACK}">${brand} &mdash; ${tagline}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = `${content.headline}\n\n${htmlToText(content.bodyHtml)}\n\n--\n${brand} — ${tagline}`;

  return { html, text };
}

/** Plain-text fallback for the mail provider: strips tags, keeps line breaks. */
function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-4]|\/blockquote|\/div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
