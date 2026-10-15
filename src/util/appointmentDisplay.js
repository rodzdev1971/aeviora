import { zonedDateTime } from "../../shared/appointments.js";

export function dateInputValue(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function scheduleRange(date, timeZone) {
  const end = new Date(date + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
  return new URLSearchParams({ from: zonedDateTime(date + "T00:00", timeZone).toISOString(), to: zonedDateTime(end.toISOString().slice(0, 10) + "T00:00", timeZone).toISOString() }).toString();
}
export function appointmentTime(slot, timeZone, language = "en") {
  const locale = language === "es" ? "es-US" : "en-US";
  const start = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.startsAt));
  const end = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot.endsAt));
  return `${start} – ${end}`;
}
