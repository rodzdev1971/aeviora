import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema({ mode: { type: String, enum: ["selected", "allExcept"], required: true }, feeIds: [String] }, { _id: false });
export const storedDiscountSchema = new mongoose.Schema({
  percent: { type: Number, min: 0.01, max: 100, required: true },
  laboratoryFees: { type: ruleSchema, required: true },
  diagnosticFees: { type: ruleSchema, required: true },
}, { _id: false });
