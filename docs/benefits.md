# Admin benefits

Sign in with an active admin account and open **Benefits** in the dashboard
navigation (`/admin/benefits`), or **Manage benefits** from the admin account page.
Enter a name, description, and selling price. Search the catalog by service name,
provider, or billing code, choose a provider/amount, and click **Add service**.
Repeat for each included service, then click **Create benefit**.

Saved benefits support **Edit / add services**, removing services, changing the
name/description/price, and deletion with a confirmation. At least one service is
required, with a maximum of 200. Each added row counts once toward the cost;
adding the same service again counts its cost again. Amounts use USD and up to
two decimal places; zero-cost services are allowed.

## MongoDB

The server uses its existing MongoDB connection (local default:
`mongodb://127.0.0.1:27017/aeviora_wellness`). Documents are stored in `benefits`,
separate from `membershipBenefits`. Fee catalogs are read from `laboratoryFees`
(`labPrices[].lab`, `labPrices[].amount`) and `diagnosticFees`
(`diagnosticPrices[].diagnostic_center`, `diagnosticPrices[].amount`).
Service display names use the fee document's `name`, falling back to
`description`, then `order`. Invalid catalog amounts or missing provider names
are excluded. An empty diagnostic catalog simply provides no diagnostic options.

Each benefit has `name`, `description`, `cost`, `price`, `services`, and timestamps.
Each service stores `name`, `cost`, `amount`, `source`, `feeId`, and either `lab`
or `diagnostic_center`. Service costs and names come from the server-side catalog;
the benefit cost sums integer cents to avoid floating-point addition errors.
The selling price is independently set by the admin.

Saved costs are snapshots. Catalog changes do not silently modify saved benefits.
On saving an edit, all selected fees are checked against current catalog values.
If a provider, fee, or amount changed, refresh the catalog, remove the stale row,
and add a current service before saving.

## API and verification

All endpoints below require an active admin's authenticated cookie:

- `GET /api/admin/benefits`: list benefits.
- `GET /api/admin/benefits/fee-options`: load catalog provider/amount options.
- `POST /api/admin/benefits`: create a benefit.
- `PUT /api/admin/benefits/:id`: update a benefit and its service list.
- `DELETE /api/admin/benefits/:id`: delete a benefit.

Create/update payloads contain `name`, `description`, numeric `price`, and
`services: [{ source, feeId, provider, amount }]`. Client-supplied totals and
service names are rejected. Writes are recorded in the existing audit log.

Run `node --test server/tests/benefits.test.js server/tests/registration.test.js`,
`npm run lint`, and `npm run build`. Tests use synthetic in-memory storage.
