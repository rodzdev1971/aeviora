import { zonedDateTime } from "../../shared/appointments.js";

export function dateInputValue(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function scheduleRange(date, timeZone, days = 7) {
  const end = new Date(date + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + days);
  return new URLSearchParams({ from: zonedDateTime(date + "T00:00", timeZone).toISOString(), to: zonedDateTime(end.toISOString().slice(0, 10) + "T00:00", timeZone).toISOString() }).toString();
}
export function appointmentDate(date, language = "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", { timeZone: "UTC", dateStyle: "full" }).format(new Date(date + "T12:00:00Z"));
}
export function scheduleDays(slots, timeZone) {
  const dates = new Map();
  for (const slot of slots) {
    const date = dateInputValue(new Date(slot.startsAt), timeZone);
    if (!dates.has(date)) dates.set(date, []);
    dates.get(date).push(slot);
  }
  return [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
    date, slots: [...items].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
  }));
}
export function appointmentClock(slot, timeZone, language = "en") {
  const formatter = new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  return `${formatter.format(new Date(slot.startsAt))} – ${formatter.format(new Date(slot.endsAt))}`;
}
export function appointmentTime(slot, timeZone, language = "en") {
  const locale = language === "es" ? "es-US" : "en-US";
  const start = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.startsAt));
  const end = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot.endsAt));
  return `${start} – ${end}`;
}
