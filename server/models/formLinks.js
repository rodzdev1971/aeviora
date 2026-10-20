import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const schema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  title: { type: String, required: true, maxlength: 120 },
  url: { type: String, default: "", maxlength: 2000 },
  description: { type: String, default: "", maxlength: 500 },
  enabled: { type: Boolean, default: true },
  qrImage: { type: String, default: "", select: false },
  hasQrImage: { type: Boolean, default: false },
}, { timestamps: true, strict: "throw", collection: "formLinks" });
schema.index({ enabled: 1, title: 1, _id: 1 });
export default mongoose.model("FormLink", schema);
