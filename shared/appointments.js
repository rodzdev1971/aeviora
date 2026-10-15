import { z } from "zod";

export const timeZoneInput = z.string().trim().max(80).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return Boolean(value); } catch { return false; }
}, "Choose a valid IANA time zone, such as America/New_York.");
export const providerInput = z.strictObject({
  name: z.string().trim().min(2).max(120), credentials: z.string().trim().max(80).default(""),
  specialty: z.string().trim().min(2).max(120), bio: z.string().trim().max(1000).default(""),
  email: z.string().trim().toLowerCase().email().max(254), phone: z.string().trim().max(40).default(""),
  timeZone: timeZoneInput.default("America/New_York"), active: z.boolean().default(true),
});
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
export const availabilityInput = z.strictObject({
  start: localDateTime, end: localDateTime,
  duration: z.number().int().min(15).max(120).default(30),
  mode: z.enum(["telehealth", "in_person"]),
  location: z.string().trim().max(300).default(""),
  meetingUrl: z.string().trim().max(500).default(""),
}).superRefine((value, context) => {
  if (value.mode === "in_person" && value.location.length < 5) context.addIssue({ code: "custom", path: ["location"], message: "Enter the full visit address." });
  if (value.mode === "telehealth") {
    try { const url = new URL(value.meetingUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); }
    catch { context.addIssue({ code: "custom", path: ["meetingUrl"], message: "Enter a valid HTTPS telehealth link without embedded credentials." }); }
  }
});

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (name) => parts.find((part) => part.type === name).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Test candidate offsets on both sides of DST. Never silently shift a missing or repeated time.
export function zonedDateTime(value, timeZone) {
  if (!localDateTime.safeParse(value).success || !timeZoneInput.safeParse(timeZone).success) throw new Error("Enter valid dates and a time zone.");
  const naive = Date.parse(value + ":00Z");
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== value) throw new Error("Enter a valid calendar date.");
  const offsets = new Set([-36, 0, 36].map((hours) => {
    const sample = naive + hours * 3600000;
    return Date.parse(localParts(new Date(sample), timeZone) + ":00Z") - sample;
  }));
  const candidates = [...offsets].map((offset) => new Date(naive - offset)).filter((date) => localParts(date, timeZone) === value);
  if (candidates.length !== 1) throw new Error("This local time is missing or repeated because of daylight saving time. Choose another time.");
  return candidates[0];
}

export function availabilitySlots(input, timeZone, now = new Date()) {
  const data = availabilityInput.parse(input);
  const start = zonedDateTime(data.start, timeZone), end = zonedDateTime(data.end, timeZone);
  const span = end - start, length = data.duration * 60000;
  if (start <= now || end > new Date(now.getTime() + 366 * 86400000)) throw new Error("Availability must be in the future and within the next year.");
  if (span <= 0 || span > 12 * 3600000 || span % length !== 0) throw new Error("Choose a window up to 12 hours long that divides evenly into the appointment duration.");
  return Array.from({ length: span / length }, (_, index) => ({
    startsAt: new Date(start.getTime() + index * length), endsAt: new Date(start.getTime() + (index + 1) * length),
    mode: data.mode, location: data.mode === "in_person" ? data.location : "", meetingUrl: data.mode === "telehealth" ? data.meetingUrl : "", status: "available",
  }));
}
