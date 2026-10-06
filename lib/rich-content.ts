import "server-only";

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "u",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "span",
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: [],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { a: ["http", "https", "mailto"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
  disallowedTagsMode: "discard",
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}

const EMAIL_TAGS = [...ALLOWED_TAGS, "h4", "img"];

const EMAIL_OPTIONS: sanitizeHtml.IOptions = {
  ...OPTIONS,
  allowedTags: EMAIL_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: [],
    img: ["src", "alt", "width", "height", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "cid"],
  allowedSchemesByTag: { a: ["http", "https", "mailto"], img: ["http", "https", "cid"] },
};

/**
 * Sanitizes rich-text HTML destined for an email body. Looser than
 * {@link sanitizeRichHtml}: images (https or cid:) and h4 survive because
 * marketing emails embed brand artwork, while scripts, stylesheets, and
 * event handlers are still discarded.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html ?? "", EMAIL_OPTIONS);
}

export function richContentToHtml(source: string): string {
  const input = source ?? "";
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(input);
  if (!looksLikeHtml) {
    const paragraphs = input
      .split(/(?:\r?\n){2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\r?\n/g, "<br>")}</p>`)
      .join("");
    return sanitizeRichHtml(paragraphs);
  }
  return sanitizeRichHtml(input);
}