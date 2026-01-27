const { Cashfree } = require("cashfree-pg");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;

/**
 * IMPORTANT:
 * In CommonJS + Node 22, do NOT use Environment or PGEnvironment.
 * Use string values instead.
 */

// Cashfree.XEnvironment = "sandbox";
// module.exports = Cashfree;
