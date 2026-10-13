import mongoose from "mongoose";
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: String,
  renewalAt: Date,
  state: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
}, { timestamps: true });
export default mongoose.model("RenewalNotice", schema);
