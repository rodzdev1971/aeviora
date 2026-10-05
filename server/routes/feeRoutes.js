import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { feeCatalogs } from "../../shared/feeCatalog.js";
import { feeInput } from "../services/feeCatalog.js";

export function createFeeRouter({ collection = (source) => mongoose.connection.db.collection(source),
  authenticate = requireAuth, authorize = requireRole("admin"), audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.param("source", (req, res, next, source) => {
    if (!Object.hasOwn(feeCatalogs, source)) return res.status(404).json({ message: "Fee catalog not found." });
    next();
  });
  router.param("id", (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: "Invalid fee ID." });
    next();
  });
  router.get("/:source", async (req, res) => {
    const config = feeCatalogs[req.params.source];
    const fees = await collection(req.params.source).find({}, { projection: {
      name: 1, description: 1, order: 1, [config.billcode]: 1, retailPrice: 1, [config.prices]: 1, pricingType: 1, discount: 1,
    } }).sort({ name: 1, description: 1 }).toArray();
    res.json({ fees });
  });
  async function save(req, res) {
    const parsed = feeInput(req.params.source).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a name, description, valid retail price, and 1–200 unique providers with nonnegative prices of at most two decimal places.",
      fields: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
    const data = { ...parsed.data, updatedAt: new Date() };
    if (data.pricingType === "discount") {
      for (const source of ["laboratoryFees", "diagnosticFees"]) {
        const ids = data.discount[source].feeIds;
        if (ids.length && await collection(source).countDocuments({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }) !== ids.length) {
          return res.status(400).json({ message: "An eligible or excluded fee no longer exists. Refresh and update the discount selections." });
        }
      }
    }
    const store = collection(req.params.source);
    let fee;
    if (req.params.id) {
      const update = { $set: data };
      if (req.params.source === "serviceFees") update.$unset = data.pricingType === "discount"
        ? { retailPrice: "", servicePrices: "" } : { pricingType: "", discount: "" };
      fee = await store.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(req.params.id) }, update, { returnDocument: "after" });
      if (!fee) return res.status(404).json({ message: "Fee not found." });
    } else {
      data.createdAt = new Date();
      const result = await store.insertOne(data);
      fee = { ...data, _id: result.insertedId };
    }
    await audit({ req, actorId: req.user.id, actorRole: req.user.role,
      action: req.params.id ? "FEE_UPDATED" : "FEE_CREATED", targetType: req.params.source, targetId: String(fee._id) });
    return res.status(req.params.id ? 200 : 201).json({ fee });
  }
  router.post("/:source", save);
  router.put("/:source/:id", save);
  return router;
}

export default createFeeRouter();
