import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";
import { logAudit } from "../utils/auditLogger.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      await logAudit({
        req,
        action: "ACCESS_DENIED",
        metadata: { reason: "Missing access token" },
      });

      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await Patient.findById(decoded.userId).select(
      "_id email role firstName lastName isActive"
    );

    if (!user || !user.isActive) {
      await logAudit({
        req,
        actorId: decoded.userId,
        actorRole: decoded.role,
        action: "ACCESS_DENIED",
        metadata: { reason: "Inactive or missing user" },
      });

      return res.status(401).json({ message: "Invalid session." });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    await logAudit({
      req,
      action: "ACCESS_DENIED",
      metadata: { reason: "Invalid or expired token" },
    });

    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logAudit({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.role || "system",
        action: "ACCESS_DENIED",
        metadata: {
          requiredRoles: allowedRoles,
          userRole: req.user?.role,
        },
      });

      return res.status(403).json({
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}