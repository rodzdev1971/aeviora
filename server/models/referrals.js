import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { defaultReferralTerms } from "../../shared/referrals.js";

const terms = {
  enabled: { type: Boolean, default: defaultReferralTerms.enabled },
  discountPercent: { type: Number, min: 0, max: 90, default: defaultReferralTerms.discountPercent },
  commissionPercent: { type: Number, min: 0, max: 100, default: defaultReferralTerms.commissionPercent },
  commissionMode: { type: String, enum: ["first_payment", "recurring"], default: defaultReferralTerms.commissionMode },
};
const options = { timestamps: true, strict: "throw" };
const affiliateSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  userId: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, match: /^[A-Z0-9-]{6,32}$/ },
  ...terms,
}, options);
const settingsSchema = new mongoose.Schema({ _id: { type: String, default: "default" }, ...terms }, options);
const businessSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  kind: { type: String, enum: ["business"], default: "business", immutable: true },
  businessName: { type: String, required: true, maxlength: 160 },
  nameKey: { type: String, required: true },
  contactName: { type: String, default: "", maxlength: 120 },
  email: { type: String, required: true, maxlength: 254 },
  phone: { type: String, default: "", maxlength: 40 },
  website: { type: String, default: "", maxlength: 2000 },
  code: { type: String, required: true, unique: true, match: /^B2B-[A-Z0-9-]{4,28}$/ },
  ...terms,
}, { ...options, collection: "businessAffiliates" });
businessSchema.index({ nameKey: 1, email: 1 }, { unique: true });
const redemptionSchema = new mongoose.Schema({
  // One immutable offer per new member, shared by checkout retries and both payment methods.
  _id: { type: String, required: true },
  affiliateId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  discountPercent: { type: Number, required: true },
  commissionPercent: { type: Number, required: true },
  commissionMode: { type: String, enum: ["first_payment", "recurring"], required: true },
  firstPaymentId: String,
  firstPaidAt: Date,
}, options);
const rewardSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Provider payment ID, never a webhook event ID.
  affiliateId: { type: String, required: true, index: true },
  referredUserId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  method: { type: String, enum: ["stripe", "zelle"], required: true },
  planName: { type: String, required: true },
  baseCents: { type: Number, required: true, min: 0 },
  rewardCents: { type: Number, required: true, min: 0 },
  reversedCents: { type: Number, default: 0, min: 0 },
  paidCents: { type: Number, default: 0, min: 0 },
  paidAt: Date,
  paidBy: String,
  payoutReference: String,
  voidReason: String,
  paymentAt: { type: Date, required: true },
}, options);
rewardSchema.index({ affiliateId: 1, paymentAt: -1, _id: -1 });
rewardSchema.index({ payoutReference: 1 }, { unique: true, sparse: true });

export const ReferralAffiliate = mongoose.model("ReferralAffiliate", affiliateSchema);
export const ReferralSettings = mongoose.model("ReferralSettings", settingsSchema);
export const BusinessAffiliate = mongoose.model("BusinessAffiliate", businessSchema);
export const ReferralRedemption = mongoose.model("ReferralRedemption", redemptionSchema);
export const ReferralReward = mongoose.model("ReferralReward", rewardSchema);
