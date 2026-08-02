import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
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

router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      selectedProtocol,
      hipaaAcknowledged,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !dateOfBirth || !password) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }

    if (password.length < 12) {
      return res.status(400).json({
        message: "Password must be at least 12 characters.",
      });
    }

    const existingUser = await Patient.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const patient = await Patient.create({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      passwordHash,
      selectedProtocol,
      hipaaAcknowledged,
      role: "patient",
    });

    await logAudit({
      req,
      actorId: patient._id,
      actorRole: patient.role,
      action: "PATIENT_CREATED",
      targetType: "Patient",
      targetId: patient._id.toString(),
    });

    return res.status(201).json({
      message: "Patient account created.",
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await Patient.findOne({ email }).select("+passwordHash");

    if (!patient) {
      await logAudit({
        req,
        action: "LOGIN_FAILED",
        metadata: { email },
      });

      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, patient.passwordHash);

    if (!isValid) {
      await logAudit({
        req,
        actorId: patient._id,
        actorRole: patient.role,
        action: "LOGIN_FAILED",
        metadata: { email },
      });

      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accessToken = createAccessToken(patient);

    res.cookie("accessToken", accessToken, cookieOptions());

    await logAudit({
      req,
      actorId: patient._id,
      actorRole: patient.role,
      action: "LOGIN_SUCCESS",
      targetType: "Patient",
      targetId: patient._id.toString(),
    });

    return res.json({
      message: "Login successful.",
      user: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        role: patient.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed." });
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie("accessToken");

  await logAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.role || "system",
    action: "LOGOUT",
  });

  return res.json({ message: "Logged out successfully." });
});

export default router;