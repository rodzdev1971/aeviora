# Vercel deployment

This repository runs as one Vercel project: Vite builds the frontend into `dist`,
and `api/index.js` exports Express as a Node function. `/api/*` routes to Express;
other application routes fall back to `index.html`. No `app.listen()` runs inside
the function. Local `npm run dev:full` still uses `server/server.js` and local MongoDB.

## Database

1. Create a hosted MongoDB deployment (for example, Atlas), a database user with
   read/write access to `aeviora_wellness`, and network access for your Vercel
   function's outbound connections. Prefer restricted egress/network access where
   available; do not assume your development PC's IP allows Vercel access.
2. Copy the Atlas driver connection string into **Vercel environment variables**
   as `MONGO_URI`. Include `/aeviora_wellness` before the query string, or set
   `MONGO_DB_NAME=aeviora_wellness`. `MONGODB_URI` is also supported if supplied by
   an integration. Do not use a localhost URI on Vercel.
3. Existing local records are not moved automatically. Import the intended
   collections with MongoDB Compass or your approved backup/restore process,
   preserving document IDs, indexes and collection validators. Use a separate
   database for preview deployments. No database content was migrated by this change.

The function shares its connection attempt and pool within each warm instance,
uses a maximum pool size of five, and retries after failed connections. Each scaled
instance has its own pool. MongoDB failures return a generic JSON 503 response.

## Vercel project settings

- Import this repository, with its root as the Vercel Root Directory.
- Use the **Vite** framework preset and Node.js **22.x**.
- Build command: `npm run build`; output directory: `dist`; install: `npm ci`.
- Choose a function region close to the MongoDB cluster in Vercel settings.
- Keep `VITE_API_BASE_URL` unset: browser requests use the same domain's `/api`.
- Set the variables below for Production and appropriate separate values for Preview,
  then redeploy. The app does not load `server/.env` inside the Vercel function.

| Variable | Value |
| --- | --- |
| `MONGO_URI` | Hosted MongoDB driver URI, with database name |
| `MONGO_DB_NAME` | Optional explicit database override |
| `JWT_ACCESS_SECRET` | Strong random signing secret |
| `COOKIE_SECRET` | Separate strong random cookie secret |
| `FRONTEND_ORIGIN` | Exact HTTPS deployment/custom-domain origin, no trailing slash |
| `ACCOUNT_TERMS_VERSION` | Approved Terms version |
| `ACCOUNT_TERMS_URL` | Approved Terms URL, usually `/termsofuse` |
| `ACCOUNT_PRIVACY_VERSION` | Approved Privacy version |
| `ACCOUNT_PRIVACY_URL` | Approved Privacy URL; existing `/account-privacy` is a draft until replaced |
| `ACCOUNT_REQUIRED_ADDRESS_FIELDS` | Optional comma-separated `addressLine1,city,state` |

See `server/vercel.env.example` for placeholders. Never prefix database credentials
or signing secrets with `VITE_`; Vite variables are public client build inputs.
New production registrations stay pending until activated through the operator
workflow. Setting approved policy identifiers does not turn draft policy text
into an approved policy.

For billing, also configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and
`STRIPE_WEBHOOK_SECRET`. Register the webhook at
`https://YOUR_DOMAIN/api/payments/webhook`. Use test-mode values in previews.
The function disables automatic body parsing so Express can validate raw signatures.

## Verification after deployment

### Safe connection diagnostics

After deploying the logging changes, request `/api/health` and open Vercel Runtime
Logs for that request. Search for `database_connection_failed`. The JSON log includes
one of these categories and a fixed troubleshooting hint:

- `MISSING_CONFIGURATION`: neither `MONGO_URI` nor `MONGODB_URI` is available.
- `INVALID_CONFIGURATION`: the driver rejected the URI or connection arguments.
- `AUTHENTICATION_FAILED`: database authentication was rejected.
- `DNS_FAILURE`: cluster hostname discovery failed.
- `NETWORK_TIMEOUT`: a network/connection attempt timed out.
- `NETWORK_FAILURE`: a connection was refused, reset, or otherwise unreachable.
- `SERVER_SELECTION_FAILED`: no suitable server was found; this alone does not
  prove an IP access-list issue.
- `CONNECTION_FAILED`: another connection failure.

Logs include the selected variable's name, configuration-presence booleans, and
elapsed milliseconds. They never contain environment values, credentials, hostnames,
raw driver messages, stacks, or request details. Concurrent requests sharing a
connection attempt emit one failure log. The public API still returns a generic
503. Share the category and fixed hint to diagnose a failure without sharing secrets.

### Smoke checks

1. Open `/api/health`: expect JSON `{"status":"ok"}`. A 503 indicates the database
   URI, network access, database credentials or availability needs attention.
2. Open `/api/auth/registration-config`: expect configured policy metadata.
3. Refresh `/login`, `/register`, and `/dashboard` directly: React routing should load.
4. Use a synthetic account to check registration, operator activation, cookie login,
   and admin fee/benefit/membership read and write flows.
5. Check a Stripe test webhook if billing is enabled.

Local tests do not replace a Vercel preview smoke test. This change configures the
repository; it does not create a Vercel project, supply secrets, migrate data or deploy.
The existing `npm run deploy` command still targets GitHub Pages; use Vercel's Git
deployment workflow instead. The current Express rate limiter is per-instance;
configure Vercel Firewall rules or a shared limiter for deployment-wide limits.

## Environment files

`server/.env` was already tracked by Git. Ignore rules prevent future untracked
environment files from being added, but do not remove an already tracked file.
Before pushing, untrack it while keeping your local copy:
`git rm --cached -- server/.env`, then commit the removal. If real secrets were
previously shared through Git, rotate those secrets. `.vercelignore` and function
exclusions prevent local environment files from being uploaded/bundled.

References: [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite),
[Node functions](https://vercel.com/docs/functions/runtimes/node-js),
[Mongoose connection reuse](https://mongoosejs.com/docs/lambda.html),
[Atlas and Vercel](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/).
