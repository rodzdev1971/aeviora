import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/users.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { passwordChangeSchema, profileUpdateSchema } from "../../shared/registration.js";

// The legacy /api/patients mount remains an alias for account-only APIs.
// Existing documents in the patients collection are not read or migrated here.
const router = express.Router();
const publicFields = "_id firstName lastName email phone addressLine1 addressLine2 city state zipCode country preferredLanguage communicationPreference timeZone is18OrOlder termsAcceptance privacyAcceptance smsConsent marketingConsent accountStatus role createdAt updatedAt";

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select(publicFields);
  if (!user) return res.status(404).json({ message: "Account not found." });
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "USER_VIEWED", targetType: "User", targetId: user._id });
  return res.json({ user });
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await User.find().select(publicFields).sort({ createdAt: -1 }).limit(100);
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "USER_VIEWED", targetType: "UserList" });
  return res.json({ users });
});

router.get("/me/summary", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("firstName accountStatus createdAt");
  if (!user) return res.status(404).json({ message: "Account not found." });
  return res.json({ firstName: user.firstName, accountStatus: user.accountStatus, memberSince: user.createdAt });
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) return res.status(400).json({ message: "Provide valid editable account fields." });
  const user = await User.findByIdAndUpdate(req.user.id, { $set: parsed.data }, { new: true, runValidators: true }).select(publicFields);
  if (!user) return res.status(404).json({ message: "Account not found." });
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "USER_UPDATED", targetType: "User", targetId: user._id, metadata: { updatedFields: Object.keys(parsed.data) } });
  return res.json({ message: "Account updated.", user });
});

router.post("/me/password", requireAuth, async (req, res) => {
  const parsed = passwordChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a valid new password." });
  if (parsed.data.currentPassword === parsed.data.newPassword) return res.status(400).json({ message: "The new password must be different." });

  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!user) return res.status(404).json({ message: "Account not found." });
  if (!await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) {
    await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "PASSWORD_CHANGED", metadata: { result: "rejected" } });
    return res.status(401).json({ message: "The current password is incorrect." });
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await user.save();
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "PASSWORD_CHANGED", metadata: { result: "completed" } });
  return res.json({ message: "Password changed successfully." });
});

export default router;
