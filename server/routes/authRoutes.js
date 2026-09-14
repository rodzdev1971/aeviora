import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import { registerAccount, RegistrationError } from "../services/registration.js";
import { registrationConfig } from "../config/registration.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
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
    sameSite: isProduction ? "strict" : "lax",
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
    await logAudit({ req, actorId: user._id, actorRole: user.role, action: "USER_CREATED", targetType: "User", targetId: user._id });
    return res.status(201).json({
      message: user.accountStatus === "pending" ? "Account created. Activation is pending." : "Account created. You can now sign in.",
      userId: user._id, accountStatus: user.accountStatus,
    });
  } catch (error) {
    if (error instanceof RegistrationError) return res.status(error.status).json({ message: error.message, fields: error.fields });
    return res.status(500).json({ message: "Registration is unavailable. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
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