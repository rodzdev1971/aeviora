// Supply MONGO_URI and STRIPE_SECRET_KEY through the process environment.
// Dry-run by default; --apply schedules the transition at the existing paid end.
import mongoose from "mongoose";
import Stripe from "stripe";
import User from "../models/users.js";

async function run() {
  if (!process.env.MONGO_URI || !process.env.STRIPE_SECRET_KEY) throw new Error("Required environment configuration missing.");
  await mongoose.connect(process.env.MONGO_URI);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const apply = process.argv.includes("--apply");
  const counts = { eligible: 0, scheduled: 0, skipped: 0 };
  for await (const user of User.find({ stripeSubscriptionId: { $ne: null } }).cursor()) {
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, { expand: ["latest_invoice"] });
    const item = sub.items.data[0];
    if (sub.status !== "active" || sub.cancel_at_period_end || sub.cancel_at || sub.schedule || sub.pending_update || sub.items.data.length !== 1 || sub.latest_invoice?.status !== "paid" || sub.discounts?.length || sub.automatic_tax?.enabled || item?.tax_rates?.length || sub.default_tax_rates?.length || item.quantity !== 1 || item.price.recurring?.interval !== "month" || item.price.recurring?.interval_count !== 1) { counts.skipped++; continue; }
    counts.eligible++;
    if (!apply) continue;
    const price = await stripe.prices.create({ currency: item.price.currency, unit_amount: item.price.unit_amount, product: typeof item.price.product === "string" ? item.price.product : item.price.product.id, recurring: { interval: "day", interval_count: 30 }, metadata: item.price.metadata }, { idempotencyKey: `thirty-day-price-${item.price.id}` });
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: sub.id }, { idempotencyKey: `thirty-day-schedule-${sub.id}` });
    await stripe.subscriptionSchedules.update(schedule.id, { end_behavior: "release", proration_behavior: "none", phases: [
      { start_date: schedule.current_phase.start_date, end_date: item.current_period_end, items: [{ price: item.price.id, quantity: 1 }], proration_behavior: "none" },
      { start_date: item.current_period_end, end_date: item.current_period_end + 30 * 86400, items: [{ price: price.id, quantity: 1 }], proration_behavior: "none", metadata: sub.metadata },
    ] }, { idempotencyKey: `thirty-day-phases-${sub.id}` });
    counts.scheduled++;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...counts }));
}
run().catch(() => { console.error("Billing migration failed. Review the Stripe schedule before retrying; no credentials were logged."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
