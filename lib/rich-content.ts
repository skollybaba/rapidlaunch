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

/**
 * Sanitizes rich-text HTML authored for LMS content (course/lesson notes).
 * Like {@link sanitizeEmailHtml} it keeps images so lesson notes can embed
 * artwork, but only from http/https sources — never cid: or data: URLs.
 */
const COURSE_TAGS = [...ALLOWED_TAGS, "h4", "img"];

const COURSE_OPTIONS: sanitizeHtml.IOptions = {
  ...OPTIONS,
  allowedTags: COURSE_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: [],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    a: ["http", "https", "mailto"],
    img: ["http", "https"],
  },
};

export function sanitizeCourseContentHtml(html: string): string {
  return sanitizeHtml(html ?? "", COURSE_OPTIONS);
}

/**
 * Sanitizes an optional description and drops it entirely when it holds no
 * readable text. Tiptap reports an empty editor as `<p></p>`, which would
 * otherwise survive a round trip and render as a stray empty paragraph.
 *
 * Content written before the rich editor existed stays readable: notes that do
 * not look like HTML are converted to paragraphs with hard breaks first, so
 * legacy line breaks are not collapsed away by the HTML renderer.
 *
 * @returns the sanitized HTML, or `undefined` when nothing meaningful remains.
 */
export function sanitizeCourseDescription(
  html?: string | null
): string | undefined {
  if (!html) return undefined;
  const clean = /<[a-z][\s\S]*>/i.test(html)
    ? sanitizeCourseContentHtml(html)
    : richContentToHtml(html);
  const text = clean.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length > 0 ? clean : undefined;
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