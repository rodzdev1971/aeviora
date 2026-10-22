import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import User from "../models/users.js";
import FormLink from "../models/formLinks.js";
import { formLinkIds } from "../../shared/formLinks.js";
import { formLinkEmail } from "../services/formLinks.js";
import { emailAppointments, emailAppointment } from "../services/emailAppointments.js";
import { hasAppointmentPlaceholders, renderEmailTemplate } from "../../shared/emailTemplates.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { emailConfigurationStatus, emailFailure, emailFailureMessage, verifyEmailConnection, sendEmail } from "../services/email.js";

const input = z.strictObject({
  userId: z.uuid(),
  subject: z.string().trim().min(1).max(160).regex(/^[^\r\n]+$/),
  text: z.string().trim().min(1).max(10000),
  formLinkIds,
  appointment: z.strictObject({ providerId: z.uuid(), slotId: z.uuid(), revision: z.number().int().min(0) }).optional(),
});

export function createEmailRouter({ authenticate = requireAuth, authorize = requireRole("admin"),
  findUser = (id) => User.findById(id).select("email accountStatus firstName lastName"),
  listAppointments = emailAppointments, findAppointment = emailAppointment,
  findForms = (ids) => FormLink.find({ _id: { $in: ids }, enabled: true }).select("title url hasQrImage +qrImage").lean(),
  send = sendEmail, diagnostics = emailConfigurationStatus, verify = verifyEmailConnection, audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.get("/status", (req, res) => res.json(diagnostics()));
  router.get("/appointments/:userId", async (req, res) => {
    if (!z.uuid().safeParse(req.params.userId).success) return res.status(400).json({ message: "Select a valid recipient." });
    const user = await findUser(req.params.userId);
    if (!user || user.accountStatus === "deleted") return res.status(404).json({ message: "Recipient account not found." });
    res.json({ appointments: await listAppointments(req.params.userId) });
  });
  router.post("/verify", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, keyGenerator: (req) => req.user.id,
    standardHeaders: true, legacyHeaders: false, message: { message: "Connection test limit reached. Try again later." } }), async (req, res) => {
    try {
      await verify();
      return res.json({ message: "SMTP connection and authentication succeeded. No email was sent. Sender authorization and inbox delivery still require a test email." });
    } catch (error) {
      return res.status(503).json({ category: emailFailure(error), message: emailFailureMessage(error) });
    }
  });
  router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: (req) => req.user.id,
    standardHeaders: true, legacyHeaders: false, message: { message: "Email limit reached. Try again later." } }), async (req, res) => {
    const parsed = input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Select a user and enter a subject (up to 160 characters) and message (up to 10,000 characters)." });
    const user = await findUser(parsed.data.userId);
    if (!user || user.accountStatus === "deleted") return res.status(404).json({ message: "Recipient account not found." });
    let appointment = null;
    if (hasAppointmentPlaceholders(parsed.data)) {
      if (!parsed.data.appointment) return res.status(400).json({ message: "Choose the recipient's appointment before sending appointment placeholders." });
      appointment = await findAppointment(parsed.data.userId, parsed.data.appointment);
      if (!appointment) return res.status(409).json({ message: "The appointment changed or is no longer booked for this recipient. Refresh appointments and review the email." });
    }
    const rendered = renderEmailTemplate(parsed.data, user, appointment, req.acceptsLanguages("en", "es") === "es" ? "es-US" : "en-US");
    const ids = parsed.data.formLinkIds;
    const forms = ids.length ? await findForms(ids) : [];
    if (forms.length !== ids.length) return res.status(409).json({ message: "A selected form is unavailable. Refresh the form library and review your selection." });
    const ordered = ids.map((id) => forms.find((form) => form._id === id));
    try {
      await send({ to: user.email, subject: rendered.subject, ...formLinkEmail(rendered.text, ordered) });
    } catch (error) {
      console.warn("Admin email:", emailFailure(error));
      return res.status(503).json({ message: `${emailFailureMessage(error)} Check provider logs before retrying to avoid duplicate delivery.` });
    }
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "ACCOUNT_EMAIL_SENT", targetType: "User", targetId: parsed.data.userId });
    return res.json({ message: "Email accepted by the mail server. Inbox delivery is not guaranteed." });
  });
  return router;
}

export default createEmailRouter();
