import express from "express";
import Patient from "../models/Patient.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const patient = await Patient.findById(req.user.id).select("-passwordHash");

  if (!patient) {
    return res.status(404).json({ message: "Patient not found." });
  }

  await logAudit({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "PATIENT_VIEWED",
    targetType: "Patient",
    targetId: patient._id.toString(),
  });

  return res.json({ patient });
});

router.get(
  "/",
  requireAuth,
  requireRole("provider", "admin"),
  async (req, res) => {
    const patients = await Patient.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    await logAudit({
      req,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "PATIENT_VIEWED",
      targetType: "PatientList",
    });

    return res.json({ patients });
  }
);

router.get("/me/summary", requireAuth, async (req, res) => {
  const patient = await Patient.findById(req.user.id).select(
    "firstName selectedProtocol createdAt"
  );

  return res.json({
    firstName: patient.firstName,
    selectedProtocol: patient.selectedProtocol,
    memberSince: patient.createdAt,
  });
});

router.patch("/me", requireAuth, async (req, res) => {
  const allowedFields = [
    "phone",
    "selectedProtocol",
    "medicalHistory",
    "medications",
    "allergies",
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const patient = await Patient.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  }).select("-passwordHash");

  await logAudit({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "PATIENT_UPDATED",
    targetType: "Patient",
    targetId: patient._id.toString(),
    metadata: {
      updatedFields: Object.keys(updates),
    },
  });

  return res.json({ message: "Profile updated.", patient });
});

export default router;