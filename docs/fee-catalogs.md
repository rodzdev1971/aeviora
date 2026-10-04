# Fee catalogs

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
