# 30-day membership billing and reminders

New Stripe checkouts use `interval: day, interval_count: 30` and automatically renew until renewal is canceled. New verified Zelle payments cover 30 × 24 hours. Early Zelle payments extend the current paid end; payments after expiry start a new period when the administrator confirms receipt. Existing historical receipt dates are preserved.

Membership access depends on confirmed payment dates, not simply Stripe's `active` status. `invoice.paid`, subscription updates, and dashboard refreshes synchronize payment coverage. Failed payments cannot extend access. Cancellation preserves confirmed coverage through expiration. Stripe billing periods start at the invoice's billing-period start; a delayed payment settles that invoiced period, rather than silently moving Stripe's renewal anchor.

## Deployment

1. Add a strong random **CRON_SECRET** to Vercel Production. Keep the existing SMTP and Stripe environment settings. See `server/renewal.env.example`.
2. Deploy. `vercel.json` runs `/api/cron/renewal-reminders` daily at 12:00 UTC. The endpoint requires Vercel's bearer secret. No browser login is used.
3. Ensure the Stripe webhook includes `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Check that MongoDB created the unique `RenewalNotice.key` index. Monitor cron responses and the `renewalnotices` collection.

Reminders are sent five UTC calendar dates before the live Stripe renewal date. They skip canceled, inactive, and nonrenewing subscriptions. Each subscription/date has one delivery record. SMTP acceptance is not proof of inbox delivery. Failed or interrupted deliveries require review before retrying because a timeout may occur after SMTP acceptance. A `503` cron response means a failure or deferred accounts; rerun the authenticated endpoint the same day after investigation. The function has a 40-second work budget and five workers; larger directories require a durable queue or more frequent scheduled invocations. See [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Existing Stripe memberships

Changing application code does not change prices attached to live Stripe subscriptions. Run `node server/scripts/migrate-thirty-day-billing.js` with server environment variables for a dry-run count. Review before running with `--apply`. It schedules eligible single-price monthly subscriptions to switch to 30-day pricing at their existing paid end, with no immediate charge or shortened existing period. It skips canceled, unpaid, discounted, taxed, and already scheduled subscriptions for individual review. If interrupted after schedule creation, review that schedule in Stripe before retrying. Scheduled subscriptions may need Stripe-side management until the transition finishes. This migration has not been run against live accounts.

## Upgrades

Users can preview a more expensive plan while their membership is paid and unexpired. The preview shows current expiration, unused-time credit, amount due, and an estimated new expiration. A $20 plan with 15 of 30 days remaining provides $10 credit toward a $60 plan, yielding $50 due. The upgraded period is 30 days. Existing legacy Stripe periods are prorated against their actual interval by Stripe.

Stripe uses an invoice preview and the same proration timestamp on confirmation, resets the billing anchor, and uses a pending update so unpaid upgrades do not grant benefits. Taxes and account credits can affect the final invoice. Hosted invoice payment completes payment when additional authentication is required. A stored quote and Stripe idempotency key prevent duplicate upgrade charges. The quote expires in 15 minutes; payment already in progress can be retried with that quote. Prices and plan labels come from server records.

Zelle previews also require administrator confirmation of the quoted receipt. Administrators find the pending upgrade under Membership payments. The new period begins at verification. Unused credit is calculated at quote time. Prepaid periods longer than 30 days need individual review. The application never marks the next period paid merely because renewal was reactivated.
