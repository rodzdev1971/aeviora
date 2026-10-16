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
export const availabilityRemovalInput = z.discriminatedUnion("scope", [
  z.strictObject({ scope: z.literal("day"), date: z.iso.date() }),
  z.strictObject({ scope: z.literal("hours"), date: z.iso.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
]);

export function availabilityRemovalSelection(slots, input, timeZone) {
  const data = availabilityRemovalInput.parse(input);
  timeZoneInput.parse(timeZone);
  let overlaps;
  if (data.scope === "hours") {
    const start = zonedDateTime(`${data.date}T${data.startTime}`, timeZone);
    const end = zonedDateTime(`${data.date}T${data.endTime}`, timeZone);
    if (end <= start) throw new Error("Choose an end time after the start time on the same day.");
    overlaps = (slot) => new Date(slot.startsAt) < end && new Date(slot.endsAt) > start;
  } else {
    // Compare local dates so whole-day removal also works on 23/25-hour days
    // and in zones where a daylight saving transition skips midnight.
    overlaps = (slot) => localParts(new Date(slot.startsAt), timeZone).slice(0, 10) <= data.date
      && localParts(new Date(new Date(slot.endsAt).getTime() - 1), timeZone).slice(0, 10) >= data.date;
  }
  const matching = slots.filter(overlaps);
  return {
    removable: matching.filter((slot) => ["available", "blocked"].includes(slot.status)),
    bookedCount: matching.filter((slot) => slot.status === "booked").length,
  };
}
export const availabilityInput = z.strictObject({
  start: localDateTime, end: localDateTime,
  duration: z.number().int().min(15).max(120).default(30),
  mode: z.enum(["telehealth", "in_person"]),
  location: z.string().trim().max(300).default(""),
  meetingUrl: z.string().trim().max(500).default(""),
  recurrence: z.strictObject({
    until: z.iso.date(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Choose at least one weekday.").max(7)
      .refine((days) => new Set(days).size === days.length, "Choose each weekday only once."),
  }).optional(),
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
  if (!data.recurrence) return windowSlots(data, timeZone, now);
  const firstDate = data.start.slice(0, 10);
  if (data.end.slice(0, 10) !== firstDate) throw new Error("For a repeating schedule, enter start and end times on the same date.");
  const firstDay = Date.parse(firstDate + "T00:00:00Z"), lastDay = Date.parse(data.recurrence.until + "T00:00:00Z");
  if (!Number.isFinite(firstDay) || new Date(firstDay).toISOString().slice(0, 10) !== firstDate) throw new Error("Enter a valid calendar date.");
  if (lastDay < firstDay || lastDay - firstDay > 365 * 86400000) throw new Error("Choose a repeat end date on or after the start date, within one year.");
  // Advance calendar dates, then resolve each day's local time independently.
  // Adding 24 hours to a UTC slot would move office hours across DST changes.
  const slots = [];
  for (let day = firstDay; day <= lastDay; day += 86400000) {
    const date = new Date(day);
    if (!data.recurrence.weekdays.includes(date.getUTCDay())) continue;
    const localDate = date.toISOString().slice(0, 10);
    try { slots.push(...windowSlots({ ...data, start: localDate + data.start.slice(10), end: localDate + data.end.slice(10) }, timeZone, now)); }
    catch (error) { throw new Error(`${localDate}: ${error.message}`, { cause: error }); }
    if (slots.length > 2000) throw new Error("This pattern creates more than 2,000 slots. Choose fewer dates or a shorter daily window.");
  }
  if (!slots.length) throw new Error("No selected weekdays fall within these dates.");
  return slots;
}

function windowSlots(data, timeZone, now) {
  const start = zonedDateTime(data.start, timeZone), end = zonedDateTime(data.end, timeZone);
  const span = end - start, length = data.duration * 60000;
  if (start <= now || end > new Date(now.getTime() + 366 * 86400000)) throw new Error("Availability must be in the future and within the next year.");
  if (span <= 0 || span > 12 * 3600000 || span % length !== 0) throw new Error("Choose a window up to 12 hours long that divides evenly into the appointment duration.");
  return Array.from({ length: span / length }, (_, index) => ({
    startsAt: new Date(start.getTime() + index * length), endsAt: new Date(start.getTime() + (index + 1) * length),
    mode: data.mode, location: data.mode === "in_person" ? data.location : "", meetingUrl: data.mode === "telehealth" ? data.meetingUrl : "", status: "available",
  }));
}
