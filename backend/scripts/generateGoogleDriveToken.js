const http = require("http");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3005/oauth2callback";

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ["https://www.googleapis.com/auth/drive"];

function upsertEnvVar(filePath, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyRegex = new RegExp(`^${escapedKey}=.*$`, "m");

  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }

  const newLine = `${key}=${value}`;
  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, newLine);
  } else {
    content = `${content.trim()}\n${newLine}\n`;
  }

  fs.writeFileSync(filePath, content, "utf8");
}

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
});

console.log("\nOpen this URL in your browser and allow access:\n");
console.log(authUrl);
console.log("\nWaiting for OAuth callback on:", redirectUri, "\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri);
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing code in callback.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Google Drive auth successful. You can close this tab.");

    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      console.log("\nNo refresh token returned. Revoke app access and retry with prompt=consent.");
      return;
    }

    const envPath = path.resolve(__dirname, "../.env");
    upsertEnvVar(envPath, "GOOGLE_DRIVE_REFRESH_TOKEN", refreshToken);

    console.log("\n✅ Saved GOOGLE_DRIVE_REFRESH_TOKEN to backend/.env");
    console.log("Restart backend and retest upload.");
  } catch (err) {
    console.error("Token exchange failed:", err.message);
  } finally {
    server.close();
  }
});

server.listen(3005, () => {
  console.log("OAuth callback server listening on http://localhost:3005");
});
