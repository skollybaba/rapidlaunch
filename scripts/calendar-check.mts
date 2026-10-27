import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

console.log("GOOGLE_CLIENT_ID present:", Boolean(clientId));
console.log("GOOGLE_CLIENT_SECRET present:", Boolean(clientSecret));
console.log("GOOGLE_REFRESH_TOKEN present:", Boolean(refreshToken));

if (!clientId || !clientSecret || !refreshToken) {
  console.error(
    "\nMissing Google credentials. Run with: npm run calendar:check"
  );
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret);
oauth.setCredentials({ refresh_token: refreshToken });

try {
  const { token } = await oauth.getAccessToken();
  console.log("\nRefresh token is valid.");
  console.log("Access token issued:", Boolean(token));
  console.log(
    "expiry_date:",
    oauth.credentials.expiry_date
      ? new Date(oauth.credentials.expiry_date).toISOString()
      : "unknown"
  );
} catch (error) {
  console.error("\nRefresh token is NOT valid.");
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "\nGenerate a new one:  npm run calendar:auth  then  npm run calendar:token"
  );
  process.exit(1);
}
