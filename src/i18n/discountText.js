import { discountText as englishDiscountText } from "../../shared/discounts.js";
import { getLanguage } from "./language.js";

export function discountText(discount) {
  if (getLanguage() !== "es") return englishDiscountText(discount);
  const scopes = [["laboratoryFees", "servicios de laboratorio"], ["diagnosticFees", "servicios de diagnóstico"]].flatMap(([source, label]) => {
    const rule = discount[source];
    return rule.mode === "allExcept"
      ? [`todos los ${label}${rule.feeIds.length ? ` excepto ${rule.feeIds.length} ${rule.feeIds.length === 1 ? "exclusión" : "exclusiones"}` : ""}`]
      : rule.feeIds.length ? [`${rule.feeIds.length} ${rule.feeIds.length === 1 ? label.replace("servicios", "servicio") + " seleccionado" : label + " seleccionados"}`] : [];
  });
  return `${discount.percent}% de descuento en ${scopes.join(" y ")}`;
}
