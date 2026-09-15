import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const acceptanceSchema = new mongoose.Schema({
  version: { type: String, required: true },
  documentUrl: { type: String, required: true },
  acceptedAt: { type: Date, required: true },
  isDraft: { type: Boolean, required: true },
}, { _id: false, strict: "throw" });

const consentSchema = new mongoose.Schema({
  granted: { type: Boolean, required: true },
  recordedAt: { type: Date, required: true },
  grantedAt: { type: Date, default: null },
}, { _id: false, strict: "throw" });

const userSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID, immutable: true },
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, match: /^\+[1-9]\d{7,14}$/ },
  addressLine1: { type: String, default: "" },
  addressLine2: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  zipCode: { type: String, required: true },
  country: { type: String, default: "US", match: /^[A-Z]{2}$/ },
  preferredLanguage: { type: String, enum: ["", "en", "es"], default: "" },
  communicationPreference: { type: String, enum: ["", "email", "sms", "both"], default: "" },
  timeZone: { type: String, default: "" },
  passwordHash: { type: String, required: true, select: false },
  is18OrOlder: { type: Boolean, required: true, validate: (value) => value === true },
  termsAcceptance: { type: acceptanceSchema, required: true },
  privacyAcceptance: { type: acceptanceSchema, required: true },
  smsConsent: { type: consentSchema, required: true },
  marketingConsent: { type: consentSchema, required: true },
  accountStatus: { type: String, enum: ["pending", "active", "suspended", "deleted"], default: "pending" },
  role: { type: String, enum: ["user", "patient", "provider", "admin"], default: "patient" },
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  subscriptionStatus: { type: String, default: "inactive" },
}, { timestamps: true, strict: "throw", collection: "users" });

export default mongoose.model("User", userSchema);
