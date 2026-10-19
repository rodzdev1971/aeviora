import { z } from "zod";

export const referralCodeSchema = z.string().trim().toUpperCase().max(32).regex(/^[A-Z0-9-]*$/, "Use letters, numbers and hyphens for the referral code.").default("");
export const referralTermsSchema = z.strictObject({
  enabled: z.boolean(),
  discountPercent: z.number().min(0).max(90).multipleOf(0.01),
  commissionPercent: z.number().min(0).max(100).multipleOf(0.01),
  commissionMode: z.enum(["first_payment", "recurring"]),
});
export const defaultReferralTerms = { enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "recurring" };
export function referralAmounts(priceCents, discountPercent, commissionPercent) {
  const discountCents = Math.round(priceCents * discountPercent / 100);
  const totalCents = Math.max(0, priceCents - discountCents);
  return { priceCents, discountCents, totalCents, commissionCents: Math.round(totalCents * commissionPercent / 100) };
}
