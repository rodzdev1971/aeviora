import Provider from "../models/appointmentProviders.js";

function details(provider, slot) {
  return { providerId: provider._id, slotId: slot._id, revision: provider.revision || 0, providerName: provider.name, timeZone: provider.timeZone, startsAt: new Date(slot.startsAt).toISOString() };
}

export async function emailAppointments(userId, { providers = Provider, now = new Date() } = {}) {
  const list = await providers.find({ slots: { $elemMatch: { userId, status: "booked" } } }).select("name timeZone revision +slots").lean();
  const cutoff = now.getTime() - 90 * 86400000;
  return list.flatMap((provider) => provider.slots.filter((slot) => slot.userId === userId && slot.status === "booked" && new Date(slot.startsAt).getTime() >= cutoff).map((slot) => details(provider, slot)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function emailAppointment(userId, selection, { providers = Provider } = {}) {
  const provider = await providers.findById(selection.providerId).select("name timeZone revision +slots").lean();
  if (!provider || (provider.revision || 0) !== selection.revision) return null;
  const slot = provider.slots.find((item) => item._id === selection.slotId && item.userId === userId && item.status === "booked");
  return slot ? details(provider, slot) : null;
}
