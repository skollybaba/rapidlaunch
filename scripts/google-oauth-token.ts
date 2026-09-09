/**
 * One-time Google OAuth consent flow to generate a production refresh token
 * that includes the scopes the app needs: Google Classroom, Google Calendar,
 * and Gmail (gmail.send). Run it with your Google OAuth client loaded in the
 * environment:
 *
 *   npx tsx scripts/google-oauth-token.ts
 *
 * Steps:
 * 1. Open the printed URL, sign in as the mailbox/classroom owner, approve.
 * 2. Copy the `code` query parameter from the redirect URL that appears.
 * 3. Paste it when prompted. The script prints your new refresh token.
 * 4. Put that value into GOOGLE_REFRESH_TOKEN in .env.local and in the
 *    production environment (e.g. Render). Keep the client id/secret the same.
 */

import { google } from "googleapis";
import { createInterface } from "node:readline";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/classroom.courses",
  "https://www.googleapis.com/auth/classroom.rosters",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

async function main() {
  const args = process.argv.slice(2);
  const urlOnly = args.includes("--url-only");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "http://localhost";
  if (!clientId || !clientSecret) {
    console.error(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Load them first, e.g. via a .env.local with `npx tsx --env-file=.env.local scripts/google-oauth-token.ts`."
    );
    process.exit(1);
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: SCOPES,
    redirect_uri: redirectUri,
  });

  console.log("\nOpen this URL and approve access:\n\n" + url + "\n");
  if (urlOnly) {
    console.log(
      "After approving, copy the `code` query parameter from the redirect URL and share it here."
    );
    return;
  }

  console.log("Scopes requested:");
  for (const scope of SCOPES) console.log("  -", scope);
  console.log(
    "IMPORTANT: make sure this redirect URI is registered as an Authorized\n" +
      `redirect URI in Google Cloud: ${redirectUri}\n`
  );

  const code = await new Promise<string>((resolve) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(
      "Paste the `code` parameter from the redirect URL: ",
      (value: string) => {
        readline.close();
        resolve(value.trim());
      }
    );
  });

  try {
    const { tokens } = await oauth.getToken(code);
    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;
    console.log("\nRefresh token:", refreshToken || "(none returned)");
    console.log("\nNext steps:");
    console.log(
      "1. Copy the refresh token above into GOOGLE_REFRESH_TOKEN in .env.local."
    );
    console.log(
      "2. Set MAIL_TRANSPORT=gmail_api in your production environment (Render)."
    );
    console.log(
      "3. Deploy, then use the admin dashboard 'Send test email' button to confirm."
    );
    if (!refreshToken) {
      console.warn(
        "\nWARNING: no refresh_token returned. If you had approved access before,\n" +
          "grant access with a different Google account, or revoke the app in\n" +
          "https://myaccount.google.com/permissions then retry."
      );
    }
    if (accessToken) {
      const info = await oauth.getTokenInfo(accessToken);
      console.log("\nScopes actually granted:");
      for (const scope of info.scopes ?? []) console.log("  -", scope);
    }
  } catch (error) {
    console.error(
      "\nToken exchange failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

void main();