const http = require("http");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI || "http://localhost:3006/oauth2callback";

if (!clientId || !clientSecret) {
  console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ["https://www.googleapis.com/auth/gmail.compose"];

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

console.log("\n=======================================================");
console.log("🔐 AUTHORIZE DEDICATED GMAIL ACCOUNT: orders.sticktoon@gmail.com");
console.log("=======================================================\n");
console.log("Open this URL in your browser logged into orders.sticktoon@gmail.com:\n");
console.log(authUrl);
console.log("\nWaiting for OAuth callback on:", redirectUri, "\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri);
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing authorization code in callback.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #10b981;">✅ Authorization Successful!</h1>
        <p>Gmail API permissions granted for orders.sticktoon@gmail.com.</p>
        <p>You can close this tab and return to Sticktoon.</p>
      </div>
    `);

    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      console.log("\n⚠️ No refresh token returned. Re-run script and ensure you approve prompt=consent.");
      return;
    }

    const envPath = path.resolve(__dirname, "../.env");
    upsertEnvVar(envPath, "GMAIL_REFRESH_TOKEN", refreshToken);

    console.log("\n✅ Saved GMAIL_REFRESH_TOKEN to backend/.env");
    console.log("Restart backend server to apply changes.");
  } catch (err) {
    console.error("❌ Token exchange failed:", err.message);
  } finally {
    server.close();
  }
});

server.listen(3006, () => {
  console.log("OAuth callback server listening on http://localhost:3006");
});
