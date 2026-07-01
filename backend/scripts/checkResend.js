// Diagnostic: validate Resend API key + sender domain. Sends NO email.
// Run: node scripts/checkResend.js
require("dotenv").config();
const { Resend } = require("resend");

const KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "";
const fromDomain = FROM_EMAIL.split("@")[1] || "";

(async () => {
  console.log("RESEND_API_KEY present:", !!KEY, KEY ? `(length ${KEY.length}, re_ prefix: ${KEY.startsWith("re_")})` : "");
  console.log("FROM_EMAIL:", FROM_EMAIL, "-> domain:", fromDomain);
  console.log("FROM_NAME:", process.env.FROM_NAME);
  console.log("-----");

  if (!KEY) {
    console.error("No RESEND_API_KEY -> emails cannot be sent.");
    return;
  }

  const resend = new Resend(KEY);

  // Validate key + list verified domains
  const { data, error } = await resend.domains.list();

  if (error) {
    console.error("❌ API key check FAILED:", JSON.stringify(error));
    return;
  }

  console.log("✅ API key VALID.");
  const domains = data?.data || [];
  if (!domains.length) {
    console.error("❌ No domains added in Resend yet.");
    console.error("   -> You cannot send from a real address until a domain is added + verified.");
    console.error("   -> Quick test option: set FROM_EMAIL=onboarding@resend.dev (only delivers to the account owner's email).");
    return;
  }

  console.log("Domains in Resend:");
  domains.forEach((d) => console.log(`   - ${d.name}  status=${d.status}`));

  if (fromDomain.toLowerCase() === "gmail.com") {
    console.error(`❌ FROM_EMAIL uses gmail.com -> Resend will REJECT this. Use an address on a verified domain (e.g. noreply@${domains[0]?.name || "yourdomain"}).`);
    return;
  }

  const match = domains.find((d) => (d.name || "").toLowerCase() === fromDomain.toLowerCase());
  if (!match) {
    console.error(`❌ FROM_EMAIL domain "${fromDomain}" is NOT in Resend -> sends will fail.`);
  } else if (match.status !== "verified") {
    console.error(`⚠️ Domain "${fromDomain}" exists but status is "${match.status}" (not verified). Add the DNS records in Resend.`);
  } else {
    console.log(`✅ FROM_EMAIL domain "${fromDomain}" is verified. Good to send.`);
  }
})();
