import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
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
                Aeviora Wellness
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
                Your portal to wellness services and therapy information.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-200">
                Register for an Aeviora account and explore general therapy
                information. Sign in to access links to telehealth and
                laboratory providers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center border border-aeviora-gold bg-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-black transition hover:bg-aeviora-lightGold"
                >
                  Create an account
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
              <h2 className="font-display text-2xl">A portal, not a clinical record system</h2>
              <p className="mt-3 text-sm leading-6 text-gray-200">
                Aeviora handles account registration and provides links to
                independent service providers. This website does not collect
                health histories or clinical records. Use the provider's own
                service for care-related information.
              </p>
            </aside>
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