import spanish from "./es.json" with { type: "json" };

export const LANGUAGE_KEY = "aeviora.language";
const listeners = new Set();
let language = "en";
try {
  if (globalThis.localStorage?.getItem(LANGUAGE_KEY) === "es") language = "es";
} catch { /* Storage may be disabled; language switching still works. */ }

export function getLanguage() { return language; }
export function getLocale() { return language === "es" ? "es-US" : "en-US"; }
export function subscribeLanguage(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function setLanguage(value) {
  if (!["en", "es"].includes(value)) return;
  language = value;
  try { globalThis.localStorage?.setItem(LANGUAGE_KEY, value); } catch { /* Optional persistence. */ }
  if (typeof document !== "undefined") document.documentElement.lang = value;
  listeners.forEach((listener) => listener());
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(spanish).filter(([key]) => /\{\{\d+\}\}/.test(key)).map(([key, translated]) => {
  const slots = [...key.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1]);
  return { regex: new RegExp(`^${key.split(/\{\{\d+\}\}/).map(escape).join("(.+?)")}$`), slots, translated };
});

// Translate presentation strings only. Objects, React elements and numeric values
// pass through untouched; form values and API payloads remain in their original form.
export function translate(value, selectedLanguage = language) {
  if (selectedLanguage !== "es" || typeof value !== "string") return value;
  const key = value.replace(/\s+/g, " ").trim();
  const prefix = value.match(/^\s*/)[0], suffix = value.match(/\s*$/)[0];
  if (Object.hasOwn(spanish, key)) return prefix + spanish[key] + suffix;
  const reference = key.match(/^(.*) Reference: ([a-f\d-]{36})$/i);
  if (reference && Object.hasOwn(spanish, reference[1])) return `${prefix}${spanish[reference[1]]} Referencia: ${reference[2]}${suffix}`;
  for (const { regex, slots, translated } of patterns) {
    const match = key.match(regex);
    if (match) return prefix + translated.replace(/\{\{(\d+)\}\}/g, (_, index) => match[slots.indexOf(index) + 1]) + suffix;
  }
  return value;
}

export const t = translate;
