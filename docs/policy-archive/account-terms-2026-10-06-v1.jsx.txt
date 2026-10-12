import { Link } from "react-router-dom";
import AccountPolicyLayout from "../components/AccountPolicyLayout";

export default function AccountTerms() {
  return (
    <AccountPolicyLayout title="Account Terms of Use" version="account-terms-2026-10-06-v1">
      <section>
        <h2 className="text-xl font-semibold">1. Your Aeviora account</h2>
        <p>These terms describe use of the Aeviora Wellness account website operated by Health GuideLife LLC. Accounts support registration, profile management, membership information, and access to available services. You must be at least 18 years old to register and provide accurate information. Registration does not guarantee activation; new accounts may require approval.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">2. Account security and acceptable use</h2>
        <p>Keep your password private, use your own account, and contact us if you suspect unauthorized access. Keep contact information current. Do not impersonate others, access another person's information without authorization, bypass security controls, upload malicious content, or interfere with the website. Access assigned to staff and providers is limited to their authorized responsibilities.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">3. Health information and outside providers</h2>
        <p>Creating an account does not establish a clinician-patient relationship. Website content is general information and is not a diagnosis or individualized treatment advice. Clinical services require arrangements with the treating provider. Use the provider's designated secure portal for medical histories and records. Independent providers have their own terms, privacy notices, eligibility requirements, and clinical decisions.</p>
        <p className="mt-3">This website is not monitored for emergencies. For an emergency in the United States, call 911 or seek immediate emergency care.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">4. Memberships, prices, and benefits</h2>
        <p>Review the selected plan, price, billing frequency, included benefits, provider restrictions, and any separate charges before purchasing. A percentage discount is a reduction on eligible services, not a promise that the service is free. Exclusions and provider availability may apply. Clinical services remain subject to provider evaluation; membership does not guarantee treatment or outcomes.</p>
        <p className="mt-3">When checkout is available, the payment provider processes your payment. Review the purchase terms presented at checkout, including renewal, cancellation, and refund information. These account terms do not establish a separate refund policy or authorize charges that were not disclosed and accepted.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">5. Privacy and communications</h2>
        <p>Our <Link to="/account-privacy" className="text-aeviora-primary underline">Account Privacy Policy</Link> describes account information practices. Account and security communications may be necessary to operate your account. Optional SMS or marketing choices are separate from acceptance of these terms. You may contact us to update your communication preferences.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">6. Availability and account restrictions</h2>
        <p>Access may be interrupted for maintenance, technical problems, or security protection. We may restrict an account to investigate suspected misuse or comply with legal obligations. Contact us about an access problem or to request account closure. Closing an account does not by itself cancel a paid subscription; use the available billing controls or contact us for assistance.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">7. Changes and questions</h2>
        <p>Updated terms will identify their version and effective date. Material changes will be communicated as required, with renewed acceptance where needed. Registration records the policy version accepted at that time. Nothing in these terms limits rights that cannot be limited under applicable law. Contact us with questions before accepting or purchasing.</p>
      </section>
    </AccountPolicyLayout>
  );
}
