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