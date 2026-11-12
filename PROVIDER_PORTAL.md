# Provider portal

Providers sign in at `/provider/login` with their own account email and password.
Successful provider login (including through the ordinary login page) opens
`/provider`. Public registration never grants provider permissions.

## Connect a provider account

1. The provider registers at `/register` and verifies their email to activate
   their account. Existing active accounts can also be used.
2. An administrator opens **Admin → Providers & appointments**, creates or
   selects the provider profile, and sets their time zone and consultation states.
3. Under **Provider login access**, the administrator enters the provider's
   registered email and selects **Link account and grant provider access**.
   Only an active, verified non-admin account can be linked. Each login account
   can belong to one provider profile, and an already linked profile cannot be
   reassigned through this action. The operation grants the `provider` role,
   increments the account session version, and records an audit event.
4. The provider signs in again at `/provider/login`.

No shared or default passwords are created. Password recovery uses the existing
account recovery flow. Linking does not read or migrate legacy patient records.

## Provider workspace

- Providers can publish one-time or weekly availability in their profile's time
  zone, block/reopen unbooked times, and preview removal by day or selected hours.
- Booked appointments and cancellation history are retained. Providers can cancel
  their own future appointments; the patient sees that the office cancelled.
- The schedule shows patient names, email addresses, confirmed consultation
  states, visit times, locations, and telehealth links for that provider only.
- **View patient profile** and the directory show account contact details and
  preferences only for patients with a booked appointment assigned to that
  provider. This includes past appointments still recorded as booked. Cancelled
  appointments alone do not grant profile access. Passwords, authentication
  tokens, consents, and clinical records are excluded from provider profile APIs.
- Admins retain their existing access to all providers and accounts.

## Consultation states

Providers and administrators may select the 50 US states and DC. These are
self-declared authorization settings, not automatic verification of a license.
The practice remains responsible for checking provider authorization.

Patients must explicitly choose the state where the visit will take place before
selecting a provider. The server rechecks that state when booking, for both
telehealth and in-person slots. The state is stored on the appointment. An empty
state list disables new bookings; existing provider profiles need states configured
before accepting further bookings. Changes to states do not cancel existing
appointments; the provider must review existing bookings when changing coverage.

Schedule edits, state changes, availability removal, and bookings share the
existing revision-based concurrency protection. The provider model adds an
optional `userId` link with a unique partial index; ensure this model's indexes
are created using the environment's normal database index deployment process.

## Verification

Use synthetic storage; no live database or `.env` files are required:

```sh
node --test server/tests/providerPortal.test.js server/tests/appointments.test.js server/tests/registration.test.js server/tests/adminUserProfile.test.js
npm run lint
npm run build
```
