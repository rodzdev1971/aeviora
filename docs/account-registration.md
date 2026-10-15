# Account registration

New registrations use `server/models/users.js` and a separate MongoDB `users`
collection. Its `_id` is a random UUID. The old `patients` model/collection is
retained for existing data; registration, login, and account APIs no longer read
or write it. No automatic migration or deletion is performed. Existing patient
credentials therefore do not become user accounts automatically.

The registration endpoint accepts account/contact fields only. It rejects DOB,
medical history, medications, allergies, treatment/protocol selections, HIPAA
acknowledgments, and client-assigned IDs, roles, statuses, or consent timestamps.
Names, contact details, and addresses remain personal information; separating
them from medical fields is not a legal classification or compliance assessment.

## Data contract

| Fields | Behavior |
| --- | --- |
| `firstName`, `lastName`, `email`, `phone`, `zipCode` | Required; email normalized to lowercase and phone to international format |
| `addressLine1`, `city`, `state` | Optional unless enabled by server configuration |
| `addressLine2` | Optional |
| `country` | Two-letter code; defaults to `US`; US ZIP validated as five digits or ZIP+4 |
| `preferredLanguage` | Optional, `en` or `es` |
| `communicationPreference` | Optional, `email`, `sms`, or `both` |
| `timeZone` | Optional IANA time zone; form suggests browser time zone |
| `password` | Required, 12 characters minimum, 72 UTF-8 bytes maximum; stored only as bcrypt hash |
| `is18OrOlder` | Must be `true`; DOB is not collected |
| `termsAcceptance`, `privacyAcceptance` | Server records document URL, version, acceptance timestamp, and whether the document is a development draft |
| `smsConsent` | Separate grant/decline record and server timestamp; required for SMS/both communication preference |
| `marketingConsent` | Separate optional grant/decline record; never preselected |
| `_id`, `accountStatus`, `role` | Server controlled; UUID, pending status, and user role by default |

Each optional consent records `granted`, `recordedAt`, and `grantedAt` (null when
declined). Consent timestamps come from the server. Policy versions submitted
by the form must match the server's current versions. The API response contains
only the new user ID, status, and confirmation message.

## Development setup

1. Keep your MongoDB connection and JWT secret in `server/.env`.
2. Merge settings from `server/registration.env.example` as needed. Existing
   `.env` files are not changed by this implementation.
3. Run `npm run dev:full`. Vite proxies `/api` to `http://localhost:5000`.
4. Open `/register` and use synthetic account details.

Accounts default to `pending`. Set `DEV_ACTIVATE_ACCOUNTS=true` in a nonproduction
environment to create **new** development accounts as `active`. This does not
activate earlier accounts and is ignored in production. This flag does not bypass
email verification for new registrations. Pending, suspended, and deleted accounts
cannot log in or access authenticated APIs. Only active accounts can use cookie
authentication.

## Email verification

Registration sends a single-use verification link using the SMTP settings and
trusted `FRONTEND_ORIGIN` (HTTPS in production). The confirmation screen reports
that the link was sent only after SMTP acceptance. Delivery failures keep the
account and show instructions to request another link. Existing accounts without
the new verification requirement keep their current access; they are labeled
Existing account, not falsely marked Verified.

New accounts are Awaiting verification for 24 hours, then Not verified. This status
is computed from the persisted `emailVerificationExpiresAt` and `emailVerifiedAt`
on each read, not stored as a separate potentially stale flag. No cron job is
required: the server rejects tokens at the exact deadline even when it has been
idle. The account remains pending and is not deleted. Resending starts a new
24-hour window and invalidates the previous link.

The link opens `/verify-email`; the user presses **Verify my email** to activate
the account, then signs in normally. A GET or email link preview cannot activate
it. Tokens use 32 random bytes, are stored only as SHA-256 hashes, and are consumed
atomically. URL fragments keep tokens out of server URL logs. Do not log request
bodies or email contents. Resends have an atomic per-account one-minute cooldown
and a per-IP limit. As with password recovery, per-IP limits use instance-local
memory; use shared rate-limit storage for multiple production instances.

**Administration → Account overview → Verify manually** allows an authenticated
administrator to verify and activate a pending/active account after confirming
ownership. Suspended/deleted accounts cannot be activated this way. The account
records the admin ID, verification time and method; the audit log records
`ACCOUNT_MANUALLY_VERIFIED`. Manual verification invalidates outstanding links.

- `POST /api/auth/verify-email`: consumes `{ token }`.
- `POST /api/auth/resend-verification`: accepts `{ email }`; returns the same
  message for unknown, verified, ineligible, throttled, and delivery-failed accounts.
- `POST /api/admin/users/:id/verify`: admin-only manual verification.

Run `node --test server/tests/emailVerification.test.js server/tests/registration.test.js`
with synthetic data. Test real inbox delivery after configuring the deployed SMTP
provider; SMTP acceptance alone does not guarantee inbox delivery.

Set `ACCOUNT_REQUIRED_ADDRESS_FIELDS=addressLine1,city,state` when all three
fields are needed, or list only the needed fields. Address line 2 remains optional.

The default Privacy Policy route is an explicit development placeholder, and
default consent versions are development identifiers. Supply the actual approved
policy URLs/versions before production; production registration refuses draft
configuration. This change does not draft or approve legal policy documents.

For a separate frontend/API deployment, set `VITE_API_BASE_URL` for the frontend
and `FRONTEND_ORIGIN` for API CORS. The default production cookie is Secure,
HttpOnly, and SameSite=Strict, so use a same-site HTTPS deployment. The API needs
a Node/MongoDB host; a static GitHub Pages deployment cannot run it.

## API and validation

- `GET /api/auth/registration-config`: current policy metadata/address requirements.
- `POST /api/auth/register`: strict account registration validation and persistence.
- `POST /api/auth/login`, `POST /api/auth/logout`: cookie authentication.
- `GET /api/users/me`, `GET /api/users/me/summary`: the authenticated account.
- `PATCH /api/users/me`: limited address/language/time-zone edits. Contact changes,
  communication changes, and consent updates need separate verified workflows.
- `GET /api/users`: provider/admin account list, limited to 100 records.
- `POST /api/payments/checkout-session`: creates an authenticated Stripe subscription Checkout session.
- `POST /api/payments/billing-portal`: creates an authenticated Stripe Customer Portal session.
- `POST /api/payments/webhook`: receives signed Stripe subscription lifecycle events.
- `GET /api/admin/users?page=1&limit=25`: admin-only paginated account overview.
   It returns basic contact/account fields only and is audited. The `/admin`
   dashboard is available only to accounts with the server-managed `admin` role.

To grant admin access, first create and activate an account through the normal
operator-controlled process, then run `npm run grant-admin -- user@example.com`
from the repository root on a host configured with `server/.env`. The command
only promotes an existing active account; registration cannot assign roles.
Admin access applies only to endpoints explicitly protected for admins. Future
intake, records, or other data APIs must add server-side role checks and audit
logging before the dashboard can access those datasets. Intake and clinical
records are not currently persisted by this application.

`/api/patients` remains an alias to the account routes for compatibility, but
returns `user`/`users` instead of the old patient payloads. Registration is only
at `/api/auth/register`.

Email/mobile verification, MFA delivery, SMS/marketing delivery, service-area
lookup, address validation against a postal service, consent withdrawal/history,
and clinical intake persistence are not implemented by this change. ZIP collection
does not certify that a service is available. Existing intake/profile/records UI
outside registration remains separate work.

Stripe billing requires `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and
`STRIPE_WEBHOOK_SECRET` in the server environment. Configure the Stripe webhook
endpoint as `/api/payments/webhook` for checkout completion and subscription
updates. Stripe Checkout and the Customer Portal keep payment details out of
Aeviora; do not send card numbers or clinical information to these endpoints.

## Checks

- `npm run lint -- --max-warnings 0`
- `npm run build`
- `node --test server/tests/registration.test.js`

Tests use synthetic in-memory model adapters and a local HTTP server. They do
not read `.env` or connect to MongoDB. Database persistence/index creation and
real browser interaction need verification in the development environment.
