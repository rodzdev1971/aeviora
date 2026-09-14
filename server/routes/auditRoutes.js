import express from "express";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);

  return res.json({ logs });
});

export default router;