import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import benefitRoutes from "./routes/benefitRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";

export function createApp({ connectDatabase, trustProxy = false } = {}) {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
    })
  );

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Express 5 exposes req.query as a getter. Sanitize mutable bodies only;
// API inputs are also validated against strict allowlisted schemas.
app.use((req, res, next) => {
  if (req.body && !Buffer.isBuffer(req.body)) mongoSanitize.sanitize(req.body);
  next();
});
app.use(hpp());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "Aeviora Wellness API is running",
  });
});

if (connectDatabase) {
  app.use("/api", async (req, res, next) => {
    try { await connectDatabase(); next(); }
    catch { res.status(503).json({ message: "Database is temporarily unavailable." }); }
  });
}
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/users", patientRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/benefits", benefitRoutes);
app.use("/api/admin/memberships", membershipRoutes);
app.use("/api/admin/fees", feeRoutes);
app.use("/api", (req, res) => res.status(404).json({ message: "API endpoint not found." }));


  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === "entity.parse.failed" ? 400 : 500).json({ message: "The request could not be completed." });
  });
  return app;
}
