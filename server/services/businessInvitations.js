import { randomBytes, createHash } from "node:crypto";
import BusinessInvitation from "../models/businessInvitation.js";
import { ReferralSettings } from "../models/referrals.js";
import { defaultReferralTerms, businessAffiliateInput } from "../../shared/referrals.js";
import { registerBusinessAffiliate, ReferralError } from "./referrals.js";
import { sendEmail, emailFailureMessage } from "./email.js";

export const invitationDigest = (code) => createHash("sha256").update(code).digest("hex");
export const invitationCode = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value.trim()) ? value.trim().toLowerCase() : null;
const unavailable = () => new ReferralError("This invitation is invalid, expired, revoked or already used. Ask Aeviora Wellness for a new invitation.", 410);
export const invitationTerms = (item) => ({ enabled: item.enabled, discountPercent: item.discountPercent, commissionPercent: item.commissionPercent, commissionMode: item.commissionMode });

export async function issueBusinessInvitation(input, { invitations = BusinessInvitation, settings = ReferralSettings, send = sendEmail, origin = process.env.FRONTEND_ORIGIN, adminId, now = new Date() } = {}) {
  let base;
  try { base = new URL(origin); } catch { throw new ReferralError("Configure FRONTEND_ORIGIN before sending business invitations.", 503); }
  if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.protocol === "http:" && base.hostname === "localhost")) throw new ReferralError("Configure a secure FRONTEND_ORIGIN before sending business invitations.", 503);
  const terms = await settings.findById("default").lean() || defaultReferralTerms;
  const code = randomBytes(32).toString("hex");
  const invitation = await invitations.create({ ...input, ...invitationTerms(terms), tokenHash: invitationDigest(code), expiresAt: new Date(now.getTime() + 7 * 86400000), createdBy: adminId });
  const url = new URL("/business-affiliate/register", base); url.hash = code;
  let delivery = "accepted", deliveryMessage = "Invitation accepted by the email service.";
  try {
    await send({ to: invitation.email, subject: "Invitation to join Aeviora Wellness as a business affiliate", text: `Hello ${invitation.businessName},\n\nAeviora Wellness invites your business to join our affiliate program. Complete your business registration using this private link:\n${url}\n\nOr open ${url.origin}${url.pathname} and enter this invitation code:\n${code}\n\nThis invitation expires in 7 days and can register one business. Keep the link and code private. Your invited email address cannot be changed during registration.\n\nYour customers receive ${terms.discountPercent}% off their first membership payment. Your business earns ${terms.commissionPercent}% of eligible paid membership value after discounts (${terms.commissionMode === "recurring" ? "including eligible paid renewals" : "first payment only"}). Admins manage eligibility and payouts.\n\nIf you were not expecting this invitation, you may ignore it.` });
  } catch (error) { delivery = "failed"; deliveryMessage = emailFailureMessage(error); }
  return { id: invitation._id, code, link: url.toString(), expiresAt: invitation.expiresAt, delivery, message: deliveryMessage };
}

export async function checkBusinessInvitation(value, { invitations = BusinessInvitation, now = new Date() } = {}) {
  const code = invitationCode(value);
  if (!code) throw unavailable();
  const item = await invitations.findOne({ tokenHash: invitationDigest(code), expiresAt: { $gt: now }, status: { $in: ["pending", "processing"] } });
  if (!item) throw unavailable();
  return item;
}

export async function completeBusinessInvitation(value, details, { invitations = BusinessInvitation, register = registerBusinessAffiliate, now = new Date() } = {}) {
  const code = invitationCode(value);
  if (!code) throw unavailable();
  const filter = { tokenHash: invitationDigest(code), expiresAt: { $gt: now } };
  const item = await invitations.findOne({ ...filter, status: { $in: ["pending", "processing"] } });
  if (!item) throw unavailable();
  // The invited email and approved terms always come from the server.
  const input = businessAffiliateInput.parse({ ...details, email: item.email });
  let claimed = await invitations.findOneAndUpdate({ ...filter, status: "pending" }, { $set: { status: "processing", submission: input } }, { new: true }).select("+submission");
  if (!claimed) claimed = await invitations.findOne({ ...filter, status: "processing" }).select("+submission");
  if (!claimed) throw unavailable();
  // Persist the first submission before creating the business. Retries after an
  // interrupted request use exactly that identity and the unique business index.
  const business = await register(claimed.submission, { terms: invitationTerms(claimed) });
  await invitations.updateOne({ _id: claimed._id, status: "processing" }, { $set: { status: "completed", affiliateId: business._id, completedAt: now }, $unset: { submission: "" } });
  return { invitationId: claimed._id, business };
}
