import { useState } from "react";
import { ArrowRight, Brain, Search, Sparkles, Pill, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";

const concepts = [
  { id: "peptides", title: "Peptides", icon: Sparkles, description: "Explore peptide signaling and related areas of neurological research." },
  { id: "supplements", title: "Supplements", icon: Pill, description: "Learn about dietary supplement ingredients and questions to ask before taking them." },
  { id: "nutrition", title: "Nutrition", icon: Leaf, description: "Explore foods and nutrients that are part of a balanced approach to wellness." },
];

const entries = [
  { name: "Nootropics", category: "Peptides", description: "A broad term for substances studied or promoted for cognitive effects. Nootropics are not necessarily peptides, and evidence and risks vary by substance.", source: "https://www.nccih.nih.gov/health/tips/things-to-know-about-dietary-supplements-for-cognitive-function-dementia-and-alzheimers-disease", tags: "cognition focus brain" },
  { name: "Neuropeptides", category: "Peptides", description: "Small chains of amino acids that act as signaling molecules in the nervous system. Researchers continue to study their roles in neural communication.", source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12178255/", tags: "neuropeptide brain signaling" },
  { name: "Antioxidants", category: "Peptides", description: "A broad group of substances that interact with free radicals. Antioxidants are not necessarily peptides, and research on supplements varies by ingredient.", source: "https://www.nccih.nih.gov/health/antioxidant-supplements-what-you-need-to-know", tags: "antioxidant antixoxidant oxidative" },
  { name: "Oxytocin", category: "Peptides", description: "A naturally occurring peptide hormone and signaling molecule studied for its roles in the nervous system.", source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11072502/", tags: "neuropeptide hormone" },
  { name: "Omega-3 fish oil", category: "Supplements", description: "A supplement source of omega-3 fatty acids. More research is needed on the effects of omega-3s on the brain.", source: "https://ods.od.nih.gov/factsheets/Omega3FattyAcids-Consumer/", tags: "dha epa supplement" },
  { name: "Vitamin B12", category: "Supplements", description: "A nutrient needed to keep nerve and blood cells healthy; supplements are one way to obtain it when appropriate.", source: "https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/", tags: "b12 nerve vitamin" },
  { name: "Fish and seafood", category: "Nutrition", description: "Foods that can provide omega-3 fatty acids, including DHA, a component of cells in the brain.", source: "https://ods.od.nih.gov/factsheets/Omega3FattyAcids-Consumer/", tags: "omega-3 dha food" },
  { name: "Fruits and vegetables", category: "Nutrition", description: "Foods that supply a variety of nutrients and can be part of a balanced eating pattern.", source: "https://www.myplate.gov/eat-healthy/what-is-myplate", tags: "food diet antioxidants" },
];

export default function Neurology() {
  useLanguage();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const matchingConcepts = concepts.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(normalized));
  const matchingEntries = entries.filter((item) => `${item.name} ${item.category} ${item.description} ${item.tags}`.toLowerCase().includes(normalized));
  const searchTopic = (value) => {
    setQuery(value);
    document.getElementById("neurology-search")?.focus();
  };
  return (
    <div className="min-h-screen bg-aeviora-cream">
      <Navbar />
      <main>
        <section className="bg-aeviora-primaryDark px-6 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-aeviora-lightGold">{t("Explore neurological wellness")}</p>
              <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{t("Explore the science of neurological wellness")}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-200">{t("Discover educational information about peptides, supplements, and nutrition, and prepare for a conversation with your healthcare professional.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-aeviora-gold px-5 py-3 text-sm font-semibold text-aeviora-black transition hover:bg-aeviora-lightGold">{t("Sign up for free")}<ArrowRight aria-hidden="true" size={17} /></Link>
                <a href="#explore" className="inline-flex items-center justify-center border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{t("Explore the topics")}</a>
              </div>
            </div>
            <div className="flex min-h-64 items-center justify-center border border-white/20 bg-white/5 p-8 sm:min-h-80" role="img" aria-label="Illustration of a brain">
              <div className="flex h-56 w-56 items-center justify-center rounded-full border border-aeviora-gold/50 bg-aeviora-gold/10 sm:h-72 sm:w-72"><Brain aria-hidden="true" strokeWidth={0.8} className="h-40 w-40 text-aeviora-lightGold sm:h-52 sm:w-52" /></div>
            </div>
          </div>
        </section>
        <section id="explore" className="scroll-mt-28 bg-white px-6 py-14" aria-labelledby="explore-heading">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase text-aeviora-gold">{t("Educational overview")}</p>
            <h2 id="explore-heading" className="mt-2 font-display text-3xl text-aeviora-charcoal">{t("Explore neurological wellness topics")}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-aeviora-slate">{t("Browse concepts and examples to learn more. Inclusion is educational and does not confirm that a product or service is available or appropriate for you.")}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {concepts.map(({ id, title, icon: Icon, description }) => <article key={id} className="border border-aeviora-border bg-aeviora-ivory p-6">
                <Icon aria-hidden="true" className="text-aeviora-primary" size={26} />
                <h3 className="mt-4 font-display text-xl text-aeviora-charcoal">{t(title)}</h3>
                <p className="mt-3 text-sm leading-6 text-aeviora-slate">{t(description)}</p>
                {id === "peptides" ? <nav aria-label={t("Peptide related topics")} className="mt-5 border-t border-aeviora-border pt-4"><p className="text-xs font-semibold uppercase text-aeviora-slate">{t("Related topics")}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{["Nootropics", "Neuropeptides", "Antioxidants"].map((name) => <button type="button" key={name} onClick={() => searchTopic(name)} className="text-left text-sm font-semibold text-aeviora-primary underline underline-offset-4">{t(name)}</button>)}</div></nav> : <button type="button" onClick={() => searchTopic(title)} className="mt-5 text-sm font-semibold text-aeviora-primary underline underline-offset-4">{t("Explore examples")}</button>}
              </article>)}
            </div>
            <div className="mt-12 border-t border-aeviora-border pt-8">
              <h2 className="font-display text-3xl text-aeviora-charcoal">{t("Search topics and examples")}</h2>
              <div role="search" className="mt-5 max-w-2xl">
                <label htmlFor="neurology-search" className="block text-sm font-semibold text-aeviora-charcoal">{t("Search concepts and ingredients")}</label>
                <div className="mt-2 flex items-center gap-3 border border-aeviora-border bg-white px-4 focus-within:border-aeviora-primary focus-within:ring-2 focus-within:ring-aeviora-softSage"><Search size={19} aria-hidden="true" className="shrink-0 text-aeviora-slate" /><input id="neurology-search" type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Try neuropeptides, omega-3, or nutrition")} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" aria-describedby="neurology-search-help" /></div>
                <p id="neurology-search-help" className="mt-2 text-xs leading-5 text-aeviora-slate">{t("Search this educational collection by topic, ingredient, or example. Results update as you type.")}</p>
              </div>
              <p role="status" className="mt-6 text-sm text-aeviora-slate">{matchingEntries.length + (normalized ? matchingConcepts.length : 0)} {t("results")}</p>
              {normalized && matchingConcepts.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{matchingConcepts.map((item) => <article key={item.id} className="border border-aeviora-border bg-aeviora-ivory p-5"><p className="text-xs font-semibold uppercase text-aeviora-gold">{t("Concept")}</p><h3 className="mt-2 font-display text-xl text-aeviora-charcoal">{t(item.title)}</h3><p className="mt-2 text-sm leading-6 text-aeviora-slate">{t(item.description)}</p></article>)}</div>}
              {matchingEntries.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{matchingEntries.map((item) => <article key={item.name} className="border border-aeviora-border p-5"><p className="text-xs font-semibold uppercase text-aeviora-gold">{t(item.category)}</p><h3 className="mt-2 font-display text-xl text-aeviora-charcoal">{t(item.name)}</h3><p className="mt-2 text-sm leading-6 text-aeviora-slate">{t(item.description)}</p><a href={item.source} className="mt-4 inline-block text-sm font-semibold text-aeviora-primary underline underline-offset-4">{t("Read the source")}</a></article>)}</div> : !matchingConcepts.length && <p className="mt-4 text-sm text-aeviora-slate">{t("No matches found. Try another term or clear your search.")}</p>}
            </div>
            <p className="mt-8 border-l-2 border-aeviora-gold pl-4 text-sm leading-6 text-aeviora-slate">{t("This page is educational, not medical advice. Evidence and risks vary by product. Discuss supplements and treatments with a licensed healthcare professional, including possible interactions. Compounded drugs are not FDA-approved.")} <a className="underline underline-offset-4" href="https://www.fda.gov/drugs/human-drug-compounding/compounding-and-fda-questions-and-answers">{t("FDA information on compounding")}</a></p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
