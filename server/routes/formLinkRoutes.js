import express from "express";
import { z } from "zod";
import FormLink from "../models/formLinks.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { formLinkInput } from "../../shared/formLinks.js";
import { qrAttachment } from "../services/formLinks.js";

export function createFormLinkRouter({ authenticate = requireAuth, authorize = requireRole("admin"), links = FormLink, audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.param("id", (req, res, next, id) => z.uuid().safeParse(id).success ? next() : res.status(400).json({ message: "Invalid form link ID." }));
  router.get("/", async (req, res) => {
    const input = z.object({ search: z.string().trim().max(100).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), enabled: z.enum(["true", "false"]).optional() }).safeParse(req.query);
    if (!input.success) return res.status(400).json({ message: "Use a valid search and page." });
    const { search, page, enabled } = input.data;
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = { ...(search ? { $or: [{ title: { $regex: literal, $options: "i" } }, { description: { $regex: literal, $options: "i" } }] } : {}), ...(enabled ? { enabled: enabled === "true" } : {}) };
    const [items, total] = await Promise.all([links.find(filter).select("title url description enabled hasQrImage updatedAt").sort({ title: 1, _id: 1 }).skip((page - 1) * 25).limit(25).lean(), links.countDocuments(filter)]);
    res.json({ links: items, total, page, totalPages: Math.ceil(total / 25) });
  });
  router.get("/:id", async (req, res) => {
    const link = await links.findById(req.params.id).select("+qrImage").lean();
    if (!link) return res.status(404).json({ message: "Form link not found." });
    res.json({ link });
  });
  async function save(req, res) {
    const input = formLinkInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Enter a title and an HTTPS form URL or a PNG/JPEG QR image up to 200 KB." });
    try { qrAttachment(input.data); }
    catch { return res.status(400).json({ message: "Upload a PNG or JPEG QR image up to 200 KB." }); }
    const data = { ...input.data, hasQrImage: Boolean(input.data.qrImage) };
    const saved = req.params.id ? await links.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }) : await links.create(data);
    if (!saved) return res.status(404).json({ message: "Form link not found." });
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "FORM_LINK_SAVED", targetType: "FormLink", targetId: saved._id });
    res.json({ link: { _id: saved._id, ...data } });
  }
  router.post("/", save);
  router.put("/:id", save);
  return router;
}
export default createFormLinkRouter();
