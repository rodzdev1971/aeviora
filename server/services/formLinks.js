import { MAX_QR_BYTES, appendFormLinks } from "../../shared/formLinks.js";

export function qrAttachment(form) {
  if (!form.qrImage) return null;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(form.qrImage);
  if (!match) throw new Error("Invalid QR image.");
  const content = Buffer.from(match[2], "base64");
  const png = content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = content[0] === 255 && content[1] === 216 && content[2] === 255 && content.at(-2) === 255 && content.at(-1) === 217;
  if (!content.length || content.length > MAX_QR_BYTES || content.toString("base64") !== match[2] || (match[1] === "png" ? !png : !jpeg)) throw new Error("Upload a PNG or JPEG QR image up to 200 KB.");
  return { filename: `form-${form._id || "qr"}.${match[1] === "jpeg" ? "jpg" : "png"}`, contentType: `image/${match[1]}`, content };
}

export function formLinkEmail(text, forms) {
  const attachments = forms.map(qrAttachment).filter(Boolean);
  return { text: appendFormLinks(text, forms), ...(attachments.length ? { attachments } : {}) };
}
