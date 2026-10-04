/**
 * YouTube URL handling for LMS video lessons.
 *
 * Admins paste whatever link they have from YouTube Studio or the address bar,
 * so lesson URLs are accepted in every common shape and normalised to an
 * embeddable watch URL. Nothing here is trusted for rendering: the returned id
 * is restricted to the characters YouTube actually uses.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const ID_IN_PATH = [
  // https://www.youtube.com/watch?v=ID
  /[?&]v=([A-Za-z0-9_-]{11})/,
  // https://youtu.be/ID
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  // https://www.youtube.com/embed/ID
  /\/embed\/([A-Za-z0-9_-]{11})/,
  // https://www.youtube.com/shorts/ID
  /\/shorts\/([A-Za-z0-9_-]{11})/,
  // https://www.youtube.com/live/ID
  /\/live\/([A-Za-z0-9_-]{11})/,
];

/**
 * True only for http(s) URLs on a YouTube-owned host. Blocks `javascript:`,
 * `data:` and lookalike hosts such as `youtube.com.evil.test`.
 */
export function isYouTubeUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be"
  );
}

/**
 * Extracts the 11-character video id from a YouTube URL, or null when the URL
 * is not a recognisable single-video link (a channel, playlist or live room
 * cannot be embedded as one lesson).
 */
export function parseYouTubeId(value: string): string | null {
  if (!isYouTubeUrl(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const candidate = `${url.pathname}${url.search}`;

  for (const pattern of ID_IN_PATH) {
    const match = candidate.match(pattern);
    if (match && YOUTUBE_ID.test(match[1])) return match[1];
  }

  // Bare host form: https://youtu.be/ID and https://youtube.com/ID
  if (host === "youtu.be" || host === "youtube.com") {
    const first = url.pathname.split("/").filter(Boolean)[0];
    if (first && YOUTUBE_ID.test(first)) return first;
  }

  return null;
}

/**
 * Thumbnail for a lesson or module preview image.
 */
export function youTubeThumbnailUrl(
  videoId: string,
  quality: "hq" | "mq" | "max" = "hq"
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * Normalises an admin-entered URL into a canonical watch URL, or null when the
 * value is not a single YouTube video.
 */
export function normalizeYouTubeUrl(value: string): string | null {
  const id = parseYouTubeId(value);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}