import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  invoiceId: { type: String, required: true, unique: true },
  reference: { type: String, required: true, unique: true },
  amountCents: { type: Number, required: true },
  method: { type: String, enum: ["zelle"], default: "zelle" },
  status: { type: String, enum: ["pending", "confirmed"], default: "pending" },
  confirmedBy: { type: String, required: true },
  confirmedAt: Date,
}, { timestamps: true, strict: "throw" });

export default mongoose.model("ManualMembershipPayment", schema);
