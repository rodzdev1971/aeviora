# Membership payments

Members choose a plan with Stripe checkout or Zelle. Zelle recipient: **786-280-7650 — Aeviora Wellness by Health LIfeguide LLC** (as supplied by the business).

## Zelle workflow

Selection creates a pending enrollment; it does not send money or mark a payment received. The monthly price is saved at enrollment. The first unpaid period starts on the enrollment date; each confirmation advances it one calendar month, clamped for shorter months. There is no proration. Confirm overdue periods in order. Catalog price changes do not change an existing Zelle enrollment.

Admins open **Membership payments** in the sidebar, verify the bank receipt, then choose **Confirm monthly payment** and enter its reference. The database records amount, period, reference, administrator, and confirmation time. A stale period cannot be confirmed twice, and a reference cannot be reused on that account. First confirmation changes membership from pending to active. Canceling stops reminders immediately; it does not issue a refund. Paid history remains saved. Confirm cancellation/refund terms with users before enrollment.

## Send reminders

Admins click **Send reminders** to process all member accounts, independent of the search filter. Keep the page open. Each recipient uses a separate request to stay within serverless duration limits. The server re-reads current records before each attempt:

- Account must be active.
- Zelle membership must be active, not pending or canceled, with the next unpaid period due now or overdue.
- Stripe subscription and latest invoice are retrieved directly from Stripe; only active/past-due subscriptions with an open unpaid invoice qualify. Scheduled cancellations are skipped too. No Zelle instructions are sent to Stripe members.
- Each account is claimed atomically for at most one reminder attempt per 24 hours. Failures retain the cooldown because SMTP delivery can be uncertain.

The UI reports accepted, skipped, and failed counts. SMTP acceptance is not proof of inbox delivery. If the session expires, API rate limits are reached, or the browser closes, sending stops; rerun later and recently attempted recipients are skipped. This is an admin-triggered process, not a background queue. Shared API limits still apply to large batches. A payment/cancellation occurring after the final database check can race a send already underway.

## Stripe setup

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_ORIGIN` in the backend environment. Configure the Stripe webhook at `/api/payments/webhook` for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Configure Stripe's billing portal as well. Checkout uses the selected catalog plan's monthly USD price.

Test checkout, webhook delivery, cancellation, and reminder eligibility using Stripe test mode before release. Zelle has no automatic bank verification: an admin must check the actual receipt. No live payments or reminder emails were sent during implementation.
