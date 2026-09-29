import express from "express";
import User from "../models/users.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();
const adminUserFields =
  "_id firstName lastName email phone accountStatus role createdAt";

router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 25);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({ message: "Use a page from 1 and a limit from 1 to 100." });
  }

  const [users, total] = await Promise.all([
    User.find()
      .select(adminUserFields)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(),
  ]);
  await logAudit({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "USER_VIEWED",
    targetType: "AdminUserList",
    metadata: { page, limit },
  });
  return res.json({ users, page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.delete(
  "/users/:id/admin-access",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(409).json({ message: "You cannot remove your own admin access." });
    }

    const targetIsAdmin = await User.countDocuments({
      _id: req.params.id,
      role: "admin",
    });
    if (!targetIsAdmin) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(409).json({ message: "At least one admin account must remain." });
    }

    const result = await User.updateOne(
      { _id: req.params.id, role: "admin" },
      { $set: { role: "user" } },
      { runValidators: true },
    );
    if (!result.matchedCount) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    await logAudit({
      req,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "ADMIN_ACCESS_REMOVED",
      targetType: "User",
      targetId: req.params.id,
    });
    return res.json({ message: "Admin access removed." });
  },
);

export default router;