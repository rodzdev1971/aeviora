import { randomBytes, createHash } from "node:crypto";
import { BusinessAffiliate } from "../models/referrals.js";
import { sendEmail, emailFailure } from "./email.js";

export const businessLoginDigest = (token) => createHash("sha256").update(token).digest("hex");
export const BUSINESS_LOGIN_LIFETIME = 15 * 60000;
export const businessSessionAudience = "aeviora-business-portal";
export const businessSessionCookie = "businessPortalSession";
export const businessCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/business-portal" });

export async function requestBusinessLogin(email, { businesses = BusinessAffiliate, send = sendEmail, now = new Date(), origin = process.env.FRONTEND_ORIGIN, report = (category) => console.warn("Business portal email:", category) } = {}) {
  try {
    const base = new URL(origin);
    if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.hostname === "localhost" && base.protocol === "http:")) throw new Error("Invalid frontend origin");
    // One email can manage multiple businesses. Use a stable anchor record for
    // email authentication; the portal scopes every business lookup to this email.
    const anchor = await businesses.findOne({ email }).sort({ _id: 1 });
    if (!anchor) return "skipped";
    const token = randomBytes(32).toString("hex");
    const tokenHash = businessLoginDigest(token);
    const business = await businesses.findOneAndUpdate({ _id: anchor._id, email,
      $or: [{ portalLoginRequestedAt: { $exists: false } }, { portalLoginRequestedAt: { $lte: new Date(now.getTime() - 60000) } }],
    }, { $set: { portalLoginTokenHash: tokenHash, portalLoginEmail: email, portalLoginExpiresAt: new Date(now.getTime() + BUSINESS_LOGIN_LIFETIME), portalLoginRequestedAt: now } }, { new: true });
    if (!business) return "skipped";
    const link = new URL("/business-affiliate/login", base); link.hash = token;
    try {
      await send({ to: email, subject: "Sign in to your Aeviora Wellness business affiliate portal", text: `A sign-in link was requested for your business affiliate portal.\n\nOpen this private link and select Sign in to business portal:\n${link}\n\nOr enter this sign-in code at ${link.origin}${link.pathname}:\n${token}\n\nThis link expires in 15 minutes and can be used once. It provides access to businesses registered with this email address. Keep it private. If you did not request it, ignore this email.\n\nAeviora Wellness` });
    } catch (error) {
      await businesses.updateOne({ _id: business._id, portalLoginTokenHash: tokenHash }, { $unset: { portalLoginRequestedAt: "", portalLoginTokenHash: "", portalLoginEmail: "", portalLoginExpiresAt: "" } });
      throw error;
    }
    return "accepted";
  } catch (error) { report(emailFailure(error)); return "failed"; }
}

export async function consumeBusinessLogin(token, { businesses = BusinessAffiliate, now = new Date() } = {}) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token.trim())) return null;
  return businesses.findOneAndUpdate({ portalLoginTokenHash: businessLoginDigest(token.trim().toLowerCase()), portalLoginExpiresAt: { $gt: now }, $expr: { $eq: ["$email", "$portalLoginEmail"] } },
    { $unset: { portalLoginTokenHash: "", portalLoginEmail: "", portalLoginExpiresAt: "" } }, { new: true }).select("+portalSessionVersion");
}

export const portalBusinessDetails = (business) => Object.fromEntries(["_id", "businessName", "contactName", "email", "phone", "website", "code", "enabled", "discountPercent", "commissionPercent", "commissionMode", "createdAt"].map((key) => [key, business[key]]));
// Do not expose customer IDs, payment-provider IDs or bank references embedded
// in reward primary keys. A business sees only its own financial activity.
export const portalRewardDetails = (reward) => Object.fromEntries(["code", "method", "planName", "baseCents", "rewardCents", "reversedCents", "paidCents", "paymentAt", "paidAt", "payoutReference"].map((key) => [key, reward[key]]));
