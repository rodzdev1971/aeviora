# Fee catalogs

## Percentage discounts

In **Service fees**, choose **Percentage discount** for the service fee type.
Enter the percentage (greater than 0 and up to 100), without a retail price or
provider amounts. For laboratory and diagnostic services independently choose:

- **Only selected services**: check each eligible service; an empty selection
  means this category receives no discount.
- **All except selected exclusions**: check only services that must not receive
  the discount. An empty exclusion list includes every service in that category.
  Future services are included automatically unless excluded.

Search within either list to find services. Rules refer to fee document IDs and
cover all providers for that fee. At least one category must have selected services
or use all-except. Existing fixed-price service fees retain provider-price rows.

Discount fees store `pricingType: "discount"` and `discount: { percent,
laboratoryFees: { mode, feeIds }, diagnosticFees: { mode, feeIds } }`.
They have no `retailPrice` or `servicePrices`. Switching types removes the old
type's fields. The API verifies selected/excluded IDs against the correct catalog.

Select the discount in the Benefits service picker. A benefit containing only
discounts needs no selling price and displays **Discount prices** and percentages.
Memberships preserve the percentage and eligibility snapshot instead of assigning
a dollar member price. Mixed benefits can contain both priced services and
discounts; their provider costs are summed without subtracting discount percentages.

These are discount entitlements, not an implemented checkout or automatic billing
calculation. They do not choose a retail/provider price base or combine overlapping
discounts. Saved benefits/plans retain snapshots: refresh/reselect a changed
discount in the benefit and resave the membership to publish updated rules there.

For another database, run `node server/scripts/configure-service-fees.js` to update
the `serviceFees` validator to accept both record types. This was applied to local
`aeviora_wellness` without changing fee documents.

## Fixed prices

Active admins can open **Fee catalogs** in the dashboard (`/admin/fees`). Choose
Laboratory, Diagnostic, or Service fees, enter the name, optional billing code,
description, and retail price, then add one provider-price row per provider.
Use **Add provider price** as many times as needed (up to 200 rows), then save.
Search existing entries and choose **Edit / add provider prices** to change
amounts or add/remove providers. At least one provider must remain.

All amounts are USD, nonnegative, and limited to two decimal places. A provider
name must be unique within a fee (case-insensitive). Zero-cost prices are valid.
Retail price is independent of provider costs.

The MongoDB collections in the server's configured database use these fields:

| Collection | Billing code | Provider array |
| --- | --- | --- |
| `laboratoryFees` | `billCode` | `labPrices: [{ lab, amount }]` |
| `diagnosticFees` | `billCode` | `diagnosticPrices: [{ diagnostic_center, amount }]` |
| `serviceFees` | `billcode` | `servicePrices: [{ provider, amount }]` |

All new records include `name`, `description`, `retailPrice`, and timestamps.
The plural `servicePrices` is canonical; there is no separate `servicePrice` field.
Existing laboratory/diagnostic records keep their extra fields such as `order`.
For older fees without a name, the editor initially uses description or order.

All three catalogs supply provider-specific options to the Benefits manager.
Refresh the Benefits fee catalog after saving fees. Previously saved benefits
retain their price snapshots; remove/reselect a changed provider price before
saving an edited benefit.

Admin-only endpoints: `GET` and `POST /api/admin/fees/:source`, and
`PUT /api/admin/fees/:source/:id`. Only the three named collections are allowed.
POST/PUT bodies use the exact fields above. Arrays are saved in full, including
row removals. Server-side validation checks every provider and amount. Changes
are audit logged. No real catalog entries are added by tests.

Verification: `node --test server/tests/*.test.js`, `npm run lint`, `npm run build`.
