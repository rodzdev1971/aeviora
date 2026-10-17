import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Search, X } from "lucide-react";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage, t } from "../i18n/language.js";
import { company, protocols } from "../util/constants.jsx";
import { therapyMedications, regulatorySources, researchReviewedAt } from "../util/therapyResearch.js";
import MedicationIllustration from "../components/MedicationIllustration.jsx";
import TherapyTopicOverview from "../components/TherapyTopicOverview.jsx";
import { searchTherapies } from "../util/therapySearch.js";

function SourceLink({ source, compact = false }) {
  return <a href={source.url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} font-semibold text-aeviora-primary underline underline-offset-4`}>{source.title}<ExternalLink size={14} aria-hidden="true" /></a>;
}

export default function TherapyExplorer({ embedded = false, onClose }) {
  useLanguage();
  const language = getLanguage();
  const spanish = language === "es";
  const read = (value) => value?.[spanish ? "es" : "en"];
  const { topicId, medicationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const searching = Boolean(query.trim());
  const results = searchTherapies(query, protocols);
  const resultCount = results.topics.length + results.medications.length;
  function changeSearch(value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("q", value); else next.delete("q");
      return next;
    }, { replace: true, preventScrollReset: true });
  }
  const heading = useRef(null);
  const topic = protocols.find((item) => item.id === topicId);
  const medications = therapyMedications[topicId] || [];
  const medication = medications.find((item) => item.id === medicationId);
  const invalid = (topicId && !topic) || (medicationId && !medication);
  useEffect(() => { if (!embedded) heading.current?.focus(); }, [topicId, medicationId, embedded]);
  const title = invalid ? (spanish ? "Tema no encontrado" : "Topic not found") : medication?.name || (topic ? t(topic.name) : (spanish ? "Explora las terapias" : "Explore therapy topics"));
  const back = medicationId ? `/therapies/${topicId}` : topicId ? "/therapies" : "/dashboard";

  return <section className={embedded ? "rounded-3xl border border-aeviora-border bg-white p-5 sm:p-7" : "mx-auto max-w-6xl space-y-7"} aria-labelledby="therapy-explorer-heading">
    <header className="mb-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        {!embedded && <Link to={invalid ? "/therapies" : back} className="inline-flex items-center gap-2 text-sm text-aeviora-primary underline underline-offset-4"><ArrowLeft size={16} aria-hidden="true" />{spanish ? "Volver" : "Back"}</Link>}
        {onClose && <button type="button" onClick={onClose} className="ml-auto rounded-lg p-2 hover:bg-aeviora-ivory" aria-label={spanish ? "Cerrar explorador" : "Close therapy explorer"}><X size={20} /></button>}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">{spanish ? "Biblioteca de bienestar" : "Wellness library"}{medication && ` / ${t(topic.name)}`}</p>
      <h1 id="therapy-explorer-heading" ref={heading} tabIndex={-1} className="mt-3 font-display text-3xl text-aeviora-primary outline-none sm:text-4xl">{title}</h1>
      {!medication && !invalid && <p className="mt-3 max-w-2xl text-sm leading-6 text-aeviora-slate">{topic ? (spanish ? "Conoce los síntomas, las opciones de atención y cómo pueden influir en tu vida diaria. Explora las guías de investigación disponibles más abajo." : "Learn about symptoms, care options and how they may affect daily life. Explore available research guides below.") : (spanish ? "Explora cada tema para conocer los síntomas, cómo puede ayudar la atención y las guías de medicamentos disponibles." : "Explore each topic for background, symptoms, how care may help and available medication guides.")}</p>}
    </header>

    {!invalid && !medication && <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-6 rounded-2xl border border-aeviora-border bg-aeviora-ivory p-4 sm:p-5">
      <label htmlFor="therapy-search" className="block text-sm font-semibold text-aeviora-primary">{spanish ? "Buscar medicamentos y temas" : "Search medications and topics"}</label>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-aeviora-border bg-white px-4 transition focus-within:border-aeviora-primary focus-within:ring-2 focus-within:ring-aeviora-softSage"><Search size={19} aria-hidden="true" className="pointer-events-none shrink-0 text-aeviora-slate" /><input id="therapy-search" type="search" maxLength={100} value={query} onChange={(event) => changeSearch(event.target.value)} placeholder={spanish ? "NAD+, metformina, longevidad…" : "NAD+, Metformin, longevity…"} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" aria-describedby="therapy-search-help" aria-controls={searching ? "therapy-search-results" : undefined} /></div>
        {query && <button type="button" onClick={() => { changeSearch(""); document.getElementById("therapy-search")?.focus(); }} className="rounded-lg px-2 py-3 text-sm font-semibold text-aeviora-primary underline underline-offset-4">{spanish ? "Limpiar" : "Clear"}</button>}
      </div>
      <p id="therapy-search-help" className="mt-2 text-xs leading-5 text-aeviora-slate">{spanish ? "Busca en toda la biblioteca por nombre de medicamento o tema. Los resultados aparecen mientras escribes." : "Search the whole library by medication or topic name. Results update as you type."}</p>
    </form>}

    {!invalid && !medication && searching ? <section id="therapy-search-results" aria-labelledby="therapy-search-heading" className="space-y-6">
      <div><h2 id="therapy-search-heading" className="font-display text-2xl">{spanish ? "Resultados de búsqueda" : "Search results"}</h2><p role="status" className="mt-2 text-sm text-aeviora-slate">{resultCount} {spanish ? (resultCount === 1 ? "resultado" : "resultados") : (resultCount === 1 ? "result" : "results")}</p></div>
      {!results.topics.length && !results.medications.length && <div className="card"><p>{spanish ? "No encontramos medicamentos ni temas con ese nombre. Prueba otro nombre o limpia la búsqueda para ver todos los temas." : "No medications or topics match that name. Try another name or clear the search to browse all topics."}</p></div>}
      {results.medications.length > 0 && <div><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aeviora-primary">{spanish ? "Medicamentos" : "Medications"}</h3><div className="grid gap-3 sm:grid-cols-2">{results.medications.map(({ medication: item, topic: parent }) => <Link key={`${parent.id}/${item.id}`} to={`/therapies/${parent.id}/${item.id}`} className="card group transition hover:border-aeviora-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aeviora-primary">
        <div className="flex items-center justify-between gap-3"><h4 className="font-display text-xl text-aeviora-primary">{item.name}</h4><ArrowRight size={18} aria-hidden="true" /></div><p className="mt-2 text-sm text-aeviora-slate">{read(item.category)}</p><p className="mt-3 text-xs text-aeviora-slate">{t(parent.name)}</p>
        <p className="mt-3 text-xs font-semibold text-amber-900">{item.regulatoryType === "offLabel" ? (spanish ? "Uso off-label para longevidad" : "Off-label for longevity") : (spanish ? "No aprobado por la FDA para longevidad" : "Not FDA-approved for longevity")}</p>
      </Link>)}</div></div>}
      {results.topics.length > 0 && <div><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aeviora-primary">{spanish ? "Temas" : "Topics"}</h3><div className="grid gap-3 sm:grid-cols-2">{results.topics.map((item) => <Link key={item.id} to={`/therapies/${item.id}`} className="flex items-center gap-4 rounded-2xl border border-aeviora-border bg-white p-5 transition hover:border-aeviora-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aeviora-primary"><span className="text-aeviora-primary" aria-hidden="true">{item.icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{t(item.name)}</span><span className="mt-1 block text-xs text-aeviora-slate">{t(item.description)}</span></span><ArrowRight size={17} aria-hidden="true" /></Link>)}</div></div>}
    </section> : invalid ? <div className="card"><p>{spanish ? "Esta guía no está disponible. Vuelve a los temas para seguir explorando." : "This guide is not available. Return to the topics to keep exploring."}</p><Link to="/therapies" className="btn-primary mt-5 inline-block">{spanish ? "Ver temas" : "Browse topics"}</Link></div> : medication ? <>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <MedicationIllustration medication={medication} language={language} />
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-aeviora-primary">{read(medication.category)}</p>
          <p className="text-lg leading-8 text-aeviora-charcoal">{read(medication.intro)}</p>
          {medication.introSource && <SourceLink source={medication.introSource} />}
          <a href="#research-studies" className="btn-primary inline-flex items-center gap-2">{spanish ? "Descubrir los estudios" : "Discover the studies"}<ArrowRight size={17} aria-hidden="true" /></a>
          <p className="text-sm text-aeviora-slate">{spanish ? "De los mecanismos biológicos a los resultados en personas." : "From biological mechanisms to findings in people."}</p>
        </div>
      </div>

      {medication.featuredStudy && <section className="rounded-3xl border border-aeviora-border bg-aeviora-softSage/40 p-6 sm:p-8" aria-labelledby="featured-study-heading">
        <p className="text-xs font-semibold uppercase tracking-widest text-aeviora-primary">{spanish ? "Investigación destacada · estudio animal" : "Research spotlight · animal study"}</p>
        <h2 id="featured-study-heading" className="mt-3 font-display text-3xl">{read(medication.featuredStudy.title)}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{medication.featuredStudy.facts.map((fact) => <p key={fact.en} className="rounded-2xl bg-white p-5 font-display text-xl text-aeviora-primary">{read(fact)}</p>)}</div>
        <p className="mt-5 max-w-4xl text-lg leading-8">{read(medication.featuredStudy.finding)}</p>
        <div className="mt-2 flex flex-wrap gap-x-6"><SourceLink source={{ title: spanish ? "Estudio original · Cell 2024" : "Original study · Cell 2024", url: medication.featuredStudy.url }} /><SourceLink source={medication.featuredStudy.coverage} /></div>
      </section>}
      <section className="rounded-3xl bg-aeviora-primaryDark p-6 text-white sm:p-8" aria-labelledby="research-conclusion">
        <div className="flex items-center gap-3"><BookOpen aria-hidden="true" size={22} /><h2 id="research-conclusion" className="font-display text-2xl">{spanish ? "Qué podemos concluir" : "What we can conclude"}</h2></div>
        <p className="mt-4 max-w-4xl text-lg leading-8">{read(medication.conclusion)}</p>
      </section>
      <section aria-labelledby="research-studies">
        <h2 id="research-studies" className="font-display text-2xl">{spanish ? "Una mirada a la investigación" : "A closer look at the research"}</h2>
        <p className="mt-2 text-sm text-aeviora-slate">{spanish ? "Estudios seleccionados; no es una revisión exhaustiva." : "Selected studies; not a comprehensive review."}</p>
        <div className="mt-5 grid gap-5">
          {medication.studies.map((study) => <article key={study.url} className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-aeviora-primary">{read(study.design)}</p>
            <h3 className="mt-2 font-display text-xl">{study.title}</h3>
            <p className="mt-3 text-base leading-7">{read(study.finding)}</p>
            <p className="mt-4 border-l-2 border-aeviora-gold pl-4 text-sm leading-7 text-aeviora-slate"><strong>{spanish ? "Límites: " : "Limitations: "}</strong>{read(study.limitation)}</p>
            <SourceLink source={{ title: spanish ? "Leer la fuente del estudio" : "Read the study source", url: study.url }} />
          </article>)}
        </div>
      </section>
      {medication.furtherReading && <section aria-labelledby="further-reading">
        <h2 id="further-reading" className="font-display text-2xl">{spanish ? "Lecturas complementarias" : "Further reading"}</h2>
        <p className="mt-2 text-sm text-aeviora-slate">{spanish ? "Artículos explicativos para contexto; los estudios originales están enlazados arriba." : "Background explainers for context; original studies are linked above."}</p>
        <div className="mt-2 grid gap-2">{medication.furtherReading.map((source) => <SourceLink key={source.url} source={source} />)}</div>
      </section>}
      <section className="space-y-5 border-t border-aeviora-border pt-6 text-sm leading-6 text-aeviora-slate" aria-labelledby="regulatory-heading">
        <div>
          <h2 id="regulatory-heading" className="font-semibold text-aeviora-charcoal">{medication.regulatoryType === "offLabel" ? (spanish ? "FDA y uso fuera de indicación (off-label)" : "FDA status and off-label use") : (spanish ? "Situación ante la FDA: producto no aprobado" : "FDA status: unapproved product")}</h2>
          <p className="mt-2">{read(medication.regulatory)}</p>
          <SourceLink compact source={regulatorySources[medication.regulatoryType]} />
        </div>
        <div>
          <h2 id="safety-heading" className="font-semibold text-aeviora-charcoal">{spanish ? "Seguridad y conversación clínica" : "Safety and your clinical conversation"}</h2>
          <p className="mt-2">{read(medication.safety)}</p>
          <SourceLink compact source={medication.safetySource} />
        </div>
        <p className="text-xs leading-5">{spanish ? "Información educativa. Cualquier tratamiento requiere evaluación individual por un profesional autorizado." : "Educational information. Any treatment requires an individual evaluation by a licensed clinician."}</p>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-aeviora-border pt-5 text-sm">
        <p className="text-aeviora-slate">{spanish ? "Fuentes revisadas: " : "Sources reviewed: "}{medication.reviewedAt || researchReviewedAt}</p>
        <a href={`tel:${company.telephone.replace(/[^+\d]/g, "")}`} className="btn-outline">{spanish ? "Hablar con Aeviora" : "Talk with Aeviora"}</a>
      </footer>
    </> : topic ? <>
      <TherapyTopicOverview topicId={topic.id} language={language} />
      <h2 className="mb-4 font-display text-2xl text-aeviora-primary">{spanish ? "Guías de medicamentos e investigación" : "Medication and research guides"}</h2>
      {medications.length ? <div className="grid gap-4 sm:grid-cols-2">{medications.map((item, index) => <Link key={item.id} to={`/therapies/${topic.id}/${item.id}`} className="group card transition hover:border-aeviora-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aeviora-primary">
        <div className="flex items-center justify-between text-aeviora-gold"><span className="text-xs font-semibold tracking-widest">0{index + 1}</span><ArrowRight aria-hidden="true" size={20} /></div>
        <h3 className="mt-5 font-display text-2xl text-aeviora-primary">{item.name}</h3>
        <p className="mt-2 text-sm leading-6 text-aeviora-slate">{read(item.category)}</p>
        <p className="mt-4 text-xs font-semibold text-amber-900">{item.regulatoryType === "offLabel" ? (spanish ? "Uso off-label para longevidad" : "Off-label for longevity") : (spanish ? "No aprobado por la FDA para longevidad" : "Not FDA-approved for longevity")}</p>
        <span className="mt-5 inline-block text-sm font-semibold text-aeviora-primary underline underline-offset-4">{spanish ? "Explorar la investigación" : "Explore the research"}</span>
      </Link>)}</div> : <div className="card"><h3 className="font-display text-xl">{spanish ? "Aún no hay guías de medicamentos para este tema" : "No medication guides for this topic yet"}</h3><p className="mt-3 text-sm leading-7 text-aeviora-slate">{spanish ? "Puedes usar el resumen anterior para preparar tus preguntas para la consulta." : "Use the overview above to prepare questions for your consultation."}</p><Link to="/therapies" className="mt-5 inline-block font-semibold text-aeviora-primary underline">{spanish ? "Explorar otros temas" : "Explore other topics"}</Link></div>}
      <p className="mt-5 text-sm leading-6 text-aeviora-slate">{spanish ? "Estas opciones se presentan para educación, no como tratamientos probados para prolongar la vida. Su inclusión no confirma disponibilidad ni idoneidad para ti." : "These options are presented for education, not as proven treatments to extend life. Inclusion does not confirm availability or suitability for you."}</p>
    </> : <div className="grid gap-3 sm:grid-cols-2">{protocols.map((item) => <Link key={item.id} to={`/therapies/${item.id}`} className="flex items-center gap-4 rounded-2xl border border-aeviora-border bg-white p-5 transition hover:border-aeviora-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeviora-primary"><span className="text-aeviora-primary" aria-hidden="true">{item.icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{t(item.name)}</span><span className="mt-1 block text-xs text-aeviora-slate">{therapyMedications[item.id]?.length ? (spanish ? "4 guías de investigación" : "4 research guides") : (spanish ? "Resumen del tema" : "Topic overview")}</span></span><ArrowRight size={17} aria-hidden="true" /></Link>)}</div>}
  </section>;
}
