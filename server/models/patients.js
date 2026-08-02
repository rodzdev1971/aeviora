import mongoose from "mongoose";
import { encryptText, decryptText } from "../utils/crypto.js";

const patientSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      set: encryptText,
      get: decryptText,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    selectedProtocol: {
      type: String,
      default: "General Wellness Consultation",
    },

    medicalHistory: {
      type: String,
      set: encryptText,
      get: decryptText,
    },

    medications: {
      type: String,
      set: encryptText,
      get: decryptText,
    },

    allergies: {
      type: String,
      set: encryptText,
      get: decryptText,
    },

    role: {
      type: String,
      enum: ["patient", "provider", "admin"],
      default: "patient",
    },

    hipaaAcknowledged: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;