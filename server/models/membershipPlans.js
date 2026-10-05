import mongoose from "mongoose";
import { storedDiscountSchema } from "./discountSchema.js";

const planBenefitSchema = new mongoose.Schema({
  benefitId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  pricingType: { type: String, enum: ["price", "discount"] },
  discounts: [storedDiscountSchema],
  standardPrice: { type: Number, required: function () { return (this.pricingType || this.getUpdate?.()?.$set?.pricingType) !== "discount"; }, min: 0 },
  price: { type: Number, required: function () { return (this.pricingType || this.getUpdate?.()?.$set?.pricingType) !== "discount"; }, min: 0 },
  customPrice: { type: Boolean, required: true, default: false },
}, { _id: false });

const membershipPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  nameKey: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  billingInterval: { type: String, enum: ["month"], default: "month" },
  currency: { type: String, enum: ["USD"], default: "USD" },
  benefits: { type: [planBenefitSchema], default: [] },
}, { timestamps: true, collection: "membershipPlans", strict: "throw" });

export default mongoose.model("MembershipPlan", membershipPlanSchema);
