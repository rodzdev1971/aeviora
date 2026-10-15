import express from "express";
import EmailTemplate from "../models/emailTemplates.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import { registerAccount, RegistrationError } from "../services/registration.js";
import { registrationConfig } from "../config/registration.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { logAudit } from "../utils/auditLogger.js";
import { requestEmailVerification, verificationStatus } from "../services/emailVerification.js";

const router = express.Router();

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax", // Allow top-level navigation back from Stripe.
    maxAge: 15 * 60 * 1000,
  };
}

router.get("/registration-config", (req, res) => {
  try { res.json(registrationConfig()); }
  catch { res.status(503).json({ message: "Registration is not configured yet." }); }
});

router.post("/register", async (req, res) => {
  try {
    const user = await registerAccount(req.body);
    let template;
    try { template = await EmailTemplate.findById("registration").lean(); }
    catch { console.warn("Registration template unavailable; using default."); }
    const verificationEmail = await requestEmailVerification(user.email, { template });
    await logAudit({ req, actorId: user._id, actorRole: user.role, action: "USER_CREATED", targetType: "User", targetId: user._id });
    return res.status(201).json({
      message: verificationEmail === "accepted"
        ? "Account created. A verification link has been sent to your email. Check your inbox and spam folder, and verify within 24 hours to activate your account."
        : "Account created, but we could not send your verification email. Request a new link below or contact Aeviora Wellness for help.",
      verificationEmail,
      userId: user._id, accountStatus: user.accountStatus,
    });
  } catch (error) {
    if (error instanceof RegistrationError) return res.status(error.status).json({ message: error.message, fields: error.fields });
    return res.status(500).json({ message: "Registration is unavailable. Please try again later." });
  }
});

router.post("/login", async (req, res) => {

  // return res.json({
  //     message: "Login successful.",
  //     user: {
  //       id: 1111,
  //       firstName: "demo",
  //       lastName: "demo",
  //       email: "demo@example.com",
  //       role: 'admin',
  //     },
  //   });

  try {
    const input = z.strictObject({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Enter a valid email and password." });
    const { email, password } = input.data;

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      await logAudit({
        req,
        action: "LOGIN_FAILED",
        metadata: { email },
      });

      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await logAudit({
        req,
        actorId: user._id,
        actorRole: user.role,
        action: "LOGIN_FAILED",
        metadata: { email },
      });

      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.emailVerificationRequired && !user.emailVerifiedAt && ["pending", "active"].includes(user.accountStatus)) {
      return res.status(403).json({ message: verificationStatus(user) === "not_verified"
        ? "Your registration is not verified. The 24-hour verification period has ended. Request a new verification link or contact Aeviora Wellness."
        : "Please verify your email before signing in. Check your inbox or request a new verification link." });
    }
    if (user.accountStatus !== "active") {
      return res.status(403).json({ message: user.accountStatus === "pending" ? "Account activation is pending." : "This account is unavailable." });
    }
    const accessToken = createAccessToken(user);

    res.cookie("accessToken", accessToken, cookieOptions());

    await logAudit({
      req,
      actorId: user._id,
      actorRole: user.role,
      action: "LOGIN_SUCCESS",
      targetType: "User",
      targetId: user._id.toString(),
    });

    return res.json({
      message: "Login successful.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed." });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  res.clearCookie("accessToken");

  await logAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user.role,
    action: "LOGOUT",
  });

  return res.json({ message: "Logged out successfully." });
});

export default router;
