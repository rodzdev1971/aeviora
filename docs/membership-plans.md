# Membership plans

Percentage-discount benefits appear in the benefit dropdown with their discount
percentage. They show **Discount prices** and eligibility summaries rather than a
member dollar-price input. Their saved membership entries have `pricingType:
"discount"`, `price: null`, `standardPrice: null`, and a `discounts` array of rules.
Mixed priced benefits also retain their discount rules alongside the dollar price.

Active admins can open **Memberships** in the dashboard (`/admin/memberships`).
Create a plan or edit an existing plan, set its name and monthly USD price, and
choose a benefit from the dropdown and click **Add benefit**. Repeat for each
benefit you want to include. Only selected benefits appear in the editor and are
saved; use **Remove benefit** to exclude one. Check **Adjust price** to set a
benefit's price for that membership. Uncheck it to use the current standard
benefit price. Zero means the benefit has no additional charge.

The monthly membership fee is independent of the individual benefit prices.
Changing a plan does not change the benefit catalog or other plans. This setting
manages plan definitions; it does not charge customers or enroll accounts.

## Storage and catalog

Plans are stored in `aeviora_wellness.membershipPlans` using the server's existing
MongoDB connection. Each document has `name`, normalized unique `nameKey`, `price`,
`billingInterval: "month"`, `currency: "USD"`, timestamps, and a `benefits` array.
Each benefit entry stores `benefitId`, `name`, `standardPrice`, member `price`, and
`customPrice` (whether the price is adjusted for this plan).

The Benefits manager now writes to `membershipBenefits`. Both it and the earlier
`benefits` collection were empty when this change was made; no records were moved.
Existing `subscriptionPlans` documents are separate and unchanged.

Saving a membership includes only its selected benefits, in the order added.
New catalog benefits are available in the dropdown and are never added automatically.
Editing loads the plan's saved selections and adjusted prices. Remove any unwanted
benefits previously saved by the earlier automatic-inclusion behavior, then save.
Standard prices are refreshed from the catalog when saving; adjusted prices are
retained. Deleted catalog benefits are flagged for removal before saving. The
server rejects missing references. Plans can be saved with no selected benefits.

## Starter plans

`node server/scripts/seed-memberships.js` inserts Bronze ($20/month), Silver
($40/month), and Gold ($60/month) if their normalized names do not already exist.
It uses the configured server MongoDB connection and does not overwrite existing
plans, adjusted prices, or timestamps. Run it explicitly for a new environment;
application startup does not re-create deleted starter plans. New starter plans
have empty benefit arrays until an admin selects benefits.

## API and checks

All endpoints require an active admin's authenticated cookie:

- `GET /api/admin/memberships`: saved plans and the current benefit catalog.
- `POST /api/admin/memberships`: create a plan.
- `PUT /api/admin/memberships/:id`: update a plan.
- `DELETE /api/admin/memberships/:id`: delete a plan (the UI confirms first).

Create/update body: `{ name, price, benefits: [{ benefitId, price }] }`.
A benefit price of `null` uses the standard price. Omitted catalog benefits are
excluded. An empty array removes all benefits from the plan. Server-side validation rejects negative or
fractional-cent amounts, unknown fields, missing references, and duplicate entries.
Writes are recorded in the existing audit log.

Run `node --test server/tests/*.test.js`, `npm run lint`, and `npm run build`.
Tests use synthetic in-memory records without writing to the local MongoDB data.
# Member dashboard

The member dashboard reads plan options from `membershipPlans` through the authenticated `/api/payments/memberships` endpoint. Accounts without a current subscription display **Free membership**. Legacy subscriptions without a linked catalog plan display **Existing membership** rather than an invented tier.

Choosing a plan opens Stripe subscription checkout using the database price in USD per month. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_ORIGIN` must be configured. The old single `STRIPE_PRICE_ID` is not used for plan selection. Subscribe the Stripe webhook to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Plan ID and name are recorded through these signed events, not a browser success redirect. Refresh membership status after checkout if the webhook is still pending.

Existing subscribers use billing management; switching to another catalog plan is not performed directly by the plan cards. Catalog edits affect new checkout pricing, not existing Stripe subscriptions. Verify checkout, webhook delivery, cancellation, and billing portal settings in Stripe test mode before production use. No live charge was tested during implementation.

