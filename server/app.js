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

export function createApp() {
  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          // connectSrc: ["'self'", "https://api.aeviorawellness.com"],
          connectSrc: ["'self'", "https://localhost:5000"],
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
  if (req.body) mongoSanitize.sanitize(req.body);
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

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/users", patientRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/payments", paymentRoutes);


  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === "entity.parse.failed" ? 400 : 500).json({ message: "The request could not be completed." });
  });
  return app;
}
