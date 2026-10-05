import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import TherapyInterestQuiz from "../components/TherapyInterestQuiz.jsx";
import { protocols } from "../util/constants";

export default function Home() {
  return (
    <div className="min-h-screen bg-aeviora-cream">
      <Navbar />

      <main>
        <section className="bg-aeviora-primaryDark px-6 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-aeviora-lightGold">
                Patient services portal
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
                Aeviora Wellness
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-200">
                Explore wellness therapy topics, then create an account to use
                the interactive topic guide and access telehealth and
                laboratory provider links in your dashboard.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center border border-aeviora-gold bg-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-black transition hover:bg-aeviora-lightGold"
                >
                  Sign up to explore
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <aside className="border-l-2 border-aeviora-gold px-6 py-2">
              <h2 className="font-display text-2xl">Explore the therapy path that interests you</h2>
              <p className="mt-3 text-sm leading-6 text-gray-200">
                Aeviora handles account registration and provides links to
                independent service providers. This website does not collect
                health histories or clinical records. Use the provider's own
                service for care-related information.
              </p>
            </aside>
          </div>
        </section>

        <section aria-labelledby="therapy-quiz-heading" className="bg-aeviora-ivory px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <header className="mb-5">
              <p className="text-xs font-semibold uppercase text-aeviora-gold">
                Start exploring
              </p>
              <h2 id="therapy-quiz-heading" className="mt-2 font-display text-3xl text-aeviora-charcoal">
                Find a therapy topic that interests you
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-aeviora-slate">
                Choose a topic and the kind of general information you want to
                explore. This guide does not ask for symptoms or health history;
                your choices are not submitted or saved.
              </p>
            </header>
            <TherapyInterestQuiz showSignupCta />
          </div>
        </section>

        <section id="therapies" aria-labelledby="therapies-heading" className="bg-white px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <header className="mb-6 border-b border-aeviora-border pb-4">
              <p className="text-xs font-semibold uppercase text-aeviora-gold">
                Educational overview
              </p>
              <h2 id="therapies-heading" className="mt-2 font-display text-3xl text-aeviora-charcoal">
                Explore therapy topics
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-aeviora-slate">
                Browse general descriptions of the wellness services discussed
                by Aeviora. These summaries are informational and are not
                medical advice or a recommendation for treatment.
              </p>
            </header>
            <div className="mb-6 flex flex-col gap-4 border-l-2 border-aeviora-gold bg-aeviora-ivory p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-aeviora-charcoal">
                  Want to explore a topic interactively?
                </h3>
                <p className="mt-1 text-sm leading-6 text-aeviora-slate">
                  Create an account to access the therapy topic guide and
                  provider links after account activation and sign-in.
                </p>
              </div>
              <Link
                to="/register"
                className="inline-flex shrink-0 items-center justify-center gap-2 bg-aeviora-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-aeviora-primaryDark"
              >
                Create an account <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {protocols.map((therapy) => (
                <article
                  key={therapy.id}
                  className="border border-aeviora-border p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center border border-aeviora-gold text-aeviora-primary">
                    {therapy.icon}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-aeviora-charcoal">
                    {therapy.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-aeviora-slate">
                    {therapy.description}
                  </p>
                  <Link
                    to="/register"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-aeviora-primary underline underline-offset-4 hover:text-aeviora-primaryDark"
                  >
                    Explore after sign-up
                    <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-6 border-l-2 border-aeviora-gold pl-4 text-sm leading-6 text-aeviora-slate">
              A licensed healthcare professional determines whether any
              service or therapy is appropriate for an individual. Availability
              and eligibility vary by provider.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}