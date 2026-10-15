import { randomUUID } from "node:crypto";
import Provider from "../models/appointmentProviders.js";
import { availabilitySlots } from "../../shared/appointments.js";

export const scheduleCapacity = 2000;
export class AppointmentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (message, status = 409) => { throw new AppointmentError(status, message); };
export const publicProvider = (provider) => Object.fromEntries(["_id", "name", "credentials", "specialty", "bio", "phone", "timeZone", "active"].map((key) => [key, provider[key]]));
export function visibleSlot(provider, slot, user, admin = false) {
  const own = slot.userId === user.id;
  return {
    _id: slot._id, providerId: provider._id, providerName: provider.name, specialty: provider.specialty,
    timeZone: provider.timeZone, startsAt: slot.startsAt, endsAt: slot.endsAt, mode: slot.mode, location: slot.location,
    status: slot.status, phone: provider.phone,
    ...((admin || (own && slot.status === "booked")) ? { meetingUrl: slot.meetingUrl } : {}),
    ...(own || admin ? { cancelledBy: slot.cancelledBy, cancelledAt: slot.cancelledAt } : {}),
    ...(admin ? { patientName: slot.patientName, patientEmail: slot.patientEmail, userId: slot.userId } : {}),
  };
}

export const appointmentRepository = {
  load: (id) => Provider.findById(id).select("+slots").lean(),
  compareAndSwap: (id, revision, changes) => Provider.findOneAndUpdate({ _id: id, revision }, { $set: changes, $inc: { revision: 1 } }, { returnDocument: "after", runValidators: true }).select("+slots").lean(),
};

// All changes (including provider deactivation) contend on one provider revision.
// This keeps overlap checking and booking atomic across multiple server instances.
export async function changeSchedule(id, change, repository = appointmentRepository) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const provider = await repository.load(id);
    if (!provider) fail("Provider not found.", 404);
    const result = change(provider);
    if (provider.slots.length > scheduleCapacity) fail("This provider's schedule has reached capacity. Remove unused slots or contact support to archive past appointments.");
    const saved = await repository.compareAndSwap(id, provider.revision, { slots: provider.slots, ...result.changes });
    if (saved) return { provider: saved, slotId: result.slotId };
  }
  fail("The schedule changed. Refresh and try again.");
}

export function addAvailability(provider, input, now = new Date()) {
  if (!provider.active) fail("Activate this provider before adding availability.");
  let slots;
  try { slots = availabilitySlots(input, provider.timeZone, now); }
  catch (error) { fail(error.message, 400); }
  for (const slot of slots) {
    if (provider.slots.some((existing) => existing.status !== "cancelled" && new Date(existing.startsAt) < slot.endsAt && new Date(existing.endsAt) > slot.startsAt)) fail("This availability overlaps an existing slot for this provider.");
  }
  provider.slots.push(...slots.map((slot) => ({ ...slot, _id: randomUUID() })));
  return {};
}

export function changeSlot(provider, slotId, action, user, now = new Date()) {
  const slot = provider.slots.find((item) => item._id === slotId);
  if (!slot) fail("Appointment slot not found.", 404);
  const admin = user.role === "admin";
  if (action !== "book" && action !== "cancel" && !admin) fail("Administrator access required.", 403);
  if (action === "cancel" && !admin && slot.userId !== user.id) fail("Appointment not found.", 404);
  if (action === "cancel" && slot.status === "cancelled") return { slotId };
  if (action === "remove") {
    if (!["available", "blocked"].includes(slot.status)) fail("Booked and cancelled appointments must be retained.");
    provider.slots = provider.slots.filter((item) => item._id !== slotId);
    return { slotId };
  }
  if (new Date(slot.startsAt) <= now) fail("Past or started appointments cannot be changed.");
  if (action === "book") {
    if (slot.status === "booked" && slot.userId === user.id) return { slotId };
    if (!provider.active || slot.status !== "available") fail("This slot is no longer available. Choose another time.");
    Object.assign(slot, { status: "booked", userId: user.id, patientName: `${user.firstName} ${user.lastName}`.trim(), patientEmail: user.email, bookedAt: now });
  } else if (action === "cancel") {
    if (slot.status !== "booked") fail("Only booked appointments can be cancelled.");
    Object.assign(slot, { status: "cancelled", cancelledAt: now, cancelledBy: admin ? "admin" : "patient" });
    // A fresh ID preserves the cancelled booking and prevents stale cancellation requests from touching a new reservation.
    if (!admin && provider.active && provider.slots.length < scheduleCapacity) provider.slots.push(replacement(slot));
  } else if (action === "block") {
    if (slot.status !== "available") fail("Only available slots can be blocked.");
    slot.status = "blocked";
  } else if (action === "open") {
    if (!provider.active) fail("Activate the provider before reopening slots.");
    if (slot.status === "blocked") slot.status = "available";
    else if (slot.status === "cancelled") {
      if (provider.slots.some((other) => other.status !== "cancelled" && new Date(other.startsAt) < new Date(slot.endsAt) && new Date(other.endsAt) > new Date(slot.startsAt))) fail("A replacement slot already exists for this time.");
      provider.slots.push(replacement(slot));
    } else fail("Only blocked or cancelled slots can be reopened.");
  } else fail("Invalid slot action.", 400);
  return { slotId };
}

function replacement(slot) {
  return { _id: randomUUID(), startsAt: slot.startsAt, endsAt: slot.endsAt, mode: slot.mode, location: slot.location, meetingUrl: slot.meetingUrl, status: "available" };
}
