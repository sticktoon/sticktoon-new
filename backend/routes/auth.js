const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { resetPasswordEmail } = require("../utils/emailTemplates");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

const getJwtInvalidBefore = () => {
  const raw = process.env.JWT_INVALID_BEFORE;
  if (!raw) return 0;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Math.floor(parsed);
};

const resolveFrontendBaseUrl = (req) => {
  const bodyFrontendUrl = req.body?.frontendUrl;
  const requestOrigin = req.get("origin");
  const fallbackUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const candidates = [bodyFrontendUrl, requestOrigin, fallbackUrl];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed URLs
    }
  }

  return "http://localhost:3000";
};

/* =========================
   SIGNUP (EMAIL + PASSWORD)
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name?.trim() || email.split("@")[0],
      email,
      phone: phone ? String(phone).trim() : "",
      password: hashed,
      provider: "credentials",
      role: "user",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Generate same token as refresh token (for simplicity, they use same secret)
    // In production, you'd use a different expiry like 30 days
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.signup",
      category: "auth",
      message: `${user.email} created an account`,
      meta: { provider: "credentials" },
    });

    res.status(201).json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    // `email` field carries the identifier — either an email or a phone number.
    const { email, password } = req.body;
    const identifier = email;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/phone and password required" });
    }

    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes("@");
    const query = isEmail
      ? { email: cleanId.toLowerCase() }
      : { phone: cleanId };
    const cleanEmail = cleanId.toLowerCase();
    const user = await User.findOne(query).select("+password");

    // Failed attempts are logged against the typed email, since there may be no
    // account behind it. Never log the password that was tried.
    const logFailure = (reason) =>
      logActivity({
        req,
        actor: { email: cleanEmail, role: "guest" },
        action: "auth.login",
        category: "auth",
        status: "failure",
        message: `Failed login for ${cleanEmail}`,
        meta: { reason },
      });

    if (!user) {
      await logFailure("no_such_user");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // If no password set, allow them to set one or use Google
    if (!user.password) {
      await logFailure("no_password_set");
      return res.status(400).json({
        message: "No password set for this account. Please use Google login or reset your password."
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logFailure("wrong_password");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.login",
      category: "auth",
      message: `${user.email} logged in`,
      meta: { provider: "credentials" },
    });

    res.json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* =========================
   GOOGLE LOGIN
========================= */
router.post("/google", async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Google login failed" });
    }

    let user = await User.findOne({ email });
    const isNewAccount = !user;

    if (!user) {
      // Create new user with Google provider
      user = await User.create({
        name: name?.trim() || email.split("@")[0],
        email,
        provider: "google",
        avatar,
        role: "user",
      });
    } else {
      // User exists - update provider to Google if it was credentials
      if (user.provider === "credentials") {
        user.provider = "google";
      }
      // Update avatar if provided
      if (avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: isNewAccount ? "auth.signup" : "auth.login",
      category: "auth",
      message: isNewAccount
        ? `${user.email} created an account via Google`
        : `${user.email} logged in via Google`,
      meta: { provider: "google" },
    });

    res.json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
});

/* =========================
   FORGOT PASSWORD (FIXED EMAIL)
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${resolveFrontendBaseUrl(
      req
    )}/reset-password/${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#020617;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6);">

          <!-- HEADER -->
          <tr>
            <td style="padding:30px;text-align:center;">
              <div style="
                width:48px;
                height:48px;
                background:#2563eb;
                border-radius:50%;
                color:#fff;
                font-size:28px;
                line-height:48px;
                margin:0 auto 20px;
              ">+</div>

              <h2 style="color:#ffffff;margin:0 0 10px;">
                Reset your StickToon password
              </h2>

              <p style="color:#94a3b8;font-size:14px;margin:0;">
                You requested a password reset. Click the button below to set a new password.
              </p>
            </td>
          </tr>

          <!-- BUTTON -->
          <tr>
            <td align="center" style="padding:30px;">
              <a href="${resetUrl}"
                 style="
                   display:inline-block;
                   padding:14px 28px;
                   background:#111827;
                   color:#ffffff;
                   text-decoration:none;
                   border-radius:12px;
                   font-weight:bold;
                   font-size:14px;
                 ">
                Reset Password
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px;text-align:center;color:#64748b;font-size:12px;">
              This link expires in 15 minutes.<br/>
              If you didn’t request this, you can safely ignore this email.<br/><br/>
              © ${new Date().getFullYear()} StickToon
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const { resetPasswordEmail } = require("../utils/emailTemplates");


await sendEmail({
  to: user.email,
  subject: "Reset your StickToon password",
  html: resetPasswordEmail({ resetUrl }),
});


    res.json({ message: "Reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});


/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    logActivity({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      action: "auth.password_reset",
      category: "auth",
      message: `${user.email} reset their password via email link`,
    });

    res.json({ message: "Password reset successful", role: user.role });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Reset password failed" });
  }
});

/* =========================
   GET PROFILE
========================= */
const auth = require("../middleware/auth");

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar,
      role: user.role,
      addresses: user.addresses || [],
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

/* =========================
   UPDATE PROFILE
========================= */
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, avatar, phone } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name !== undefined) {
      user.name = name.trim();
    }
    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }
    if (avatar !== undefined) {
      user.avatar = avatar; // Can be URL or null to remove
    }

    await user.save();

    // Return updated user data
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/* =========================
   UPLOAD AVATAR (Base64)
========================= */
router.post("/upload-avatar", auth, async (req, res) => {
  try {
    const { avatar } = req.body; // Base64 string
    const userId = req.user.id;

    if (!avatar) {
      return res.status(400).json({ message: "Avatar is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    );

    res.json({
      success: true,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});

/* =========================
   REFRESH TOKEN
========================= */
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const secret = process.env.JWT_SECRET;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    if (!secret) {
      console.error("CRITICAL: JWT_SECRET not set in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(refreshToken, secret);
    const invalidBefore = getJwtInvalidBefore();

    if (invalidBefore > 0) {
      const issuedAt = Number(decoded.iat || 0);
      if (!issuedAt || issuedAt < invalidBefore) {
        return res.status(401).json({ message: "Session expired. Please login again" });
      }
    }
    
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: newAccessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

module.exports = router;
