import { google } from "googleapis";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (key: string) =>
  env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim() ?? "";

const clientId = get("GOOGLE_CLIENT_ID");
const clientSecret = get("GOOGLE_CLIENT_SECRET");
const owner = get("GOOGLE_CALENDAR_OWNER_EMAIL") || "the calendar owner";

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first."
  );
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");

const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ],
});

console.log("\nIMPORTANT: Sign into Google as:", owner);
console.log("This address MUST be listed under Test users on the consent screen.\n");
console.log("1) Open this URL in a browser where you are signed in as that account:\n");
console.log(authUrl);
console.log("\n2) If you see 'Access blocked/denied', add this address as a Test user:");
console.log("   Console > APIs & Services > OAuth consent screen > Test users.\n");
console.log("3) Approve the consent screen.");
console.log(
  "\n4) You'll be redirected to http://localhost/?code=XXXX...  Copy the CODE value (the part after ?code=)."
);
console.log("\n5) Run:  npm run calendar:token  and paste the code.\n");
