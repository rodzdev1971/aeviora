import { z } from "zod";

const rule = z.strictObject({
  mode: z.enum(["selected", "allExcept"]),
  feeIds: z.array(z.string().regex(/^[a-f\d]{24}$/).transform((id) => id.toLowerCase())).max(5000)
    .refine((ids) => new Set(ids).size === ids.length, "Select each fee only once."),
});
export const discountSchema = z.strictObject({
  percent: z.number().finite().gt(0).max(100).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
  laboratoryFees: rule,
  diagnosticFees: rule,
}).refine((value) => [value.laboratoryFees, value.diagnosticFees].some((item) => item.mode === "allExcept" || item.feeIds.length),
  "Choose at least one eligible service or an all-except rule.");

export const emptyDiscount = () => ({ percent: "", laboratoryFees: { mode: "selected", feeIds: [] }, diagnosticFees: { mode: "selected", feeIds: [] } });
export function discountApplies(discount, source, feeId) {
  if (!["laboratoryFees", "diagnosticFees"].includes(source)) return false;
  const rule = discount[source];
  return rule.mode === "allExcept" ? !rule.feeIds.includes(String(feeId)) : rule.feeIds.includes(String(feeId));
}
export function discountText(discount) {
  const scopes = [["laboratoryFees", "laboratory services"], ["diagnosticFees", "diagnostic services"]].flatMap(([source, label]) => {
    const rule = discount[source];
    return rule.mode === "allExcept" ? [`all ${label}${rule.feeIds.length ? ` except ${rule.feeIds.length} exclusions` : ""}`]
      : rule.feeIds.length ? [`${rule.feeIds.length} selected ${label}`] : [];
  });
  return `${discount.percent}% discount on ${scopes.join(" and ")}`;
}
