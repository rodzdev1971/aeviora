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
                Wellness memberships & preventive care
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
                Make wellness part of your everyday life.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-200">
                Join Aeviora Wellness to explore membership plans with discounted
                prices on eligible wellness and preventive care services. Discover
                therapies, learn about your options, and take the next step toward
                making ongoing wellness more accessible.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center border border-aeviora-gold bg-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-black transition hover:bg-aeviora-lightGold"
                >
                  Get started with Aeviora
                </Link>
                <a
                  href="#memberships"
                  className="inline-flex items-center justify-center border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore membership benefits
                </a>
              </div>
            </div>

            <aside className="border-l-2 border-aeviora-gold px-6 py-2">
              <h2 className="font-display text-2xl">Discover therapies. Access member pricing.</h2>
              <p className="mt-3 text-sm leading-6 text-gray-200">
                Bring your wellness interests and your budget together. Explore
                laboratory testing, diagnostic services, and wellness therapies,
                with member pricing on services included in your selected plan.
              </p>
            </aside>
          </div>
        </section>

        <section id="memberships" aria-labelledby="memberships-heading" className="scroll-mt-28 bg-white px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase text-aeviora-gold">Membership with a purpose</p>
            <h2 id="memberships-heading" className="mt-2 font-display text-3xl text-aeviora-charcoal">More ways to make wellness accessible</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-aeviora-slate">
              Aeviora Wellness brings therapy exploration and membership savings
              together. Our membership plans offer access to discounted prices on
              eligible services across wellness and preventive medicine, helping
              you plan your next step with a clearer view of your options.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                ["Laboratory services", "Explore member pricing on eligible laboratory tests through participating providers."],
                ["Diagnostic services", "Access discounts on diagnostic services included in your membership benefits."],
                ["Wellness & preventive care", "Discover therapies and eligible wellness services that complement your preventive care goals."],
              ].map(([title, description]) => (
                <article key={title} className="border border-aeviora-border bg-aeviora-ivory p-6">
                  <h3 className="font-display text-xl text-aeviora-charcoal">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-aeviora-slate">{description}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 border-l-2 border-aeviora-gold pl-5">
              <h3 className="font-display text-2xl text-aeviora-charcoal">Start with your Aeviora account</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-aeviora-slate">
                Create an account to begin. Review membership options and confirm
                the included services, participating providers, and prices before
                enrolling. Creating an account does not enroll you in a paid plan.
              </p>
              <Link to="/register" className="mt-5 inline-flex items-center justify-center gap-2 bg-aeviora-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-aeviora-primaryDark">
                Get started <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-aeviora-slate">
              Discounts and eligible services vary by membership and provider.
              Exclusions may apply. Services are priced separately unless expressly
              included in your plan; clinical eligibility is determined by the provider.
            </p>
          </div>
        </section>

        <section aria-labelledby="therapy-quiz-heading" className="bg-aeviora-ivory px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <header className="mb-5">
              <p className="text-xs font-semibold uppercase text-aeviora-gold">
                Explore your wellness interests
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

        <section id="therapies" aria-labelledby="therapies-heading" className="scroll-mt-28 bg-white px-6 py-14">
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
                  Turn your wellness interests into your next step
                </h3>
                <p className="mt-1 text-sm leading-6 text-aeviora-slate">
                  Get started with Aeviora to explore membership opportunities
                  and discounted prices on eligible services. Provider links are
                  available after account activation and sign-in.
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
                    Get started with Aeviora
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
