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
# Administrator Zelle receipts and balances

**Current billing behavior:** see [30-day memberships](thirty-day-memberships.md) for exact 30-day periods, paid-access expiration, upgrades, the five-day reminder cron, and legacy Stripe migration. This supersedes the calendar-month scheduling notes below. Unpaid Zelle renewals show the next period's cost; months without paid access do not accrue additional charges.

## Paid periods, cancellation, and reactivation

Cancellation stops renewal; confirmed Zelle access remains available until the latest receipt's period end. Administrators can **Reactivate Zelle renewal**. Before that date, reactivation keeps the existing paid-through date and makes the next period due on that date. After expiry, reactivation is pending until a new payment is verified. Reactivation never creates a receipt or marks a future period paid. Users still contact an administrator for Zelle changes.

Stripe members can **Cancel renewal** or **Reactivate renewal** before a scheduled cancellation completes. The application updates `cancel_at_period_end` without changing the billing anchor or generating prorations. It shows the period end and next billing date. Portal sessions use an application-specific configuration with cancellation set to `at_period_end`; the application creates that configuration when needed. Ended Stripe subscriptions require a new checkout. Past-due balances must be handled separately.

These changes preserve existing billing-period lengths (currently calendar months); they do not migrate subscriptions to the draft 30-day schedule. External manual Stripe cancellations/refunds must be reconciled separately.

User dashboards show Zelle selections as **Pending payment confirmation**, without an active membership, until an administrator records the verified receipt. Pending selections cannot start another checkout. Users have no Zelle cancellation button, and the self-service cancellation endpoint rejects requests. Administrators retain membership management controls.

Admins can search all accounts by name, email, or phone in **Membership payments**, then select a user from the dropdown. For an active account without an ongoing membership, choose a paid plan and click **Assign Zelle membership**. Then click **Record Zelle payment**, enter the bank reference, verify receipt, and save. The receipt activates the membership and advances its next unpaid period. Assignment alone leaves payment pending. Existing Stripe subscriptions continue to use the invoice-specific Zelle receipt workflow below.

In **Membership payments**, search for the member. Zelle enrollments show the amount due and number of unpaid monthly periods. Use **Record Zelle payment** to confirm one full period at a time after verifying the bank receipt. Previously canceled Stripe subscriptions are reconciled when the member selects Zelle, so an old Stripe subscription ID does not block enrollment. Existing live Stripe subscriptions and open checkouts must still be closed before starting a separate Zelle membership.

Members with Stripe history have **View balances and Stripe payment history**. This reads current membership invoices from Stripe, including historical subscriptions, and displays outstanding amounts by currency and each invoice's payment status. A failed lookup shows an unknown balance rather than zero. Stripe history is labeled as Stripe/credits/external payments unless this application has a confirmed Zelle receipt; a paid invoice alone does not establish that a credit card was charged.

For an open USD invoice, an administrator can choose **Record Zelle for this invoice**, enter the bank reference, and confirm receipt of the full outstanding amount and the member's Zelle choice. The server checks invoice ownership and amount and uses [Stripe's paid-out-of-band API](https://docs.stripe.com/api/invoices/pay) to settle it without charging the card. This does **not** change future Stripe automatic billing. Do not record a bank receipt against an invoice already covered by a card payment; review any duplicate real-world payment separately.

Manual Stripe-invoice receipts are stored in `manualmembershippayments` with unique invoice and bank reference indexes, administrator ID, amount, and confirmation time. Deployments must allow these indexes to be created before enabling this workflow. A pending confirmation can be retried with its original reference and a stable Stripe idempotency key. If a retry remains unresolved, reconcile the invoice in Stripe before making any other adjustment. No live payments or emails are sent during automated tests.

Balances are outstanding charges/periods, not future subscription commitments or a refund/credit accounting ledger. Zelle amounts continue to use the existing calendar-month schedule; this change does not activate the draft 30-day terms.
