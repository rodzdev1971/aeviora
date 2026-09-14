import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartPulse,
  Lock,
  Scale,
  ShieldCheck,
} from "lucide-react";

export default function TermsOfUse(){
  const lastUpdated = "August 5, 2026";

  return (
    <main className="min-h-screen bg-aeviora-ivory text-aeviora-charcoal">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-aeviora-softSage via-white to-aeviora-ivory px-6 py-16">
        <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-aeviora-primary/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-aeviora-gold/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-aeviora-primary hover:text-aeviora-primaryDark"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          <div className="mt-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-aeviora-primary/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-aeviora-primary shadow-sm">
              <FileText size={15} />
              Legal Information
            </div>

            <h1 className="font-display text-5xl leading-tight md:text-6xl">
              Terms of Use
            </h1>

            <p className="mt-5 text-lg leading-8 text-aeviora-slate">
              Please review these Terms of Use carefully before using the
              Aeviora Wellness website, patient portal, digital forms, or related
              online services.
            </p>

            <p className="mt-5 text-sm text-aeviora-slate">
              Last Updated: {lastUpdated}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_1fr]">
          {/* Side Summary */}
          <aside className="h-fit rounded-3xl border border-aeviora-border bg-white p-6 shadow-sm lg:sticky lg:top-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-primary text-white">
              <ShieldCheck size={22} />
            </div>

            <h2 className="mt-5 font-display text-2xl">
              Patient Website Terms
            </h2>

            <p className="mt-3 text-sm leading-6 text-aeviora-slate">
              These terms explain how patients and visitors may use the Aeviora
              Wellness website and online services.
            </p>

            <div className="mt-6 space-y-3">
              <SummaryItem text="No emergency use" />
              <SummaryItem text="No guaranteed results" />
              <SummaryItem text="Secure portal required for PHI" />
              <SummaryItem text="Privacy Notice applies" />
              <SummaryItem text="Provider evaluation required" />
            </div>
          </aside>

          {/* Terms Card */}
          <article className="rounded-[2rem] border border-aeviora-border bg-white p-6 shadow-sm md:p-10">
            <ImportantNotice />

            <TermsSection number="1" title="Acceptance of Terms">
              <p>
                By accessing or using the Aeviora Wellness website, patient
                portal, digital forms, online scheduling tools, educational
                materials, or related digital services, you agree to these Terms
                of Use. If you do not agree with these Terms, you should not use
                this website or online services.
              </p>

              <p>
                These Terms apply to all visitors, patients, prospective
                patients, users, and others who access Aeviora Wellness digital
                services.
              </p>
            </TermsSection>

            <TermsSection number="2" title="About Aeviora Wellness">
              <p>
                Aeviora Wellness provides wellness, longevity, preventive health,
                hormone optimization, medical weight management, peptide therapy,
                functional medicine, IV therapy, and related health services,
                where clinically appropriate and permitted by law.
              </p>

              <p>
                Services may require medical review, provider evaluation,
                laboratory testing, eligibility screening, informed consent, and
                ongoing monitoring. Availability of services may vary based on
                patient eligibility, provider judgment, state law, clinical
                appropriateness, and safety considerations.
              </p>
            </TermsSection>

            <TermsSection number="3" title="Not for Medical Emergencies">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-1 shrink-0 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">
                      Do not use this website or patient portal for emergencies.
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      If you are experiencing a medical emergency, call 911 or go
                      to the nearest emergency department immediately. Do not
                      rely on this website, online forms, portal messages, email,
                      or text messages for urgent or emergency medical needs.
                    </p>
                  </div>
                </div>
              </div>
            </TermsSection>

            <TermsSection number="4" title="Medical Disclaimer">
              <p>
                Information provided on this website is for general educational
                and informational purposes only. It is not intended to be a
                substitute for professional medical advice, diagnosis, or
                treatment.
              </p>

              <p>
                Viewing website content, submitting an online form, selecting a
                wellness protocol, or using the patient portal does not by itself
                create a provider-patient relationship. A provider-patient
                relationship is established only after Aeviora Wellness accepts
                you as a patient and a qualified provider evaluates you according
                to applicable clinical and legal requirements.
              </p>

              <p>
                Always seek the advice of a licensed healthcare professional
                regarding any medical condition, symptoms, medication,
                supplement, therapy, treatment plan, or health-related decision.
              </p>
            </TermsSection>

            <TermsSection number="5" title="No Guarantee of Results">
              <p>
                Aeviora Wellness may provide wellness, longevity, weight
                management, hormone, peptide, functional medicine, IV therapy, or
                related services. Individual results vary.
              </p>

              <p>
                Aeviora Wellness does not guarantee weight loss, symptom
                improvement, hormone optimization, anti-aging outcomes, longevity
                benefits, metabolic improvement, aesthetic results, or any
                specific clinical outcome. Treatment decisions depend on
                individual medical history, laboratory findings, clinical
                evaluation, adherence, safety, and provider judgment.
              </p>
            </TermsSection>

            <TermsSection number="6" title="Patient Portal Use">
              <p>
                The patient portal may allow patients to register, complete
                intake forms, review approved records, update profile
                information, communicate with the care team, access forms, or
                manage certain aspects of their wellness care.
              </p>

              <p>You agree to:</p>

              <ul>
                <li>Provide accurate and complete information.</li>
                <li>Keep your login credentials confidential.</li>
                <li>Notify Aeviora Wellness if you suspect unauthorized access.</li>
                <li>Use the portal only for your own care or authorized access.</li>
                <li>Avoid uploading false, harmful, abusive, or unlawful content.</li>
                <li>Use secure portal messaging for sensitive health information.</li>
              </ul>

              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for activity that occurs under your
                account.
              </p>
            </TermsSection>

            <TermsSection number="7" title="Privacy and Health Information">
              <p>
                Aeviora Wellness respects patient privacy. Use and disclosure of
                protected health information may be governed by the Aeviora
                Wellness Notice of Privacy Practices, HIPAA, applicable state law,
                and other privacy requirements.
              </p>

              <p>
                Sensitive medical information should be submitted only through
                approved secure systems. Standard email, text messaging, website
                contact forms, and non-secure communication tools may not be
                appropriate for detailed medical information.
              </p>

              <p>
                For more information, please review the Aeviora Wellness Privacy
                Policy and Notice of Privacy Practices.
              </p>
            </TermsSection>

            <TermsSection number="8" title="Telehealth and Digital Services">
              <p>
                Some Aeviora Wellness services may be provided using telehealth
                or digital communication tools when clinically appropriate and
                legally permitted.
              </p>

              <p>
                Telehealth may not be appropriate for all patients, symptoms,
                conditions, medications, or treatments. Aeviora Wellness may
                require an in-person visit, laboratory testing, physical
                examination, identity verification, pharmacy review, or referral
                to another healthcare provider before or during care.
              </p>

              <p>
                You understand that telehealth services may involve technology
                limitations, including internet disruptions, device issues,
                incomplete information, or communication delays.
              </p>
            </TermsSection>

            <TermsSection number="9" title="Eligibility for Services">
              <p>
                Submission of an intake form, online questionnaire, protocol
                interest form, or patient registration does not guarantee that
                you are eligible for any service, medication, supplement,
                procedure, therapy, prescription, or treatment plan.
              </p>

              <p>
                Aeviora Wellness may decline, postpone, modify, or discontinue
                services when determined appropriate for safety, legal,
                regulatory, clinical, operational, or ethical reasons.
              </p>
            </TermsSection>

            <TermsSection number="10" title="Medications, Supplements, and Therapies">
              <p>
                Any medication, supplement, injection, IV therapy, peptide,
                hormone therapy, GLP-1 therapy, or other wellness service must be
                reviewed by a qualified healthcare provider. Risks, benefits,
                alternatives, contraindications, monitoring requirements, and
                informed consent may apply.
              </p>

              <p>
                You agree to inform Aeviora Wellness of your complete medical
                history, current medications, allergies, pregnancy status when
                applicable, prior reactions, health changes, and any relevant
                information that may affect your care.
              </p>
            </TermsSection>

            <TermsSection number="11" title="User Responsibilities">
              <p>You agree not to misuse the website or patient portal. You may not:</p>

              <ul>
                <li>Attempt to access another patient’s information.</li>
                <li>Share your account with another person.</li>
                <li>Upload malicious code, viruses, or harmful files.</li>
                <li>Interfere with website or portal security.</li>
                <li>Use the website for fraudulent, unlawful, or abusive purposes.</li>
                <li>Copy, scrape, or misuse website content without permission.</li>
                <li>Impersonate another person or submit false information.</li>
              </ul>
            </TermsSection>

            <TermsSection number="12" title="Website Content and Intellectual Property">
              <p>
                Website content, branding, logos, design elements, text,
                graphics, forms, educational materials, workflows, and other
                materials are owned by or licensed to Aeviora Wellness unless
                otherwise stated.
              </p>

              <p>
                You may use the website for personal, non-commercial purposes
                related to learning about Aeviora Wellness services or managing
                your own patient account. You may not copy, reproduce,
                distribute, modify, sell, or exploit website materials without
                written permission.
              </p>
            </TermsSection>

            <TermsSection number="13" title="Third-Party Links and Vendors">
              <p>
                The website may contain links to third-party websites, payment
                platforms, scheduling tools, telehealth tools, pharmacies,
                laboratories, educational resources, or other external services.
              </p>

              <p>
                Aeviora Wellness is not responsible for third-party websites,
                their content, security, privacy practices, availability, or
                accuracy. Your use of third-party services may be governed by
                their own terms and privacy policies.
              </p>
            </TermsSection>

            <TermsSection number="14" title="Payments, Fees, and Cancellations">
              <p>
                Certain services may require payment, deposits, membership fees,
                consultation fees, package fees, laboratory fees, medication
                costs, or other charges. Pricing, availability, and payment
                terms may change.
              </p>

              <p>
                Any cancellation, refund, membership, package, or payment policy
                should be provided separately by Aeviora Wellness and may vary by
                service. You are responsible for reviewing applicable payment
                terms before purchasing or receiving services.
              </p>
            </TermsSection>

            <TermsSection number="15" title="Limitation of Liability">
              <p>
                To the fullest extent permitted by law, Aeviora Wellness is not
                liable for indirect, incidental, consequential, special,
                exemplary, or punitive damages arising from your use of the
                website, digital services, educational materials, or online
                tools.
              </p>

              <p>
                Aeviora Wellness does not warrant that the website or portal will
                be uninterrupted, error-free, secure from every possible risk, or
                available at all times.
              </p>
            </TermsSection>

            <TermsSection number="16" title="Disclaimer of Warranties">
              <p>
                The website and online services are provided on an “as available”
                and “as is” basis. Aeviora Wellness makes no warranties regarding
                website availability, accuracy, completeness, performance,
                security, suitability, or fitness for a particular purpose,
                except where required by law.
              </p>
            </TermsSection>

            <TermsSection number="17" title="Changes to These Terms">
              <p>
                Aeviora Wellness may update these Terms of Use from time to time.
                Updates will be posted on this page with a revised “Last Updated”
                date. Continued use of the website or online services after
                changes are posted means you accept the updated Terms.
              </p>
            </TermsSection>

            <TermsSection number="18" title="Contact Information">
              <p>
                If you have questions about these Terms of Use, please contact
                Aeviora Wellness.
              </p>

              <div className="mt-5 rounded-2xl bg-aeviora-ivory p-5 text-sm leading-7">
                <p>
                  <strong>Aeviora Wellness</strong>
                </p>
                <p>Address: ______________________________</p>
                <p>Phone: ______________________________</p>
                <p>Email: ______________________________</p>
                <p>Patient Portal: ______________________________</p>
              </div>
            </TermsSection>

            <div className="mt-10 rounded-3xl border border-aeviora-primary/20 bg-aeviora-softSage p-6">
              <div className="flex gap-3">
                <Scale className="mt-1 shrink-0 text-aeviora-primary" />
                <div>
                  <h3 className="font-display text-2xl">
                    Legal Review Recommended
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-aeviora-slate">
                    This Terms of Use page is a strong website-ready starting
                    template, but it should be reviewed by a healthcare attorney
                    before publication, especially for Florida-specific rules,
                    telehealth operations, refund policies, privacy language,
                    and medical advertising requirements.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function ImportantNotice() {
  return (
    <div className="mb-10 rounded-3xl border border-aeviora-gold/30 bg-aeviora-softGold/40 p-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aeviora-primary text-white">
          <HeartPulse size={22} />
        </div>

        <div>
          <h2 className="font-display text-2xl text-aeviora-charcoal">
            Important Healthcare Notice
          </h2>
          <p className="mt-2 text-sm leading-6 text-aeviora-slate">
            This website does not provide emergency medical care. Online content
            is educational and does not replace medical advice, diagnosis, or
            treatment from a licensed healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}

function TermsSection({ number, title, children }) {
  return (
    <section className="border-b border-aeviora-border py-8 last:border-b-0">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aeviora-primary text-sm font-bold text-white">
          {number}
        </div>

        <h2 className="font-display text-2xl text-aeviora-charcoal md:text-3xl">
          {title}
        </h2>
      </div>

      <div className="prose prose-sm max-w-none text-aeviora-slate prose-p:leading-7 prose-li:leading-7 prose-ul:my-4 prose-li:marker:text-aeviora-primary">
        {children}
      </div>
    </section>
  );
}

function SummaryItem({ text }) {
  return (
    <div className="flex items-center gap-2 text-sm text-aeviora-slate">
      <CheckCircle2 size={16} className="shrink-0 text-aeviora-primary" />
      <span>{text}</span>
    </div>
  );
}