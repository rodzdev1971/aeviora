# English and Spanish

The application has an English / Español selector above every routed page, including account forms and the authenticated administrator dashboard. English is the initial default. The choice is saved under `aeviora.language` in browser local storage and synchronized between tabs on the same origin. If storage is blocked, switching still works for the current page session. Switching languages updates React text without remounting routes, discarding drafts, or submitting forms. The document's `lang` attribute follows the selection.

## Translation files

- `src/i18n/es.json` contains Spanish translations keyed by the original English text.
- `src/i18n/language.js` handles language state, whitespace, fallback, and numbered placeholders (`{{0}}`).
- Components call `useLanguage()` to subscribe and `t()` for text, accessible labels, placeholders, dialogs, and known API messages.
- `getLocale()` supplies `en-US` or `es-US` for date and currency formatting. USD remains the currency; localization never converts amounts.
- `src/i18n/discountText.js` formats eligibility rules in the selected language without altering the shared billing rules.

Coverage includes the active public, account, membership, payment, directory, fee catalog, benefits, and email management screens, plus the published account policy routes. Legacy components that are not reachable from `App.jsx` are not part of the active application and have not been wired into routing.

Use `t("English copy")` at the display boundary and add the corresponding entry to `es.json`. Preserve placeholders exactly. Keep database identifiers, option values, schema keys, URLs, policy version identifiers, and payment calculations language-independent. For known server messages, translate at display time so an error already visible can change language. Unknown messages fall back to their original text.

## Content and external services

Administrator-authored membership names, benefit descriptions, fee names, provider names, personal data, saved email subjects/bodies, and user-entered content remain as written. Enter Spanish text in those records/templates when needed; the selector does not run those records through an external translation service. Automatic emails continue using the configured template. The UI language is a browser preference, separate from the saved account communication-language preference. Registration initializes its language preference field from the selected UI language; the user may change it.

API requests include `Accept-Language`. New Stripe Checkout and billing portal sessions use the selected English or Spanish locale. Existing Stripe sessions retain their original settings. Other external provider portals and native browser validation messages follow their own language settings.

The Spanish policy pages translate existing text and retain the existing policy version and draft status; this change does not introduce new contractual terms.

## Verification

Run `node --test server/tests/localization.test.js server/tests/localizationRender.test.js`, `npm.cmd run lint`, and `npm.cmd run build`.

The tests cover translation placeholders, persistence and blocked storage, discount rule formatting, and server-rendered English/Spanish routes with unchanged links and field identifiers. They use synthetic data and do not send email or charge cards. Browser checks should include 375px and desktop layouts, an in-progress registration form while switching languages, reload persistence, and a Stripe test checkout return. No new environment variables or database migration are required.
