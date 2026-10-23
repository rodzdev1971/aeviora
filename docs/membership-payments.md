# Membership payments

## Member referrals and affiliate coupons

### Business affiliates (B2B)

**Admin → Affiliates & referral coupons → Business affiliates (B2B)** registers
a business with its name and contact email, plus optional contact name, phone
and HTTPS website. It creates a unique `B2B-…` code and a customer registration
link. A business does not need a personal paid membership or a patient login;
only administrators manage business records. Records live in the separate
`businessAffiliates` collection, so the existing unique member-user index does
not need to be replaced. Business name/contact-email pairs deduplicate retries.

Business codes inherit the saved affiliate defaults (initially a 10% first-payment
customer discount and 20% recurring business commission). Select **Edit /
invitation** to change contact details, code, discount, commission or cadence,
or disable the business. Business enabled status replaces the personal paid-
membership eligibility check. The new-customer, first-payment discount,
self-referral, replay, refund and payout protections still apply. Using the
business's contact email to redeem its own offer is rejected. `B2B-` codes are
reserved for businesses; member-code edits cannot claim that prefix.

The selected business has a referral-link field, an **Invitation for the business**
with its terms and customer-ready message, and the customer-facing SMS/email
share card. **Email invitation to business** opens an addressed draft in the
admin's email app; it does not send automatically. Copy the business invitation
for the contact, or the separate customer message for end users. The business
can forward/copy its link and customer message without access to the admin portal.
No authentication credentials, patient details or private business contact
information are included in the public offer endpoint/customer share message.

**View rewards below** filters the existing reward ledger by the business's
affiliate ID. Paid Stripe invoices and confirmed Zelle receipts earn business
rewards; admins record payouts and reversals through the existing ledger.
Disabling a business prevents new uses and rewards. Earlier ledger history is
preserved, and an already-open Stripe session may remain usable until it expires.

Admin-only endpoints: `GET/POST /api/referrals/admin/businesses` and
`PATCH /api/referrals/admin/businesses/:id`. Public registration and checkout use
the same code/offer routes as member referrals. Business registrations/edits use
the affiliate audit actions without recording contact information in audit metadata.
Synthetic checks: `node --test server/tests/businessAffiliates.test.js`.

### Member affiliate defaults and payments

The portal includes **Referral rewards** at `/referrals` and **Affiliates &
referral coupons** at `/admin/referrals`. A current paid patient/user member can
create one unique affiliate ID and coupon code; admins can also create/find a
code by member email. Free, unpaid, expired and suspended accounts cannot start
an eligible referral offer. Earlier reward balances remain visible when a
membership ends. Codes are random identifiers and do not contain personal data.

New affiliate coupons default to enabled, with **10% off the customer's first
membership payment**. Open the admin page's **Defaults for new affiliate codes**
to manage these settings. The default affiliate commission is 20% of the membership amount
actually collected after discount, excluding tax: $2 for each $10 collected.
For example, a $100 membership with a 10% referral discount costs $90 initially
and earns an $18 commission. The customer then pays $100 on each renewal and the
affiliate earns $20 on each qualifying paid renewal while eligible. Recurring
commission is the default; admins can select first-payment-only instead.
Defaults affect new codes only;
existing codes have their own editable discount, commission, cadence and enabled
state. Changing a code invalidates links using its old spelling.

The member's share link opens `/register?ref=CODE`.
The **Referral rewards** page also provides a ready-to-share English/Spanish
message with the company introduction, the affiliate's current discount/code,
first-payment terms, contact details, and referral link. **Copy message** copies
the full text. **Share by SMS** opens the device share menu when available;
otherwise it copies the message and opens the SMS app for pasting. **Share by
email** opens an email draft with its subject and body filled. The member chooses
the recipient and sends from their own app; no SMS/email is sent by the server.
Messages are only offered while the affiliate and coupon are eligible.

Registration validates and
saves the code; a new paid member may also enter it at checkout. A referral code
is optional and independent of marketing/SMS consent. Checkout shows the first
payment discount and the normal 30-day renewal price before continuing. The
server checks the code, self-referral restrictions, owner eligibility and prior
paid membership history, and verifies the displayed total again. One offer per
new paid member is reserved on first checkout; its financial terms are retained
across retries. Disabling the affiliate or losing eligible membership prevents
new uses; a reserved, already-open Stripe checkout can remain usable until its
30-minute expiration. Changing settings does not rewrite a completed payment.

Stripe uses a server-created `duration=once` coupon and keeps the recurring
catalog price unchanged. Zelle stores a first-payment discount separately;
confirmed receipts, balances and reminders use the reduced first amount and
then the full renewal price. Rewards require signed paid-invoice events or an
admin-confirmed bank receipt, not a browser redirect or an unpaid signup.
Invoice/receipt IDs deduplicate rewards, including webhook and confirmation
retries. Snapshot commission cadence is used for already-reserved referrals;
the affiliate must still be enabled and eligible when a qualifying payment is
processed. Upgrades/proration invoices do not create referral rewards.

Add `charge.refunded` and `charge.dispute.created` to the existing Stripe webhook
at `/api/payments/webhook`, along with `invoice.paid`, `invoice.payment_failed`,
`checkout.session.completed`, `customer.subscription.updated` and
`customer.subscription.deleted`. Refund reconciliation reads current provider
state, handles refund-before-invoice event delivery and proportionally reduces
rewards. Disputed charges conservatively reverse the reward. Automatic reversal
is monotonic: a won dispute requires a separate business review rather than
automatically recreating a previously reversed reward. Zelle reversals are
recorded manually by an admin with a reason.

The reward ledger is in integer USD cents. Admins can record a payout reference
only for an unchanged, unpaid reward, or reverse a reward with a reason. **These
actions record accounting entries; the website does not transfer money or apply
the bonus as membership credit.** A payout should be recorded after it has been
sent externally. A later refund preserves the payout and can leave a negative
affiliate balance requiring settlement with the member. Affiliate owners see
their own amounts and membership names, without referred users' names/emails.
Admin changes, payouts and manual reversals are audited. The new collections
are `referralaffiliates`, `referralsettings`, `referralredemptions`, and
`referralrewards`; standard Mongoose indexes and the unique payment `_id` protect
identity and replay safety. No environment variables or new dependencies are
needed beyond the existing Stripe setup. Enable and exercise this in Stripe
test mode before using it for live checkout; no live payment was made here.

Synthetic verification:
`node --test server/tests/referrals.test.js server/tests/referralCheckout.test.js`.

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

### Login session when returning from Stripe

Checkout success/cancellation and billing portal returns preserve the initiating browser Origin when it is trusted. When FRONTEND_ORIGIN is either https://aeviorawellness.com or https://www.aeviorawellness.com, both exact HTTPS origins are trusted; other origins fall back to FRONTEND_ORIGIN. Cookies remain host-only. Production login cookies use Secure, HttpOnly, and SameSite=Lax to support navigation back from Stripe.

After deploying this change, sign out and sign in once to replace an existing Strict cookie, then start a new checkout. Existing Stripe sessions retain their original return URLs. Keep the Vercel canonical-domain redirect, FRONTEND_ORIGIN, and the hostname used to sign in consistent. For the same-origin Vercel deployment, leave VITE_API_BASE_URL unset. No credentials should be added to Stripe return URLs.

The existing login token and cookie expire 15 minutes after login. Checkout does not extend that session: an expired session requires signing in again, and the payment remains recorded independently through Stripe webhooks. Verify a fresh login and a Stripe test checkout return on the canonical domain before using live payments.
