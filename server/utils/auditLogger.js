import AuditLog from "../models/AuditLog.js";

export async function logAudit({
  req,
  actorId,
  actorRole = "system",
  action,
  targetType = "unknown",
  targetId,
  metadata = {},
}) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}