import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requestEmailVerification, verifyEmailToken } from "../services/emailVerification.js";
import { logAudit } from "../utils/auditLogger.js";

export function createEmailVerificationRouter({ request = requestEmailVerification, verify = verifyEmailToken, audit = logAudit } = {}) {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many verification attempts. Please try again in 15 minutes." } }));
  router.post("/resend-verification", async (req, res) => {
    const input = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Enter a valid email address." });
    await request(input.data.email);
    return res.json({ message: "If your account needs verification, a new link will be emailed to you. Check your inbox and spam folder. Please wait one minute before requesting another link." });
  });
  router.post("/verify-email", async (req, res) => {
    const input = z.strictObject({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(req.body);
    const user = input.success ? await verify(input.data.token) : null;
    if (!user) return res.status(400).json({ message: "This verification link is invalid, expired, or already used. Try signing in if you already verified, or request a new link." });
    await audit({ req, actorId: user._id, actorRole: user.role, action: "EMAIL_VERIFIED", targetType: "User", targetId: user._id });
    return res.json({ message: "Your email is verified and your account is active. You can now sign in." });
  });
  return router;
}

export default createEmailVerificationRouter();
