const axios = require("axios");
const zlib = require("zlib");
const { promisify } = require("util");

const gunzip = promisify(zlib.gunzip);

/**
 * The bits of Amazon's Selling Partner API the revenue sync needs: swap the
 * refresh token for an access token, list settlement reports, download one.
 *
 * Amazon dropped AWS request signing for SP-API in 2023, so this is plain HTTPS
 * with a bearer token - no AWS account or IAM role involved.
 */
class SpApiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Amazon generates these on its own schedule; we only list and download them.
const SETTLEMENT_REPORT_TYPE = "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2";

const endpoint = () => process.env.AMAZON_SPAPI_ENDPOINT || "https://sellingpartnerapi-eu.amazon.com";
const marketplaceId = () => process.env.AMAZON_MARKETPLACE_ID || "A21TJRUUN4KGV"; // Amazon.in

const spApiConfigured = () =>
  Boolean(process.env.AMAZON_LWA_CLIENT_ID && process.env.AMAZON_LWA_CLIENT_SECRET && process.env.AMAZON_REFRESH_TOKEN);

// Never log an axios error object here: its config carries the client secret
// and the access token.
const reason = (err) => err.response?.data?.error_description || err.response?.data?.errors?.[0]?.message || err.code || err.message;

// Access tokens last an hour, so one is kept in memory instead of trading the
// refresh token on every call.
let cached = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (!spApiConfigured()) {
    throw new SpApiError("Amazon auto-sync isn't set up yet. Add the Amazon keys to the backend settings.", 503);
  }
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;

  try {
    const { data } = await axios.post(
      "https://api.amazon.com/auth/o2/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.AMAZON_REFRESH_TOKEN,
        client_id: process.env.AMAZON_LWA_CLIENT_ID,
        client_secret: process.env.AMAZON_LWA_CLIENT_SECRET,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
    );
    cached = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(60, (Number(data.expires_in) || 3600) - 60) * 1000,
    };
    return cached.token;
  } catch (err) {
    console.error("Amazon sign-in failed:", err.response?.status, reason(err));
    throw new SpApiError("Amazon refused the app keys. Check the client ID, secret and refresh token.", 502);
  }
}

async function spApiGet(path, params) {
  const token = await getAccessToken();
  try {
    const { data } = await axios.get(`${endpoint()}${path}`, {
      params,
      headers: { "x-amz-access-token": token, accept: "application/json" },
      timeout: 30000,
    });
    return data;
  } catch (err) {
    const status = err.response?.status;
    console.error("Amazon API call failed:", path, status, reason(err));
    if (status === 401 || status === 403) {
      cached = { token: null, expiresAt: 0 };
      throw new SpApiError("Amazon refused the request. Check that the app is authorized for this seller account.", 502);
    }
    if (status === 429) throw new SpApiError("Amazon is rate limiting us. Try again in a few minutes.", 503);
    throw new SpApiError("Couldn't reach Amazon. Try again.", 502);
  }
}

// ponytail: one page of 100 reports is months of settlements; add nextToken
// paging only if a sync ever has to catch up on more than that.
async function listSettlementReports({ createdSince }) {
  const data = await spApiGet("/reports/2021-06-30/reports", {
    reportTypes: SETTLEMENT_REPORT_TYPE,
    processingStatuses: "DONE",
    marketplaceIds: marketplaceId(),
    createdSince: new Date(createdSince).toISOString(),
    pageSize: 100,
  });
  return Array.isArray(data?.reports) ? data.reports : [];
}

// Report documents come back as a signed URL, sometimes gzipped.
const decodeReport = async (buffer, compressionAlgorithm) =>
  (compressionAlgorithm === "GZIP" ? await gunzip(buffer) : buffer).toString("utf8");

async function downloadReport(reportDocumentId) {
  const document = await spApiGet(`/reports/2021-06-30/documents/${encodeURIComponent(reportDocumentId)}`);
  if (!document?.url) throw new SpApiError("Amazon didn't return a download link for that report", 502);

  try {
    const { data } = await axios.get(document.url, { responseType: "arraybuffer", timeout: 60000 });
    return decodeReport(Buffer.from(data), document.compressionAlgorithm);
  } catch (err) {
    console.error("Amazon report download failed:", err.response?.status, reason(err));
    throw new SpApiError("Couldn't download the settlement report from Amazon.", 502);
  }
}

module.exports = {
  spApiConfigured,
  getAccessToken,
  listSettlementReports,
  downloadReport,
  decodeReport,
  SpApiError,
  SETTLEMENT_REPORT_TYPE,
};
