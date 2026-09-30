import { useState } from "react";
import { ExternalLink, FlaskConical, Sparkles, UserRound, Video } from "lucide-react";
import TherapyInterestQuiz from "../components/TherapyInterestQuiz.jsx";

const telehealthServices = [
  {
    name: "Doxy.me",
    description: "Join your Aeviora Wellness telehealth room.",
    href: "https://doxy.me/aeviorawellness/1932125275",
    icon: Video,
    tone: "border-emerald-700 text-emerald-800",
  },
  {
    name: "Office Ally Patient Ally",
    description: "Open the Patient Ally portal.",
    href: "https://www.patientally.com/welcome",
    icon: UserRound,
    tone: "border-sky-700 text-sky-800",
  },
];

const laboratoryServices = [
  {
    name: "Labcorp",
    description: "Visit Labcorp's patient services.",
    href: "https://www.labcorp.com/",
    icon: FlaskConical,
    tone: "border-rose-700 text-rose-800",
  },
  {
    name: "Quest Diagnostics",
    description: "Visit Quest Diagnostics patient services.",
    href: "https://www.questdiagnostics.com/",
    icon: FlaskConical,
    tone: "border-blue-800 text-blue-900",
  },
  {
    name: "Finlay Labs",
    description: "Visit Finlay Labs.",
    href: "https://finlaylab.com/",
    icon: FlaskConical,
    tone: "border-lime-800 text-lime-900",
  },
];

function ServiceCard({ service }) {
  const Icon = service.icon;
  return (
    <a
      href={service.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-36 items-start gap-4 border border-aeviora-border bg-white p-5 transition hover:border-aeviora-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeviora-primary"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center border ${service.tone}`}>
        <Icon aria-hidden="true" size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold text-aeviora-charcoal">{service.name}</span>
          <ExternalLink
            aria-hidden="true"
            size={16}
            className="shrink-0 text-aeviora-slate transition group-hover:text-aeviora-primary"
          />
        </span>
        <span className="mt-2 block text-sm leading-6 text-aeviora-slate">
          {service.description}
        </span>
      </span>
    </a>
  );
}

function ServiceSection({ title, services }) {
  return (
    <section aria-labelledby={title.toLowerCase().replaceAll(" ", "-")}>
      <div className="mb-4 flex items-baseline justify-between border-b border-aeviora-border pb-3">
        <h2
          id={title.toLowerCase().replaceAll(" ", "-")}
          className="font-display text-2xl text-aeviora-charcoal"
        >
          {title}
        </h2>
        <span className="text-sm text-aeviora-slate">{services.length} services</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>
    </section>
  );
}

export default function MainDashboard() {
  const [showTherapyQuiz, setShowTherapyQuiz] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-aeviora-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">
          Aeviora Wellness
        </p>
        <h1 className="mt-2 font-display text-3xl text-aeviora-charcoal">
          Care services
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-aeviora-slate">
          Access telehealth and laboratory service providers.
        </p>
      </header>
      <section className="mt-6 border-b border-aeviora-border pb-6">
        {showTherapyQuiz ? (
          <TherapyInterestQuiz onClose={() => setShowTherapyQuiz(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowTherapyQuiz(true)}
            className="inline-flex items-center gap-2 border border-aeviora-primary px-4 py-3 text-sm font-semibold text-aeviora-primary transition hover:bg-aeviora-primary hover:text-white"
          >
            <Sparkles aria-hidden="true" size={18} />
            Explore therapy topics
          </button>
        )}
      </section>
      <div className="mt-8 space-y-10">
        <ServiceSection title="Telehealth" services={telehealthServices} />
        <ServiceSection title="Laboratories" services={laboratoryServices} />
        </div>
    </div>
  );
}