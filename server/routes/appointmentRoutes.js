import express from "express";
import { z } from "zod";
import Provider from "../models/appointmentProviders.js";
import { providerInput, availabilityInput } from "../../shared/appointments.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { AppointmentError, appointmentRepository, changeSchedule, addAvailability, changeSlot, publicProvider, visibleSlot } from "../services/appointments.js";

export function createAppointmentRouter({ providers = Provider, repository = appointmentRepository, authenticate = requireAuth,
  authorize = requireRole("admin"), audit = logAudit, now = () => new Date() } = {}) {
  const router = express.Router();
  router.use(authenticate);
  for (const name of ["providerId", "slotId"]) router.param(name, (req, res, next, value) => {
    if (!z.uuid().safeParse(value).success) return res.status(400).json({ message: "Invalid appointment identifier." });
    next();
  });
  async function record(req, action, targetId) {
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action, targetType: "AppointmentProvider", targetId });
  }
  const adminFields = "_id name credentials specialty bio email phone timeZone active revision";
  router.get("/providers", async (req, res) => {
    const admin = req.user.role === "admin";
    const list = await providers.find(admin ? {} : { active: true }).select(adminFields).sort({ name: 1 }).lean();
    res.json({ providers: list.map((provider) => admin ? provider : publicProvider(provider)) });
  });
  router.post("/providers", authorize, async (req, res) => {
    const parsed = providerInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a provider name, specialty, valid email and time zone. Review the field lengths." });
    const provider = await providers.create(parsed.data);
    await record(req, "APPOINTMENT_PROVIDER_CREATED", provider._id);
    res.status(201).json({ provider: { ...publicProvider(provider), email: provider.email, revision: provider.revision } });
  });
  router.put("/providers/:providerId", authorize, async (req, res) => {
    const parsed = providerInput.extend({ revision: z.number().int().min(0) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Review the provider details and reload before saving." });
    const { revision, ...data } = parsed.data;
    const result = await changeSchedule(req.params.providerId, (provider) => {
      if (provider.revision !== revision) throw new AppointmentError(409, "The provider changed. Reload their details before saving.");
      return { changes: data };
    }, repository);
    await record(req, "APPOINTMENT_PROVIDER_UPDATED", req.params.providerId);
    res.json({ provider: { ...publicProvider(result.provider), email: result.provider.email, revision: result.provider.revision } });
  });
  router.get("/providers/:providerId/slots", async (req, res) => {
    const admin = req.user.role === "admin";
    const allDates = admin && Object.keys(req.query).length === 0;
    const input = z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() }).safeParse(req.query);
    if (!allDates && !input.success) return res.status(400).json({ message: "Choose a valid date range." });
    const from = allDates ? null : new Date(input.data.from), to = allDates ? null : new Date(input.data.to);
    if (!allDates && (to <= from || to - from > 31 * 86400000)) return res.status(400).json({ message: "Choose a date range of up to 31 days." });
    const provider = await repository.load(req.params.providerId);
    if (!provider || (!admin && !provider.active)) return res.status(404).json({ message: "Provider not found." });
    const slots = provider.slots.filter((slot) => (allDates || (new Date(slot.startsAt) >= from && new Date(slot.startsAt) < to))
      && (admin || (slot.status === "available" && new Date(slot.startsAt) > now())))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .map((slot) => visibleSlot(provider, slot, req.user, admin));
    if (admin) await record(req, "APPOINTMENT_SCHEDULE_VIEWED", provider._id);
    res.json({ slots });
  });
  router.post("/providers/:providerId/availability", authorize, async (req, res) => {
    const input = availabilityInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: input.error.issues[0].message });
    await changeSchedule(req.params.providerId, (provider) => addAvailability(provider, input.data, now()), repository);
    await record(req, "APPOINTMENT_AVAILABILITY_CREATED", req.params.providerId);
    res.status(201).json({ message: "Availability published." });
  });
  router.get("/mine", async (req, res) => {
    const list = await providers.find({ "slots.userId": req.user.id }).select("+slots").lean();
    const since = now().getTime() - 90 * 86400000;
    const appointments = list.flatMap((provider) => provider.slots
      .filter((slot) => slot.userId === req.user.id && ["booked", "cancelled"].includes(slot.status) && new Date(slot.startsAt).getTime() >= since)
      .map((slot) => visibleSlot(provider, slot, req.user)))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    res.json({ appointments });
  });
  router.post("/providers/:providerId/slots/:slotId/:action", async (req, res) => {
    const { providerId, slotId, action } = req.params;
    if (!["book", "cancel", "block", "open", "remove"].includes(action)) return res.status(400).json({ message: "Invalid slot action." });
    if (!["book", "cancel"].includes(action) && req.user.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
    if (!z.strictObject({}).safeParse(req.body || {}).success) return res.status(400).json({ message: "Slot actions do not accept patient or schedule overrides." });
    const result = await changeSchedule(providerId, (provider) => changeSlot(provider, slotId, action, req.user, now()), repository);
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "APPOINTMENT_UPDATED", targetType: "AppointmentSlot", targetId: slotId, metadata: { providerId, operation: action } });
    const slot = result.provider.slots.find((item) => item._id === slotId);
    res.json({ message: action === "book" ? "Appointment confirmed." : action === "cancel" ? "Appointment cancelled." : "Schedule updated.",
      ...(slot ? { appointment: visibleSlot(result.provider, slot, req.user, req.user.role === "admin") } : {}) });
  });
  router.use((error, req, res, next) => {
    if (error instanceof AppointmentError) return res.status(error.status).json({ message: error.message });
    next(error);
  });
  return router;
}
export default createAppointmentRouter();
