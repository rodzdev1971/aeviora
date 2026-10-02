import { z } from "zod";

const money = z.number().finite().min(0).max(100000000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
  "Amounts must have at most two decimal places.",
);
export const benefitInput = z.strictObject({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  price: money,
  services: z.array(z.strictObject({
    source: z.enum(["laboratoryFees", "diagnosticFees"]),
    feeId: z.string().regex(/^[a-f\d]{24}$/i),
    provider: z.string().trim().min(1).max(300),
    amount: money,
  })).min(1).max(200),
});

export function feeOptions(documents, source) {
  const isLab = source === "laboratoryFees";
  return documents.flatMap((document) => {
    const name = document.name || document.description || document.order;
    if (typeof name !== "string" || !name.trim()) return [];
    const prices = document[isLab ? "labPrices" : "diagnosticPrices"];
    if (!Array.isArray(prices)) return [];
    return prices.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const provider = entry[isLab ? "lab" : "diagnostic_center"];
      const amount = entry.amount?._bsontype === "Decimal128"
        ? Number(entry.amount.toString()) : entry.amount;
      if (typeof provider !== "string" || !provider.trim() || !money.safeParse(amount).success) return [];
      return [{ source, feeId: String(document._id), name: name.trim(), provider: provider.trim(), amount,
        billCode: String(document.billCode || "") }];
    });
  });
}

export function resolveBenefit(input, options) {
  const data = benefitInput.parse(input);
  const services = data.services.map((selection) => {
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
      [option.source === "laboratoryFees" ? "lab" : "diagnostic_center"]: option.provider,
      amount: option.amount,
    };
  });
  const cost = services.reduce((total, service) => total + Math.round(service.cost * 100), 0) / 100;
  return { name: data.name, description: data.description, price: data.price, cost, services };
}
