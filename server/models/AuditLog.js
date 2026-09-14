import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },

    actorRole: {
      type: String,
      enum: ["patient", "provider", "admin", "system"],
      default: "system",
    },

    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "PATIENT_CREATED",
        "PATIENT_VIEWED",
        "PATIENT_UPDATED",
        "RECORD_VIEWED",
        "RECORD_DOWNLOADED",
        "ACCESS_DENIED",
        "PASSWORD_CHANGED",
      ],
    },

    targetType: {
      type: String,
      default: "unknown",
    },

    targetId: {
      type: String,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;