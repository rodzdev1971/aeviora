import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true, select: false },
  keys: { p256dh: { type: String, required: true, select: false }, auth: { type: String, required: true, select: false } },
  publicKey: { type: String, required: true, select: false },
  language: { type: String, enum: ["en", "es"], default: "en" },
}, { timestamps: true, strict: "throw", collection: "adminPushSubscriptions" });
export default mongoose.model("AdminPushSubscription", schema);
