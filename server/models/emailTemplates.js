import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const schema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  name: { type: String, required: true, maxlength: 100 },
  subject: { type: String, required: true, maxlength: 160 },
  text: { type: String, required: true, maxlength: 10000 },
}, { timestamps: true, strict: "throw", collection: "emailTemplates" });
export default mongoose.model("EmailTemplate", schema);
