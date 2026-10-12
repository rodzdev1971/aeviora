import { Link } from "react-router-dom";
import AccountPolicyLayout from "../components/AccountPolicyLayout";

export default function AccountTerms() {
  return (
    <AccountPolicyLayout title="Account Terms of Use" version="account-terms-2026-10-11-v2" preparedDate="October 11, 2026">
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
        <p>Creating an Aeviora account is free and does not enroll you in a paid subscription. Available paid plans may include Bronze, Silver, and Gold. Review the current plan price, benefits, participating providers, and exclusions shown before purchasing. Benefits and prices vary by plan; a service is included at no additional charge only when expressly described as free or included.</p>
        <p className="mt-3">Membership benefits may include discounted prices on eligible laboratory, diagnostic, wellness, and preventive care services. A percentage discount applies only to the eligible services and providers specified for that benefit. Separate service charges may apply in addition to the membership fee. Clinical services remain subject to provider evaluation and availability; membership does not guarantee treatment or outcomes.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">5. Payment and 30-day membership periods</h2>
        <p>Each paid membership period lasts 30 consecutive days from the purchase date recorded for that period. A renewal purchases the next 30-day period. Your payment confirmation should identify the start and end dates. A 30-day period is not necessarily the same as a calendar month.</p>
        <p className="mt-3">Credit card payments are processed through Stripe. Recurring charges require your authorization at checkout and continue according to the disclosed renewal schedule until you cancel. Zelle payments are sent manually using the recipient details shown in the payment instructions. An administrator verifies receipt before activating or renewing a Zelle membership. Selecting Zelle or requesting enrollment does not itself confirm payment.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">6. Cancellation and continued access</h2>
        <p className="mt-3 rounded-lg border border-aeviora-border bg-aeviora-ivory p-4 font-semibold">If you cancel your membership or authorization for future recurring payments, your paid membership benefits remain available through the end of the current 30-day period, measured from the date that period was purchased. Cancellation does not immediately end benefits already paid for and does not start a new 30-day period.</p>
        <p className="mt-3">For example, canceling 10 days after purchasing a 30-day period leaves 20 days of access to the benefits of that paid plan. The same rule applies to verified Zelle payments and credit card subscriptions.</p>
        <p className="mt-3">Use the membership billing controls to cancel a Stripe subscription, or the Cancel Zelle membership option for a Zelle enrollment. You may also contact us using the details below for cancellation assistance. Once cancellation is confirmed, no further membership renewal charges should be made. At the end of the paid period, paid-plan benefits end and your account remains on Free membership unless you purchase another plan.</p>
        <p className="mt-3">This continued-access policy concerns cancellation of future renewal. A declined, reversed, refunded, or disputed payment is a separate payment issue and does not by itself establish a paid 30-day period. Contact us to resolve those issues. Cancellation alone does not request a refund; refund requests are reviewed under the applicable purchase terms and law. Nothing here limits mandatory refund or consumer rights.</p>
        <p className="mt-3">Continued membership access preserves the benefits and eligibility of your selected plan; it does not make separately charged services free or override a provider's clinical requirements.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">7. Privacy and communications</h2>
        <p>Our <Link to="/account-privacy" className="text-aeviora-primary underline">Account Privacy Policy</Link> describes account information practices. Account and security communications may be necessary to operate your account. Optional SMS or marketing choices are separate from acceptance of these terms. You may contact us to update your communication preferences.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">8. Availability and account restrictions</h2>
        <p>Access may be interrupted for maintenance, technical problems, or security protection. We may restrict an account to investigate suspected misuse or comply with legal obligations. Contact us about an access problem or to request account closure. Closing an account does not by itself cancel a paid subscription; use the available billing controls or contact us for assistance.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">9. Changes and questions</h2>
        <p>Updated terms will identify their version and effective date. Material changes will be communicated as required, with renewed acceptance where needed. Registration records the policy version accepted at that time. Nothing in these terms limits rights that cannot be limited under applicable law. Contact us with questions before accepting or purchasing.</p>
      </section>
    </AccountPolicyLayout>
  );
}
