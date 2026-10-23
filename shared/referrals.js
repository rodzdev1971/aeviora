import { z } from "zod";

export const referralCodeSchema = z.string().trim().toUpperCase().max(32).regex(/^[A-Z0-9-]*$/, "Use letters, numbers and hyphens for the referral code.").default("");
export const referralTermsSchema = z.strictObject({
  enabled: z.boolean(),
  discountPercent: z.number().min(0).max(90).multipleOf(0.01),
  commissionPercent: z.number().min(0).max(100).multipleOf(0.01),
  commissionMode: z.enum(["first_payment", "recurring"]),
});
export const defaultReferralTerms = { enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "recurring" };
export const businessAffiliateInput = z.strictObject({
  businessName: z.string().trim().min(1).max(160).regex(/^[^\r\n]+$/),
  contactName: z.string().trim().max(120).default(""),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).default(""),
  website: z.string().trim().max(2000).refine((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
    catch { return false; }
  }, "Use an HTTPS business website.").default(""),
});
export function referralAmounts(priceCents, discountPercent, commissionPercent) {
  const discountCents = Math.round(priceCents * discountPercent / 100);
  const totalCents = Math.max(0, priceCents - discountCents);
  return { priceCents, discountCents, totalCents, commissionCents: Math.round(totalCents * commissionPercent / 100) };
}
