# Account policy drafts

The account pages are public routes and display draft status. They are not yet approved policies. Existing general website terms at `/termsofuse` remain separate.

| Policy | Proposed version | URL after deployment |
| --- | --- | --- |
| Account Terms | `account-terms-2026-10-06-v1` | https://www.aeviorawellness.com/account-terms |
| Account Privacy | `account-privacy-2026-10-06-v1` | https://www.aeviorawellness.com/account-privacy |

## Review and activate

1. Review `src/pages/AccountTerms.jsx` and `src/pages/AccountPrivacy.jsx` with the business owner and legal counsel. Verify the legal entity, contact details, vendors, access practices, retention periods, applicable privacy rights, tracking tools, and any sale or sharing practices. Confirm billing renewal, cancellation, and refund terms are provided before purchases. Add any required jurisdiction-specific disclosures.
2. Approve the final text and effective date. Update `src/components/AccountPolicyLayout.jsx` to replace the draft notice and prepared date with the approved effective date. If revising these proposed versions, change the visible identifiers and configuration together. Archive each approved version before replacing its text so recorded acceptances remain traceable.
3. Deploy the pages and verify that both public URLs load without signing in.
4. Only after approval, set these server-side variables in the relevant Vercel environment, then redeploy:

```dotenv
ACCOUNT_TERMS_VERSION=account-terms-2026-10-06-v1
ACCOUNT_TERMS_URL=https://www.aeviorawellness.com/account-terms
ACCOUNT_PRIVACY_VERSION=account-privacy-2026-10-06-v1
ACCOUNT_PRIVACY_URL=https://www.aeviorawellness.com/account-privacy
```

Do not use a `VITE_` prefix. The version is an identifier; the URL is the public page address. These examples assume approval of those exact versions. No `.env` secrets or production settings were changed by adding the pages. The server checks configuration presence, not whether legal review actually occurred.

5. Check `/api/auth/registration-config` and confirm that registration displays the correct policy links and versions. Production registration still needs all other required account and database settings.

## Drafting references

Privacy promises must match actual business practices: [FTC consumer privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/consumer-privacy). Review retention and protection practices using the [FTC business information guide](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business-0).

An account privacy policy is not a substitute for any required healthcare Notice of Privacy Practices. Assess that obligation separately using [HHS guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-for-protected-health-information/index.html).
