import { getLanguage } from "../i18n/language.js";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", getLanguage());
  const response = await fetch(base + path, {
    credentials: "include",
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || "The request could not be completed.",
    );
    error.fields = data.fields;
    throw error;
  }
  return data;
}
