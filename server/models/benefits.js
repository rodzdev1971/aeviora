import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  source: { type: String, enum: ["laboratoryFees", "diagnosticFees", "serviceFees"], required: true },
  feeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lab: String,
  diagnostic_center: String,
  provider: String,
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const benefitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  cost: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  services: { type: [serviceSchema], required: true },
}, { timestamps: true, collection: "membershipBenefits", strict: "throw" });

export default mongoose.model("Benefit", benefitSchema);
