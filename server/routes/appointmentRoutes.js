import express from "express";
import { z } from "zod";
import Provider from "../models/appointmentProviders.js";
import { providerInput, availabilityInput, availabilityRemovalInput, availabilityRemovalSelection, timeZoneInput } from "../../shared/appointments.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { AppointmentError, appointmentRepository, changeSchedule, addAvailability, removeAvailability, changeSlot, publicProvider, visibleSlot } from "../services/appointments.js";

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
  router.get("/providers/:providerId/available-dates", async (req, res) => {
    const query = { ...req.query };
    delete query.path;
    const input = z.strictObject({ timeZone: timeZoneInput, mode: z.enum(["telehealth", "in_person"]).optional() }).safeParse(query);
    if (!input.success) return res.status(400).json({ message: "Choose a valid time zone and visit type." });
    const provider = await repository.load(req.params.providerId);
    if (!provider?.active) return res.status(404).json({ message: "Provider not found." });
    const formatter = new Intl.DateTimeFormat("en", { timeZone: input.data.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    const dates = new Map(), currentTime = now();
    for (const slot of provider.slots) {
      if (slot.status !== "available" || new Date(slot.startsAt) <= currentTime || (input.data.mode && slot.mode !== input.data.mode)) continue;
      const parts = formatter.formatToParts(new Date(slot.startsAt));
      const part = (type) => parts.find((item) => item.type === type).value;
      const date = `${part("year")}-${part("month")}-${part("day")}`;
      dates.set(date, (dates.get(date) || 0) + 1);
    }
    res.json({ dates: [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })) });
  });
  router.get("/providers/:providerId/slots", async (req, res) => {
    const admin = req.user.role === "admin";
    // vercel.json captures /api/:path* when forwarding to /api/index.
    // That routing parameter is not an appointment filter. Copy because
    // Express 5 exposes req.query through a getter.
    const query = { ...req.query };
    delete query.path;
    const allDates = admin && Object.keys(query).length === 0;
    const input = z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() }).safeParse(query);
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
  router.post("/providers/:providerId/availability/removal-preview", authorize, async (req, res) => {
    const input = availabilityRemovalInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Choose a valid date and, for selected hours, valid start and end times." });
    const provider = await repository.load(req.params.providerId);
    if (!provider) return res.status(404).json({ message: "Provider not found." });
    let selection;
    try { selection = availabilityRemovalSelection(provider.slots, input.data, provider.timeZone); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    await record(req, "APPOINTMENT_SCHEDULE_VIEWED", provider._id);
    res.json({ revision: provider.revision, removableCount: selection.removable.length, bookedCount: selection.bookedCount });
  });
  router.post("/providers/:providerId/availability/remove", authorize, async (req, res) => {
    const input = z.strictObject({ selection: availabilityRemovalInput, revision: z.number().int().min(0) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Preview the selected date and hours before removing availability." });
    const result = await changeSchedule(req.params.providerId, (provider) => removeAvailability(provider, input.data.selection, input.data.revision, req.user), repository);
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "APPOINTMENT_AVAILABILITY_REMOVED", targetType: "AppointmentProvider", targetId: req.params.providerId,
      metadata: { removedCount: result.removedCount, scope: input.data.selection.scope } });
    res.json({ message: "Unbooked availability removed. Booked appointments and cancellation history were preserved.", removedCount: result.removedCount });
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
