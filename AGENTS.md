# Repository guidance

## Project and commands

Aeviora Wellness is a JavaScript/JSX React 19 frontend built with Vite 8,
React Router 7, Tailwind CSS 4, Lucide icons, React Hook Form, and Zod 4.
Use npm and preserve `package-lock.json` when changing dependencies.

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start the Vite development server.
- `npm run build`: build production assets into `dist/`.
- `npm run lint`: run the repository ESLint configuration.
- `npm run preview`: serve an existing production build locally.
- `npm run deploy`: build and publish `dist/` with gh-pages; run only when deployment is requested.

On PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
Account registration tests use Node's built-in runner:
`node --test server/tests/registration.test.js` (synthetic storage; no MongoDB).

## Active code paths

- `src/main.jsx` mounts the app with StrictMode and BrowserRouter and imports `src/index.css`.
- `src/App.jsx` defines public home, register, and login routes. Dashboard,
  intake, records, and profile routes use `components/protectedroute.jsx`
  and `components/dashboardlayout.jsx` with nested outlets.
- `src/pages/` contains route-level views; `src/components/` contains shared UI.
- `src/pages/Intake.jsx` uses `src/components/IntakeForm_copy.jsx` despite its
  filename. This form uses `src/util/IntakeSchema.jsx` and
  `src/components/FormComponents.jsx`. Keep field names, step validation,
  defaults, and the schema consistent when changing intake behavior.
- `src/util/constants.jsx` holds shared company contact details and wellness
  protocols. Protocol icons are JSX elements, so this file requires JSX support.
- `src/index.css` imports Tailwind and explicitly loads `tailwind.config.js`.
  Reuse its `aeviora` colors, typography, and shared input, button, and card classes.
- `src/assets/` contains bundled assets; `public/` contains static public files.

## Editing conventions

Use ES modules and functional React components. Match the surrounding file's
formatting; existing quote and filename conventions vary. Match import casing
exactly so builds also work on case-sensitive systems.

Trace imports before editing similarly named files. The repository includes
alternate dashboard layouts, intake forms, and CSS/config copies; filenames
alone do not establish which version is active. Avoid unrelated cleanup,
renaming, or reformatting, and preserve existing user changes.

Keep company information and protocol content centralized in `constants.jsx`
where applicable. Preserve accessible labels, validation feedback, and responsive
layouts when changing UI.

## Runtime boundaries

Registration posts to `/api/auth/register`. Express starts in `server/server.js`,
with testable middleware in `server/app.js`. New account data belongs in
`server/models/users.js`, separate from legacy `patients` records. Shared strict
validation lives in `shared/registration.js`. Do not add medical data to accounts.
Login and the active route guard use backend cookie authentication. New accounts
default to pending; only active accounts can log in. See
`docs/account-registration.md` for development activation, consent policies,
address requirements, and boundaries. Use synthetic data for verification.
Do not read or print `.env` secrets or add personal data/credentials to logs.

Vite's base and BrowserRouter's basename are both `/`, and `vercel.json`
provides an SPA rewrite. GitHub Pages metadata and a deploy script also exist.
Check the intended host before changing base paths or deployment settings.

## Verification

For application changes, run lint and build and report pre-existing failures
separately from regressions. For UI or form changes, also check the affected
routes, responsive layout, and relevant validation/submission behavior when the
app can run. Do not introduce a test framework just for a small edit.

At initialization on 2026-09-14, the working tree already contained edits to
`src/App.jsx`, `src/components/footer.jsx`, and `src/pages/Register.jsx`.
Baseline lint reported 44 errors and 2 warnings. The baseline build failed on the missing `./pages/TermsOfUse` import in
`src/App.jsx`. Registration also imports `../components/passwordInput`, which
was absent from the inspected file inventory. Recheck these observations before
treating them as current blockers; do not fix unrelated work automatically.
