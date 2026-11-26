import { ArrowRight, Brain, Sparkles, ShieldCheck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";

export default function Neurology() {
  useLanguage();
  return (
    <div className="min-h-screen bg-aeviora-cream">
      <Navbar />
      <main>
        <section className="bg-aeviora-primaryDark px-6 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-aeviora-lightGold">{t("Explore neurological wellness")}</p>
              <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{t("A closer look at neurological peptides")}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-200">{t("Explore the science of peptides and their role in nervous system communication, and learn what to discuss with a qualified healthcare professional.")}</p>
              <Link to="/register" className="mt-8 inline-flex items-center justify-center gap-2 bg-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-black transition hover:bg-aeviora-lightGold">{t("Sign up for free")}<ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
            <div className="flex min-h-64 items-center justify-center border border-white/20 bg-white/5 p-8 sm:min-h-80" role="img" aria-label="Illustration of a brain">
              <div className="flex h-56 w-56 items-center justify-center rounded-full border border-aeviora-gold/50 bg-aeviora-gold/10 sm:h-72 sm:w-72">
                <Brain aria-hidden="true" strokeWidth={0.8} className="h-40 w-40 text-aeviora-lightGold sm:h-52 sm:w-52" />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-white px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase text-aeviora-gold">{t("Educational overview")}</p>
            <h2 className="mt-2 font-display text-3xl text-aeviora-charcoal">{t("What are neuropeptides?")}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-aeviora-slate">{t("Neuropeptides are small chains of amino acids that act as signaling molecules in the nervous system. They help regulate communication between cells and are involved in many functions throughout the body. Researchers continue to study how peptide signaling works and its potential relevance to health.")}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                [Sparkles, "A developing field", "Research into peptide signaling is ongoing. Findings about naturally occurring neuropeptides do not necessarily establish the benefits of a peptide treatment."],
                [ShieldCheck, "Consider the evidence", "The evidence, risks, and approval status vary by product and intended use. Compounded drugs are not FDA-approved or reviewed by the FDA for safety, effectiveness, or quality before marketing."],
                [MessageCircle, "Talk with a professional", "Ask a licensed healthcare professional about the evidence, potential risks, alternatives, and whether a particular option is appropriate for you."],
              ].map(([Icon, title, description]) => (
                <article key={title} className="border border-aeviora-border bg-aeviora-ivory p-6">
                  <Icon aria-hidden="true" className="text-aeviora-primary" size={26} />
                  <h3 className="mt-4 font-display text-xl text-aeviora-charcoal">{t(title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-aeviora-slate">{t(description)}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 border-l-2 border-aeviora-gold pl-4 text-sm leading-6 text-aeviora-slate">{t("This page is for general education and is not medical advice or a recommendation for treatment. Availability and eligibility vary by provider.")}</p>
            <p className="mt-5 text-sm leading-6 text-aeviora-slate">{t("Learn more:")} <a className="underline underline-offset-4" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12178255/">{t("Neuropeptide signaling research")}</a> · <a className="underline underline-offset-4" href="https://www.fda.gov/drugs/human-drug-compounding/compounding-and-fda-questions-and-answers">{t("FDA information on compounded drugs")}</a></p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
