import express from "express";
import MembershipPlan from "../models/membershipPlans.js";
import Benefit from "../models/benefits.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { membershipInput, resolveMembership } from "../services/membershipPlans.js";

export function createMembershipRouter({ plans = MembershipPlan,
  catalog = () => Benefit.find().select("_id name description price").sort({ name: 1 }).lean(),
  authenticate = requireAuth, authorize = requireRole("admin"), audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.get("/", async (req, res) => {
    const [memberships, benefits] = await Promise.all([plans.find().sort({ price: 1, name: 1 }), catalog()]);
    res.json({ memberships, benefits });
  });
  router.param("id", (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: "Invalid membership ID." });
    next();
  });
  async function save(req, res) {
    const parsed = membershipInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a membership name and nonnegative prices with at most two decimal places. Benefits must be unique catalog entries." });
    let membership;
    try {
      const data = resolveMembership(parsed.data, await catalog());
      membership = req.params.id
        ? await plans.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true })
        : await plans.create(data);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "A membership with this name already exists." });
      if (error.status === 409) return res.status(409).json({ message: error.message });
      throw error;
    }
    if (!membership) return res.status(404).json({ message: "Membership not found." });
    await audit({ req, actorId: req.user.id, actorRole: req.user.role,
      action: req.params.id ? "MEMBERSHIP_UPDATED" : "MEMBERSHIP_CREATED",
      targetType: "MembershipPlan", targetId: String(membership._id) });
    return res.status(req.params.id ? 200 : 201).json({ membership });
  }
  router.post("/", save);
  router.put("/:id", save);
  router.delete("/:id", async (req, res) => {
    const membership = await plans.findByIdAndDelete(req.params.id);
    if (!membership) return res.status(404).json({ message: "Membership not found." });
    await audit({ req, actorId: req.user.id, actorRole: req.user.role,
      action: "MEMBERSHIP_DELETED", targetType: "MembershipPlan", targetId: req.params.id });
    return res.json({ message: "Membership deleted." });
  });
  return router;
}

export default createMembershipRouter();
