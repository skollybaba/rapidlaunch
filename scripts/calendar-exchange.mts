import { google } from "googleapis";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const env = readFileSync(".env.local", "utf8");
const get = (key: string) =>
  env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim() ?? "";

const clientId = get("GOOGLE_CLIENT_ID");
const clientSecret = get("GOOGLE_CLIENT_SECRET");

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first."
  );
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
const ask = (q: string) =>
  new Promise<string>((resolve) => {
    rl.question(q, resolve);
  });

const raw = (await ask("Paste the full redirect URL or just the code (after ?code=): ")).trim();
if (!raw) {
  console.error("No code provided.");
  process.exit(1);
}

const codeMatch = raw.match(/[?&]code=([^&\s]+)/);
const code = codeMatch ? decodeURIComponent(codeMatch[1]) : raw;
if (!code) {
  console.error("Could not find a code in the input.");
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");
const { tokens } = await oauth.getToken(code);
const refreshToken = tokens.refresh_token;

if (!refreshToken || !refreshToken.startsWith("1//")) {
  console.error(
    "\nInvalid refresh token returned (" +
      (refreshToken || "none") +
      "). This usually means the code was already used, or this is a repeat consent.\n" +
      "Please run  npm run calendar:auth  again and complete a fresh consent, then paste the new code."
  );
  process.exit(1);
}

const updated = env.replace(
  /^GOOGLE_REFRESH_TOKEN=.*$/m,
  `GOOGLE_REFRESH_TOKEN=${refreshToken}`
);
writeFileSync(".env.local", updated);

console.log("\nSaved GOOGLE_REFRESH_TOKEN to .env.local");
console.log("Your Google Calendar is now configured. Restart the dev server.\n");

rl.close();
