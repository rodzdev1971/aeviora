import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import SecurityNotice from "../components/securitynotice";
import Feature from "../components/feature";

export default function Home() {
  return (
    <div className="min-h-screen bg-aeviora-cream">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-aeviora-charcoal px-6 py-12 text-white lg:py-15">
        <div className="absolute inset-0">
          <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-aeviora-gold/20 blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-aeviora-sage/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,162,77,0.16),transparent_35%)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aeviora-gold/40 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-aeviora-lightGold">
              <Sparkles size={15} />
              Luxury Wellness Patient Portal
            </div>

            <h1 className="font-display text-5xl leading-tight md:text-6xl lg:text-7xl">
              Modern care access for longevity, wellness, and precision health.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
              Aeviora Wellness gives patients a refined digital experience to
              register, complete intake forms, access wellness records, and
              manage their care journey through a privacy-focused patient portal.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              {/* <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-aeviora-gold px-6 py-4 text-sm font-bold text-aeviora-black transition hover:bg-aeviora-lightGold"
              >
                Start Patient Registration
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-aeviora-gold/70 px-6 py-4 text-sm font-bold text-aeviora-gold transition hover:bg-aeviora-gold hover:text-aeviora-black"
              >
                Access Patient Portal
              </Link> */}
              
                <button className="btn-gold">
                Clinic will open soon
                </button>
                
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <TrustPoint label="Secure Access" />
              <TrustPoint label="Patient Records" />
              <TrustPoint label="Wellness Intake" />
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-aeviora-gold/40 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-white p-6 text-aeviora-black">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                      Patient Overview
                    </p>
                    <h2 className="mt-1 font-display text-3xl">
                      Wellness Dashboard
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
                    <HeartPulse />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PortalCard
                    icon={<ClipboardList />}
                    title="Intake Forms"
                    value="2 Pending"
                  />
                  <PortalCard
                    icon={<FileText />}
                    title="Records"
                    value="8 Files"
                  />
                  <PortalCard
                    icon={<CalendarCheck />}
                    title="Next Review"
                    value="June 18"
                  />
                  <PortalCard
                    icon={<ShieldCheck />}
                    title="Privacy Status"
                    value="Protected"
                  />
                </div>

                <div className="mt-6 rounded-3xl bg-aeviora-cream p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Lock size={17} className="text-aeviora-gold" />
                    Security Reminder
                  </div>
                  <p className="text-sm leading-6 text-gray-600">
                    For production, use encrypted backend storage, audit logs,
                    MFA, secure sessions, role-based permissions, and signed
                    BAAs with all applicable vendors.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-aeviora-gold/30 bg-aeviora-black p-5 text-white shadow-xl md:block">
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                Portal Ready
              </p>
              <p className="mt-1 font-display text-2xl">Patient-first UX</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROFESSIONAL INTRO */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.1fr] lg:items-center">
            <div>
              <p className="uppercase tracking-[0.3em] text-3xl pb-2 text-aeviora-gold">
                Aeviora Wellness
              </p>
              <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
                A premium digital front door for your wellness clinic.
              </h2>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ProfessionalCard
              icon={<UserRoundCheck />}
              title="Patient Registration"
              text="Allow new patients to create an account and begin their wellness journey with a clean registration experience."
            />

            <ProfessionalCard
              icon={<ClipboardList />}
              title="Digital Intake"
              text="Collect structured wellness goals, medical background, allergies, medications, and lifestyle information."
            />

            <ProfessionalCard
              icon={<FileText />}
              title="Records Management"
              text="Give patients organized access to approved clinical notes, wellness summaries, lab reviews, and care documents."
            />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
              Wellness Services
            </p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Designed for a modern longevity practice.
            </h2>
            <p className="mt-5 text-gray-600">
              The patient portal can support multiple service lines while keeping
              the patient experience consistent, elegant, and easy to navigate.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Hormone Optimization",
              "Medical Weight Loss",
              "GLP-1 Programs",
              "Peptide Therapy",
              "Functional Medicine",
              "NAD+ and IV Therapy",
              "Longevity Assessment",
              "Metabolic Health",
              "Preventive Wellness",
            ].map((service) => (
              <div
                key={service}
                className="group rounded-3xl border border-gray-200 bg-aeviora-cream p-6 transition hover:-translate-y-1 hover:border-aeviora-gold hover:shadow-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
                  <Stethoscope />
                </div>
                <h3 className="font-display text-2xl">{service}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Support documentation, intake, care summaries, and secure
                  patient communication for this service category.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTAL FEATURES */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-aeviora-black p-8 text-white md:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
                  Secure Portal Experience
                </p>
                <h2 className="mt-3 font-display text-4xl md:text-5xl">
                  Everything patients need in one organized portal.
                </h2>
                <p className="mt-5 leading-8 text-gray-300">
                  Patients can register, complete forms, review their wellness
                  documents, update profile details, and access their care
                  information from a responsive dashboard.
                </p>
              </div>

              <div className="grid gap-4">
                <Feature icon={<ShieldCheck />} title="Privacy-first workflow" />
                <Feature icon={<UserRoundCheck />} title="Secure patient access" />
                <Feature icon={<FileText />} title="Organized patient records" />
                <Feature icon={<ClipboardList />} title="Digital intake forms" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
              Patient Journey
            </p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Simple, professional, and organized.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <StepCard
              number="01"
              title="Register"
              text="Patient creates a secure portal account."
            />
            <StepCard
              number="02"
              title="Complete Intake"
              text="Patient fills out wellness and medical history forms."
            />
            <StepCard
              number="03"
              title="Review Records"
              text="Approved documents and care summaries are organized."
            />
            <StepCard
              number="04"
              title="Manage Care"
              text="Patient keeps information updated over time."
            />
          </div>
        </div>
      </section>

      {/* HIPAA NOTICE */}
      <section id="privacy" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SecurityNotice />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-aeviora-black p-10 text-center text-white md:p-16">
          <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
            Aeviora Wellness Portal
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl md:text-5xl">
            Give your patients a premium digital experience from day one.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-gray-300">
            Start with registration, intake, records access, and a refined
            dashboard experience built for a modern wellness and longevity brand.
          </p>

          {/* <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/register" className="btn-gold">
              Register as Patient
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-gold hover:bg-aeviora-gold hover:text-aeviora-black"
            >
              Login to Portal
            </Link>
          </div> */}
           <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <button className="btn-gold">
                Clinic will open soon
                </button>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function TrustPoint({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <CheckCircle2 size={17} className="text-aeviora-gold" />
      {label}
    </div>
  );
}

function PortalCard({ icon, title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-aeviora-black text-aeviora-gold">
        {icon}
      </div>
      <p className="text-sm text-gray-300">{title}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function ProfessionalCard({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-aeviora-gold hover:shadow-xl">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
        {icon}
      </div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-aeviora-cream p-6">
      <p className="font-display text-4xl text-aeviora-gold">{number}</p>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}