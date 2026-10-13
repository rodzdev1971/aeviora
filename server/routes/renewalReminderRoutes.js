import express from "express";
import { timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import User from "../models/users.js";
import Notice from "../models/renewalNotice.js";
import { renewalReminder } from "../services/renewalReminders.js";
import { sendEmail } from "../services/email.js";
const router = express.Router();
router.get("/renewal-reminders", async (req, res) => {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`), actual = Buffer.from(req.headers.authorization || "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ message: "Unauthorized." });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 5000, maxNetworkRetries: 1 });
  const now = new Date(), deadline = Date.now() + 40000;
  const counts = { sent: 0, skipped: 0, failed: 0, deferred: 0 };
  const accounts = await User.find({ accountStatus: "active", stripeSubscriptionId: { $ne: null } }).select("email accountStatus stripeSubscriptionId stripeCustomerId membershipName").lean();
  let index = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (index < accounts.length && Date.now() < deadline) {
      const user = accounts[index++];
      try { counts[await renewalReminder(user, { stripe, notices: Notice, send: sendEmail, now, origin: (process.env.FRONTEND_ORIGIN || "https://www.aeviorawellness.com").replace(/\/$/, "") })]++; }
      catch { counts.failed++; }
    }
  }));
  counts.deferred = accounts.length - index;
  res.status(counts.failed || counts.deferred ? 503 : 200).json(counts);
});
export default router;
