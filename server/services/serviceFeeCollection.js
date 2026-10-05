// MongoDB validation for both legacy priced records and percentage discounts.
const number = { bsonType: ["double", "int", "long", "decimal"], minimum: 0 };
const rule = { bsonType: "object", required: ["mode", "feeIds"], properties: {
  mode: { enum: ["selected", "allExcept"] },
  feeIds: { bsonType: "array", uniqueItems: true, items: { bsonType: "string", pattern: "^[a-f0-9]{24}$" } },
} };
export const serviceFeeValidator = { $jsonSchema: {
  bsonType: "object", required: ["name", "billcode", "description"],
  properties: { name: { bsonType: "string", minLength: 1 }, billcode: { bsonType: "string" }, description: { bsonType: "string", minLength: 1 } },
  oneOf: [
    { required: ["retailPrice", "servicePrices"], properties: {
      pricingType: { enum: ["price"] }, retailPrice: number,
      servicePrices: { bsonType: "array", minItems: 1, items: { bsonType: "object", required: ["provider", "amount"],
        properties: { provider: { bsonType: "string", minLength: 1 }, amount: number } } },
    } },
    { required: ["pricingType", "discount"], properties: {
      pricingType: { enum: ["discount"] },
      discount: { bsonType: "object", required: ["percent", "laboratoryFees", "diagnosticFees"], properties: {
        percent: { ...number, minimum: 0, exclusiveMinimum: true, maximum: 100 }, laboratoryFees: rule, diagnosticFees: rule,
      } },
    } },
  ],
} };

export async function configureServiceFees(db) {
  if ((await db.listCollections({ name: "serviceFees" }).toArray()).length) {
    await db.command({ collMod: "serviceFees", validator: serviceFeeValidator, validationLevel: "strict", validationAction: "error" });
  } else {
    await db.createCollection("serviceFees", { validator: serviceFeeValidator });
  }
}
