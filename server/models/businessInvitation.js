import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const schema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  businessName: { type: String, required: true },
  email: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "processing", "completed", "revoked"], default: "pending" },
  createdBy: { type: String, required: true },
  enabled: Boolean,
  discountPercent: Number,
  commissionPercent: Number,
  commissionMode: { type: String, enum: ["first_payment", "recurring"] },
  submission: { type: mongoose.Schema.Types.Mixed, select: false },
  affiliateId: String,
  completedAt: Date,
}, { timestamps: true });
export default mongoose.model("BusinessInvitation", schema);
