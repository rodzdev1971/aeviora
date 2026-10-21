import { randomBytes, createHash } from "node:crypto";
import User from "../models/users.js";
import { sendEmail, emailFailure } from "./email.js";
import { registrationTemplate, renderEmailTemplate } from "../../shared/emailTemplates.js";
import { formLinkEmail, loadTemplateFormLinks } from "./formLinks.js";

export const VERIFICATION_LIFETIME = 24 * 60 * 60 * 1000;
export const verificationDigest = (token) => createHash("sha256").update(token).digest("hex");

// Compute from the persisted deadline so expiry is exact, including on serverless hosts.
export function verificationStatus(user, now = new Date()) {
  if (user.emailVerifiedAt) return "verified";
  if (!user.emailVerificationRequired) return "legacy";
  return user.emailVerificationExpiresAt && new Date(user.emailVerificationExpiresAt) > now ? "pending" : "not_verified";
}

export async function requestEmailVerification(email, {
  users = User, send = sendEmail, now = new Date(), origin = process.env.FRONTEND_ORIGIN, template,
  resolveForms = loadTemplateFormLinks,
  report = (category) => console.warn("Verification email:", category),
} = {}) {
  try {
    const base = new URL(origin);
    if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.protocol === "http:" && base.hostname === "localhost")) throw new Error("Invalid frontend origin");
    const token = randomBytes(32).toString("hex");
    const tokenHash = verificationDigest(token);
    const user = await users.findOneAndUpdate({
      email, accountStatus: { $in: ["pending", "active"] }, emailVerifiedAt: null,
      emailVerificationRequired: true,
      $or: [{ emailVerificationRequestedAt: { $exists: false } }, { emailVerificationRequestedAt: { $lte: new Date(now.getTime() - 60000) } }],
    }, { $set: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME),
      emailVerificationRequestedAt: now,
    } }, { new: true });
    if (!user) return "skipped";
    const url = new URL("/verify-email", base);
    url.hash = token;
    try {
      const savedForms = await resolveForms(template || registrationTemplate);
      await send({ to: user.email, subject: "Verify your Aeviora Wellness account",
        ...formLinkEmail(`Verify your email to activate your account:\n${url}\n\nOpen the link and select Verify my email. This single-use link expires in 24 hours. After that, your registration will be marked Not verified; you can request a new link from the sign-in page.\n\nIf you did not create this account, ignore this email.\n\n${renderEmailTemplate(template || registrationTemplate, { firstName: user.firstName, lastName: user.lastName, accountStatus: "pending" }).text}`, savedForms) });
    } catch (error) {
      // Permit an immediate retry after a confirmed send failure, without changing a newer request.
      await users.updateOne({ _id: user._id, emailVerificationTokenHash: tokenHash }, { $unset: { emailVerificationRequestedAt: "" } });
      throw error;
    }
    return "accepted";
  } catch (error) {
    report(emailFailure(error));
    return "failed";
  }
}

export async function verifyEmailToken(token, { users = User, now = new Date() } = {}) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return users.findOneAndUpdate({
    emailVerificationTokenHash: verificationDigest(token), emailVerificationExpiresAt: { $gt: now },
    emailVerifiedAt: null, emailVerificationRequired: true, accountStatus: { $in: ["pending", "active"] },
  }, { $set: { emailVerifiedAt: now, emailVerificationMethod: "email", accountStatus: "active" },
    $unset: { emailVerificationTokenHash: "", emailVerificationRequestedAt: "" },
  }, { new: true });
}

export async function manuallyVerifyAccount(id, adminId, { users = User, now = new Date() } = {}) {
  return users.findOneAndUpdate({ _id: id, emailVerifiedAt: null, accountStatus: { $in: ["pending", "active"] } }, {
    $set: { emailVerifiedAt: now, emailVerificationMethod: "admin", emailVerifiedBy: adminId, accountStatus: "active" },
    $unset: { emailVerificationTokenHash: "", emailVerificationRequestedAt: "" },
  }, { new: true });
}
