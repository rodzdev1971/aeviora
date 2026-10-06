import AccountPolicyLayout from "../components/AccountPolicyLayout";

export default function AccountPrivacy() {
  return (
    <AccountPolicyLayout title="Account Privacy Policy" version="account-privacy-2026-10-06-v1">
      <section>
        <h2 className="text-xl font-semibold">1. Scope</h2>
        <p>This policy describes information handled for Aeviora Wellness website accounts operated by Health GuideLife LLC. It covers account registration, authentication, profile management, and membership administration. It does not replace a healthcare provider's Notice of Privacy Practices or describe every practice of independent provider websites.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">2. Information we collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Account details you submit, including name, email, telephone, country, postal code, and additional address or preference fields where requested.</li>
          <li>Authentication and administration records, including a password hash, account status, role, and session information. Password hashes are used instead of storing your password as plain text.</li>
          <li>Consent records, including adult eligibility confirmation, accepted policy versions and timestamps, and optional communication or marketing choices.</li>
          <li>Membership and billing records where enabled, such as payment-provider customer and subscription identifiers and subscription status. Card information entered in hosted checkout is processed by the payment provider.</li>
          <li>Technical and security records, which may include IP address, browser information, request details, and account or administrative actions.</li>
        </ul>
        <p className="mt-3">Please use a provider's designated secure portal for medical records and health histories rather than account profile fields or ordinary email.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">3. How information is used</h2>
        <p>We use account information to register and authenticate users, maintain profiles and permissions, administer memberships and billing, respond to requests, record consent, prevent misuse, troubleshoot services, and meet applicable legal obligations. Optional promotional communications depend on your choices and applicable requirements.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">4. Service providers and disclosures</h2>
        <p>Hosting, database, and payment providers support the website. The application is configured to use Vercel for hosting, MongoDB Atlas for database storage, and Stripe for enabled billing features. These providers receive information needed for their functions. Authorized personnel can access information according to assigned responsibilities.</p>
        <p className="mt-3">Information may also be disclosed when required by law or reasonably necessary to investigate fraud, protect account security, or protect legal rights. Following a link to an independent provider takes you to a service governed by its own privacy practices.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">5. Cookies and sessions</h2>
        <p>The website uses an authentication cookie to maintain your signed-in session. Blocking necessary cookies may prevent login or protected account features from working. Signing out clears the website's authentication cookie. This account notice does not authorize optional advertising or tracking technologies.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">6. Retention and security</h2>
        <p>Account information is retained for account operation and applicable security, billing, dispute, and legal needs. Some records, including consent and transaction records, may need to remain after account closure. Contact us about retention or deletion of your information.</p>
        <p className="mt-3">The application uses safeguards including password hashing and access controls. No internet service or storage method can guarantee absolute security. Protect your credentials and report suspected unauthorized access promptly.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">7. Your choices and requests</h2>
        <p>You can review available profile settings and contact us to request access, correction, account closure, deletion, or changes to optional communication choices. Depending on applicable law, additional rights may apply. We may need to verify your identity before acting on a request, and legal obligations may limit deletion. Withdrawing optional marketing consent does not withdraw necessary account or security communications.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">8. Age requirements and policy changes</h2>
        <p>Account registration is intended for adults aged 18 and older. Contact us if you believe a minor has registered. Updates to this policy will display a version and effective date, with notice or renewed consent where required. Your registration record identifies the version accepted.</p>
      </section>
    </AccountPolicyLayout>
  );
}
