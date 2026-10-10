import { z } from "zod";
import { feeCatalogs } from "../../shared/feeCatalog.js";
import { discountSchema } from "../../shared/discounts.js";

const money = z.number().finite().min(0).max(100000000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
  "Amounts must have at most two decimal places.",
);
export const benefitInput = z.strictObject({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  price: money.nullable(),
  discountPercent: z.number().finite().gt(0).max(100).multipleOf(0.01).nullable().optional(),
  services: z.array(z.union([z.strictObject({
    source: z.enum(["laboratoryFees", "diagnosticFees", "serviceFees"]),
    feeId: z.string().regex(/^[a-f\d]{24}$/i),
    provider: z.string().trim().min(1).max(300),
    amount: money,
  }), z.strictObject({ source: z.literal("serviceFees"), feeId: z.string().regex(/^[a-f\d]{24}$/i),
    pricingType: z.literal("discount"), discount: discountSchema })])).min(1).max(200),
});

export function feeOptions(documents, source) {
  const config = Object.hasOwn(feeCatalogs, source) ? feeCatalogs[source] : null;
  if (!config) return [];
  return documents.flatMap((document) => {
    const name = document.name || document.description || document.order;
    if (typeof name !== "string" || !name.trim()) return [];
    if (source === "serviceFees" && document.pricingType === "discount") {
      const parsed = discountSchema.safeParse(document.discount);
      return parsed.success ? [{ source, feeId: String(document._id), name: name.trim(), pricingType: "discount",
        discount: parsed.data, provider: "", billCode: document.billcode || "" }] : [];
    }
    const prices = document[config.prices];
    const retail = document.retailPrice?._bsontype === "Decimal128" ? Number(document.retailPrice.toString()) : document.retailPrice;
    if (!Array.isArray(prices)) return [];
    return prices.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const provider = entry[config.provider];
      const amount = entry.amount?._bsontype === "Decimal128"
        ? Number(entry.amount.toString()) : entry.amount;
      if (typeof provider !== "string" || !provider.trim() || !money.safeParse(amount).success) return [];
      return [{ source, feeId: String(document._id), name: name.trim(), provider: provider.trim(), amount,
        retailPrice: money.safeParse(retail).success ? retail : null,
        billCode: String(document[config.billcode] || "") }];
    });
  });
}

export function resolveBenefit(input, options) {
  const data = benefitInput.parse(input);
  const services = data.services.map((selection) => {
    if (selection.pricingType === "discount") {
      const option = options.find((item) => item.source === selection.source && item.feeId === selection.feeId &&
        item.pricingType === "discount" && JSON.stringify(item.discount) === JSON.stringify(selection.discount));
      if (!option) throw Object.assign(new Error("A discount changed or is unavailable. Refresh and select it again."), { status: 409 });
      return { name: option.name, source: option.source, feeId: option.feeId, pricingType: "discount", discount: option.discount };
    }
    const matches = options.filter((option) => option.source === selection.source &&
      option.feeId === selection.feeId && option.provider === selection.provider);
    const option = matches.find((item) => item.amount === selection.amount);
    if (!option) {
      const error = new Error("A selected service is unavailable or its price changed. Refresh the fee catalog and select it again.");
      error.status = 409;
      throw error;
    }
    return {
      name: option.name, cost: option.amount, source: option.source, feeId: option.feeId,
      [feeCatalogs[option.source].provider]: option.provider,
      amount: option.amount,
    };
  });
  const discountOnly = data.discountPercent != null || services.every((service) => service.pricingType === "discount");
  if (!discountOnly && data.price === null) throw Object.assign(new Error("Enter a selling price for a benefit containing priced services."), { status: 409 });
  const cost = services.reduce((total, service) => total + Math.round((service.cost || 0) * 100), 0) / 100;
  return { name: data.name, description: data.description, pricingType: discountOnly ? "discount" : "price",
    price: discountOnly ? null : data.price, discountPercent: data.discountPercent ?? null, cost, services };
}
