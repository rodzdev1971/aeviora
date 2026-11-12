import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { US_STATE_CODES } from "../../shared/usStates.js";

const slotSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID }, startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  mode: { type: String, enum: ["telehealth", "in_person"], required: true }, location: String, meetingUrl: String,
  status: { type: String, enum: ["available", "blocked", "booked", "cancelled"], default: "available" },
  userId: String, patientName: String, patientEmail: String, bookedAt: Date, cancelledAt: Date, cancelledBy: String,
  patientState: { type: String, enum: US_STATE_CODES },
}, { strict: "throw" });

const providerSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID }, name: { type: String, required: true, maxlength: 120 },
  credentials: String, specialty: { type: String, required: true }, bio: String, email: String, phone: String,
  timeZone: { type: String, default: "America/New_York" }, active: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
  userId: { type: String },
  authorizedStates: { type: [{ type: String, enum: US_STATE_CODES }], default: [] },
  slots: { type: [slotSchema], default: [], select: false },
}, { timestamps: true, strict: "throw", collection: "appointmentProviders" });
providerSchema.index({ active: 1 });
providerSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "string" } } });
providerSchema.index({ "slots.userId": 1 });
export default mongoose.model("AppointmentProvider", providerSchema);
