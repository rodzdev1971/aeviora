import express from "express";
import { z } from "zod";
import EmailTemplate from "../models/emailTemplates.js";
import FormLink from "../models/formLinks.js";
import { formLinkIds } from "../../shared/formLinks.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { registrationTemplate, hasAppointmentPlaceholders } from "../../shared/emailTemplates.js";
import { logAudit } from "../utils/auditLogger.js";

export const templateInput = z.strictObject({ name: z.string().trim().min(1).max(100), subject: z.string().trim().min(1).max(160).regex(/^[^\r\n]+$/), text: z.string().trim().min(1).max(10000), formLinkIds });
async function includeFormLinks(templates) {
  const ids = [...new Set(templates.flatMap((template) => template.formLinkIds || []))];
  const forms = ids.length ? await FormLink.find({ _id: { $in: ids } }).select("title url description enabled hasQrImage").lean() : [];
  return templates.map((template) => ({ ...(template.toObject ? template.toObject() : template), formLinks: (template.formLinkIds || []).map((id) => forms.find((form) => form._id === id) || { _id: id, title: "Unavailable saved form", enabled: false }) }));
}
const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.param("id", (req, res, next, id) => id === "registration" || z.uuid().safeParse(id).success ? next() : res.status(400).json({ message: "Invalid template ID." }));
router.get("/", async (req, res) => {
  const templates = await EmailTemplate.find().sort({ name: 1 }).lean();
  if (!templates.some((template) => template._id === "registration")) templates.unshift(registrationTemplate);
  res.json({ templates: await includeFormLinks(templates) });
});
async function save(req, res) {
  const parsed = templateInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a template name, single-line subject, and message within the field limits." });
  if (req.params.id === "registration" && !parsed.data.text.includes("{{accountStatus}}")) return res.status(400).json({ message: "Keep {{accountStatus}} in the registration template so pending and active users receive the correct instructions." });
  if (req.params.id === "registration" && hasAppointmentPlaceholders(parsed.data)) return res.status(400).json({ message: "Appointment placeholders belong in appointment email templates, not the automatic registration welcome." });
  if (parsed.data.formLinkIds.length && await FormLink.countDocuments({ _id: { $in: parsed.data.formLinkIds }, enabled: true }) !== parsed.data.formLinkIds.length) return res.status(409).json({ message: "A selected form is unavailable. Refresh the form library and review your selection." });
  const template = req.params.id ? await EmailTemplate.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true, upsert: req.params.id === "registration", runValidators: true }) : await EmailTemplate.create(parsed.data);
  if (!template) return res.status(404).json({ message: "Template not found." });
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "EMAIL_TEMPLATE_SAVED", targetType: "EmailTemplate", targetId: template._id });
  res.json({ template: (await includeFormLinks([template]))[0] });
}
router.post("/", save);
router.put("/:id", save);
router.delete("/:id", async (req, res) => {
  if (req.params.id === "registration") return res.status(400).json({ message: "The registration template can be edited, but not deleted." });
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ message: "Template not found." });
  await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "EMAIL_TEMPLATE_DELETED", targetType: "EmailTemplate", targetId: template._id });
  res.json({ message: "Template deleted." });
});
export default router;
