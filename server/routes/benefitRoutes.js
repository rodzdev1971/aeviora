import express from "express";
import mongoose from "mongoose";
import Benefit from "../models/benefits.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { benefitInput, feeOptions, resolveBenefit } from "../services/benefits.js";
import { logAudit } from "../utils/auditLogger.js";
import { feeCatalogs } from "../../shared/feeCatalog.js";

async function loadOptions(selections) {
  const groups = await Promise.all(Object.keys(feeCatalogs).map(async (source) => {
    const filter = selections ? { _id: { $in: selections.filter((item) => item.source === source)
      .map((item) => new mongoose.Types.ObjectId(item.feeId)) } } : {};
    const documents = await mongoose.connection.db.collection(source).find(filter, {
      projection: { name: 1, description: 1, order: 1, billCode: 1, billcode: 1, retailPrice: 1, labPrices: 1, diagnosticPrices: 1, servicePrices: 1, pricingType: 1, discount: 1 },
    }).toArray();
    return feeOptions(documents, source);
  }));
  return groups.flat().sort((a, b) => a.name.localeCompare(b.name) || a.provider.localeCompare(b.provider));
}

// Dependencies are injectable so API tests can use synthetic storage.
export function createBenefitRouter({ benefits = Benefit, catalog = loadOptions,
  authenticate = requireAuth, authorize = requireRole("admin"), audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.get("/fee-options", async (req, res) => res.json({ options: await catalog() }));
  router.get("/", async (req, res) => res.json({ benefits: await benefits.find().sort({ createdAt: -1 }) }));
  router.param("id", (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: "Invalid benefit ID." });
    next();
  });
  async function save(req, res) {
    const parsed = benefitInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a name, description, valid price, and 1–200 catalog services. Amounts must have at most two decimal places." });
    let data;
    try {
      data = resolveBenefit(parsed.data, await catalog(parsed.data.services));
    } catch (error) {
      if (error.status === 409) return res.status(409).json({ message: error.message });
      throw error;
    }
    const benefit = req.params.id
      ? await benefits.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true })
      : await benefits.create(data);
    if (!benefit) return res.status(404).json({ message: "Benefit not found." });
    await audit({ req, actorId: req.user.id, actorRole: req.user.role,
      action: req.params.id ? "BENEFIT_UPDATED" : "BENEFIT_CREATED", targetType: "Benefit", targetId: String(benefit._id) });
    return res.status(req.params.id ? 200 : 201).json({ benefit });
  }
  router.post("/", save);
  router.put("/:id", save);
  router.delete("/:id", async (req, res) => {
    const benefit = await benefits.findByIdAndDelete(req.params.id);
    if (!benefit) return res.status(404).json({ message: "Benefit not found." });
    await audit({ req, actorId: req.user.id, actorRole: req.user.role,
      action: "BENEFIT_DELETED", targetType: "Benefit", targetId: req.params.id });
    return res.json({ message: "Benefit deleted." });
  });
  return router;
}

export default createBenefitRouter();
