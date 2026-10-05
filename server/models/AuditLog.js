import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: String,
      ref: "User",
    },

    actorRole: {
      type: String,
      enum: ["user", "patient", "provider", "admin", "system"],
      default: "system",
    },

    action: {
      type: String,
      required: true,
      enum: [
        "USER_CREATED",
        "USER_VIEWED",
        "USER_UPDATED",
        "ADMIN_ACCESS_REMOVED",
        "BENEFIT_CREATED",
        "FEE_CREATED",
        "FEE_UPDATED",
        "BENEFIT_UPDATED",
        "BENEFIT_DELETED",
        "MEMBERSHIP_CREATED",
        "MEMBERSHIP_UPDATED",
        "MEMBERSHIP_DELETED",
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
        "PAYMENT_CHECKOUT_STARTED",
        "PATIENT_CONTACT_SELECTED",
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
