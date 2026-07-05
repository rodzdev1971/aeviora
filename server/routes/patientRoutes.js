import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Patient from '../models/patients.js';

const router = express.Router();

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

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !password
    ) {
      return res.status(400).json({
        message: "Please complete all required fields.",
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        message: "Password must be at least 10 characters.",
      });
    }

    const existingPatient = await Patient.findOne({ email });

    if (existingPatient) {
      return res.status(409).json({
        message: "A patient account with this email already exists.",
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
    });

    return res.status(201).json({
      message: "Patient registered successfully.",
      patient: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        selectedProtocol: patient.selectedProtocol,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Server error during registration.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      patient.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        patientId: patient._id,
        role: patient.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.json({
      message: "Login successful.",
      token,
      patient: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        selectedProtocol: patient.selectedProtocol,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const patients = await Patient.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.json(patients);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch patients.",
    });
  }
});

export default router;