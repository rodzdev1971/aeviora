import { z } from "zod";

export const MAX_QR_BYTES = 200 * 1024;
export const formLinkInput = z.strictObject({
  title: z.string().trim().min(1).max(120).regex(/^[^\r\n]+$/),
  url: z.string().trim().max(2000).refine((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !/\s/.test(value) && ![...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127); }
    catch { return false; }
  }, "Use an HTTPS form link without embedded credentials.").default(""),
  description: z.string().trim().max(500).default(""),
  enabled: z.boolean().default(true),
  qrImage: z.string().max(Math.ceil(MAX_QR_BYTES / 3) * 4 + 30).regex(/^(?:|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2})$/).default(""),
}).refine((value) => Boolean(value.url || value.qrImage), "Add a form URL or a QR image.");
export const formLinkIds = z.array(z.uuid()).max(5).refine((ids) => new Set(ids).size === ids.length).default([]);
export function appendFormLinks(text, forms) {
  if (!forms.length) return text;
  return `${text.trim()}\n\n${forms.map((form) => `${form.title}${form.url ? `\n${form.url}` : ""}${form.hasQrImage ? "\nQR code attached / Código QR adjunto." : ""}`).join("\n\n")}`;
}
