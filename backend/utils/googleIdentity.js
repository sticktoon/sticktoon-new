const axios = require("axios");

/**
 * Confirms a Google sign-in on the server. The browser sends the OAuth access
 * token it got from Google; we ask Google who that token belongs to and which
 * app it was issued to. The email the browser claims is never trusted - without
 * this, anyone could post someone else's email and be signed in as them.
 */
class GoogleSignInError extends Error {}

async function verifyGoogleAccessToken(accessToken) {
  // The storefront and admin panel sign in with the same OAuth client.
  const clientIds = [process.env.VITE_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID].filter(Boolean);
  if (!clientIds.length) throw new Error("GOOGLE_CLIENT_ID is not set on the server");

  if (typeof accessToken !== "string" || !accessToken) {
    throw new GoogleSignInError("Google sign-in failed. Please try again.");
  }

  let info;
  try {
    ({ data: info } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
      params: { access_token: accessToken },
      timeout: 8000,
    }));
  } catch {
    throw new GoogleSignInError("Google sign-in failed. Please try again.");
  }

  if (!clientIds.includes(info.aud) && !clientIds.includes(info.azp)) {
    throw new GoogleSignInError("Google sign-in failed. Please try again.");
  }
  if (!info.email || String(info.email_verified) !== "true") {
    throw new GoogleSignInError("Your Google account's email isn't verified.");
  }

  return { email: String(info.email).toLowerCase().trim() };
}

module.exports = { verifyGoogleAccessToken, GoogleSignInError };
