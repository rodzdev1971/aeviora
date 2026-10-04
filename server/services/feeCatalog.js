import { z } from "zod";
import { feeCatalogs } from "../../shared/feeCatalog.js";

const money = z.number().finite().min(0).max(100000000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
  "Use at most two decimal places.",
);

export function feeInput(source) {
  const config = Object.hasOwn(feeCatalogs, source) ? feeCatalogs[source] : null;
  if (!config) throw new Error("Unknown fee catalog.");
  return z.strictObject({
    name: z.string().trim().min(1).max(300),
    [config.billcode]: z.string().trim().max(100),
    description: z.string().trim().min(1).max(4000),
    retailPrice: money,
    [config.prices]: z.array(z.strictObject({
      [config.provider]: z.string().trim().min(1).max(300), amount: money,
    })).min(1).max(200).refine((rows) => new Set(rows.map((row) => row[config.provider].toLowerCase())).size === rows.length,
      "Use each provider only once per fee."),
  });
}
