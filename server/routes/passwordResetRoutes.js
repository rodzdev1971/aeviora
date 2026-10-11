import express from "express";
import rateLimit from "express-rate-limit";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/users.js";
import { passwordChangeSchema } from "../../shared/registration.js";
import { sendEmail, emailFailure } from "../services/email.js";

const digest = (token) => createHash("sha256").update(token).digest("hex");
export const resetInput = z.strictObject({ token: z.string().regex(/^[a-f0-9]{64}$/), newPassword: passwordChangeSchema.shape.newPassword });
export function createPasswordResetRouter({ users = User, send = sendEmail, hash = (password) => bcrypt.hash(password, 12), origin = () => process.env.FRONTEND_ORIGIN } = {}) {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many recovery attempts. Try again later." } }));
  router.post("/forgot-password", async (req, res) => {
    const parsed = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a valid email address." });
    try {
      const base = new URL(origin());
      if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.hostname === "localhost" && base.protocol === "http:")) throw new Error("Invalid origin");
      const token = randomBytes(32).toString("hex");
      const now = new Date();
      const user = await users.findOneAndUpdate({ email: parsed.data.email, accountStatus: { $in: ["active", "pending"] },
        $or: [{ resetRequestedAt: { $exists: false } }, { resetRequestedAt: { $lt: new Date(now.getTime() - 60000) } }] },
      { $set: { resetTokenHash: digest(token), resetExpiresAt: new Date(now.getTime() + 30 * 60 * 1000), resetRequestedAt: now } }, { new: true });
      if (user) {
        const url = new URL("/reset-password", base);
        url.hash = token;
        await send({ to: user.email, subject: "Reset your Aeviora Wellness password", text: `A password reset was requested for your account.\n\nOpen this link to choose a new password (expires in 30 minutes):\n${url}\n\nThis link can be used once. If you did not request this, ignore this email. Your password has not changed.` });
      }
    } catch (error) { console.warn("Password recovery:", emailFailure(error)); }
    return res.json({ message: "If an eligible account exists, a password reset link will be emailed to you. Check your inbox and spam folder." });
  });
  router.post("/reset-password", async (req, res) => {
    const parsed = resetInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Use a valid reset link and a password of at least 12 characters, at most 72 UTF-8 bytes." });
    const passwordHash = await hash(parsed.data.newPassword);
    const user = await users.findOneAndUpdate({ resetTokenHash: digest(parsed.data.token), resetExpiresAt: { $gt: new Date() }, accountStatus: { $in: ["active", "pending"] } },
      { $set: { passwordHash }, $inc: { sessionVersion: 1 }, $unset: { resetTokenHash: "", resetExpiresAt: "" } }, { new: true });
    if (!user) return res.status(400).json({ message: "This reset link is invalid or expired. Request a new link." });
    res.clearCookie("accessToken");
    return res.json({ message: "Password updated. Sign in with your new password. Pending accounts still require activation." });
  });
  return router;
}
export default createPasswordResetRouter();
