const Razorpay = require("razorpay");

const razorpayMode = (process.env.RAZORPAY_MODE || "live").toLowerCase();
const isTestMode = razorpayMode === "test";

const razorpayKeyId = isTestMode
  ? process.env.RAZORPAY_TEST_KEY_ID
  : process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID;

const razorpayKeySecret = isTestMode
  ? process.env.RAZORPAY_TEST_KEY_SECRET
  : process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error(
    `Missing Razorpay credentials for mode "${razorpayMode}". ` +
      `Set ${isTestMode ? "RAZORPAY_TEST_KEY_ID/RAZORPAY_TEST_KEY_SECRET" : "RAZORPAY_LIVE_KEY_ID/RAZORPAY_LIVE_KEY_SECRET (or legacy RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)"}.`
  );
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

module.exports = {
  razorpay,
  razorpayMode,
  razorpayKeyId,
  razorpayKeySecret,
};
