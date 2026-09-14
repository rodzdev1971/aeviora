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
activate earlier accounts and is ignored in production. Pending, suspended, and
deleted accounts cannot log in or access authenticated APIs. Only active accounts
can use cookie authentication. There is no automated activation or verification
sender yet.

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
- `GET /api/users`: admin-only account list, limited to 100 records.

`/api/patients` remains an alias to the account routes for compatibility, but
returns `user`/`users` instead of the old patient payloads. Registration is only
at `/api/auth/register`.

Email/mobile verification, MFA delivery, SMS/marketing delivery, service-area
lookup, address validation against a postal service, consent withdrawal/history,
and clinical intake persistence are not implemented by this change. ZIP collection
does not certify that a service is available. Existing intake/profile/records UI
outside registration remains separate work.

## Checks

- `npm run lint -- --max-warnings 0`
- `npm run build`
- `node --test server/tests/registration.test.js`

Tests use synthetic in-memory model adapters and a local HTTP server. They do
not read `.env` or connect to MongoDB. Database persistence/index creation and
real browser interaction need verification in the development environment.
