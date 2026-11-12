import express from "express";
import { z } from "zod";
import Provider from "../models/appointmentProviders.js";
import User from "../models/users.js";
import { providerInput, providerSelfInput, availabilityInput, availabilityRemovalInput, availabilityRemovalSelection, timeZoneInput } from "../../shared/appointments.js";
import { US_STATE_CODES } from "../../shared/usStates.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { AppointmentError, appointmentRepository, changeSchedule, addAvailability, removeAvailability, changeSlot, publicProvider, visibleSlot, managesProvider } from "../services/appointments.js";

export function createAppointmentRouter({ providers = Provider, users = User, repository = appointmentRepository, authenticate = requireAuth,
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
  const adminFields = "_id name credentials specialty bio email phone timeZone active revision userId authorizedStates";
  async function manage(req, res, next) {
    if (req.user.role === "admin") return authorize(req, res, next);
    if (req.user.role !== "provider") return res.status(403).json({ message: "Provider access required." });
    const provider = await repository.load(req.params.providerId);
    if (!provider || !managesProvider(provider, req.user)) return res.status(403).json({ message: "You cannot manage this provider's schedule." });
    next();
  }
  router.get("/workspace", requireRole("provider"), async (req, res) => {
    const list = await providers.find({ userId: req.user.id }).select(adminFields).sort({ name: 1 }).lean();
    res.json({ providers: list });
  });
  router.post("/providers/:providerId/access", authorize, async (req, res) => {
    const input = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Enter the provider's registered account email." });
    const account = await users.findOne({ email: input.data.email }).select("_id role accountStatus emailVerificationRequired emailVerifiedAt");
    if (!account || account.accountStatus !== "active" || (account.emailVerificationRequired && !account.emailVerifiedAt) || !["patient", "user", "provider"].includes(account.role)) {
      return res.status(400).json({ message: "The provider must first register and activate a non-admin account with this email." });
    }
    const existing = await providers.findOne({ userId: account._id }).select("_id").lean();
    if (existing && existing._id !== req.params.providerId) return res.status(409).json({ message: "This account is already linked to another provider." });
    try {
      await changeSchedule(req.params.providerId, (provider) => {
        if (provider.userId && provider.userId !== account._id) throw new AppointmentError(409, "This provider already has a linked login account.");
        return { changes: { userId: account._id } };
      }, repository);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "This account is already linked to another provider." });
      throw error;
    }
    const updated = await users.updateOne({ _id: account._id, role: { $in: ["patient", "user", "provider"] }, accountStatus: "active" }, { $set: { role: "provider" }, $inc: { sessionVersion: 1 } });
    if (!updated.matchedCount) throw new AppointmentError(409, "The account changed. Review its status and try again.");
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "PROVIDER_ACCESS_GRANTED", targetType: "User", targetId: account._id, metadata: { providerId: req.params.providerId } });
    res.json({ message: "Provider login linked. Sign in again using the provider login page." });
  });
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
  router.put("/providers/:providerId", manage, async (req, res) => {
    const schema = req.user.role === "admin" ? providerInput.extend({ revision: z.number().int().min(0) }) : providerSelfInput;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Review the provider details and reload before saving." });
    const { revision, ...data } = parsed.data;
    const result = await changeSchedule(req.params.providerId, (provider) => {
      if (!managesProvider(provider, req.user)) throw new AppointmentError(403, "You cannot manage this provider's schedule.");
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
    const provider = await repository.load(req.params.providerId);
    const admin = provider && managesProvider(provider, req.user);
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
    if (!provider || (!admin && !provider.active)) return res.status(404).json({ message: "Provider not found." });
    const slots = provider.slots.filter((slot) => (allDates || (new Date(slot.startsAt) >= from && new Date(slot.startsAt) < to))
      && (admin || (slot.status === "available" && new Date(slot.startsAt) > now())))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .map((slot) => visibleSlot(provider, slot, req.user, admin));
    if (admin) await record(req, "APPOINTMENT_SCHEDULE_VIEWED", provider._id);
    res.json({ slots });
  });
  router.post("/providers/:providerId/availability", manage, async (req, res) => {
    const input = availabilityInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: input.error.issues[0].message });
    await changeSchedule(req.params.providerId, (provider) => {
      if (!managesProvider(provider, req.user)) throw new AppointmentError(403, "You cannot manage this provider's schedule.");
      return addAvailability(provider, input.data, now());
    }, repository);
    await record(req, "APPOINTMENT_AVAILABILITY_CREATED", req.params.providerId);
    res.status(201).json({ message: "Availability published." });
  });
  router.post("/providers/:providerId/availability/removal-preview", manage, async (req, res) => {
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
  router.post("/providers/:providerId/availability/remove", manage, async (req, res) => {
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
    const schema = action === "book" ? z.strictObject({ patientState: z.enum(US_STATE_CODES) }) : z.strictObject({});
    const input = schema.safeParse(req.body || {});
    if (!input.success) return res.status(400).json({ message: "Choose a valid US state. Slot actions do not accept patient or schedule overrides." });
    const result = await changeSchedule(providerId, (provider) => changeSlot(provider, slotId, action, req.user, now(), input.data.patientState), repository);
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "APPOINTMENT_UPDATED", targetType: "AppointmentSlot", targetId: slotId, metadata: { providerId, operation: action } });
    const slot = result.provider.slots.find((item) => item._id === slotId);
    res.json({ message: action === "book" ? "Appointment confirmed." : action === "cancel" ? "Appointment cancelled." : "Schedule updated.",
      ...(slot ? { appointment: visibleSlot(result.provider, slot, req.user, managesProvider(result.provider, req.user)) } : {}) });
  });
  router.use((error, req, res, next) => {
    if (error instanceof AppointmentError) return res.status(error.status).json({ message: error.message });
    next(error);
  });
  return router;
}
export default createAppointmentRouter();
