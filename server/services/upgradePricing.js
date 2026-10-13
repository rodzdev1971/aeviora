export function upgradePricing(oldPrice, newPrice, paidThrough, now = new Date()) {
  if (![oldPrice, newPrice].every(Number.isFinite) || newPrice <= oldPrice || oldPrice < 0) throw new Error("Choose a higher-priced plan.");
  const remaining = (new Date(paidThrough).getTime() - new Date(now).getTime()) / (30 * 86400000);
  if (!(remaining > 0) || remaining > 1) throw new Error("Upgrade requires one unexpired paid period; contact support for prepaid periods.");
  const creditCents = Math.round(oldPrice * 100 * remaining);
  return { creditCents, amountCents: Math.round(newPrice * 100) - creditCents };
}
