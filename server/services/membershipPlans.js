import { z } from "zod";
import { discountSchema } from "../../shared/discounts.js";

const money = z.number().finite().min(0).max(100000000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
  "Use at most two decimal places.",
);
export const membershipInput = z.strictObject({
  name: z.string().trim().min(1).max(100),
  price: money,
  benefits: z.array(z.strictObject({
    benefitId: z.string().regex(/^[a-f\d]{24}$/i),
    price: money.nullable(),
  })).max(5000).refine((items) => new Set(items.map((item) => item.benefitId)).size === items.length,
    "Each benefit can appear only once."),
});

export function resolveMembership(input, catalog) {
  const data = membershipInput.parse(input);
  const ids = new Set(catalog.map((benefit) => String(benefit._id)));
  if (data.benefits.some((item) => !ids.has(item.benefitId))) {
    const error = new Error("A benefit was removed. Refresh the catalog and review the plan before saving.");
    error.status = 409;
    throw error;
  }
  const catalogById = new Map(catalog.map((benefit) => [String(benefit._id), benefit]));
  return {
    name: data.name, nameKey: data.name.toLowerCase(), price: data.price,
    billingInterval: "month", currency: "USD",
    benefits: data.benefits.map((selection) => {
      const benefit = catalogById.get(selection.benefitId);
      const discounts = (benefit.services || []).filter((service) => service.pricingType === "discount").map((service) => discountSchema.parse(service.discount));
      if (benefit.pricingType === "discount") {
        if (selection.price !== null) throw Object.assign(new Error("Discount benefits use a percentage, not a member price."), { status: 409 });
        return { benefitId: String(benefit._id), name: benefit.name, pricingType: "discount", discountPercent: benefit.discountPercent ?? null, discounts,
          standardPrice: null, price: null, customPrice: false };
      }
      const standardPrice = benefit.price?._bsontype === "Decimal128" ? Number(benefit.price.toString()) : benefit.price;
      if (!money.safeParse(standardPrice).success || typeof benefit.name !== "string" || !benefit.name.trim()) {
        const error = new Error("A catalog benefit needs a valid name and price. Update it in Benefits before saving this plan.");
        error.status = 409;
        throw error;
      }
      const price = selection.price;
      return { benefitId: String(benefit._id), name: benefit.name, standardPrice, discounts,
        price: price ?? standardPrice, customPrice: price != null };
    }),
  };
}

export const starterPlans = [
  { name: "Bronze", price: 20 }, { name: "Silver", price: 40 }, { name: "Gold", price: 60 },
];

export async function seedMembershipPlans(plans, catalog) {
  for (const starter of starterPlans) {
    const data = resolveMembership({ ...starter, benefits: [] }, catalog);
    const now = new Date();
    await plans.updateOne({ nameKey: data.nameKey }, { $setOnInsert: { ...data, createdAt: now, updatedAt: now } },
      { upsert: true, runValidators: true, timestamps: false });
  }
}
