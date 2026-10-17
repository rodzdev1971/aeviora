import { ExternalLink } from "lucide-react";
import { therapyTopics, topicReviewedAt } from "../util/therapyTopics.js";

export default function TherapyTopicOverview({ topicId, language }) {
  const content = therapyTopics[topicId];
  if (!content) return null;
  const spanish = language === "es";
  const read = (value) => value[spanish ? "es" : "en"];
  const sections = [
    ["symptoms", spanish ? "Síntomas y motivos de consulta" : "Symptoms and concerns"],
    ["help", spanish ? "Cómo puede ayudar la atención" : "How care may help"],
    ["quality", spanish ? "Calidad de vida y metas diarias" : "Quality of life and everyday goals"],
  ];

  return <section aria-labelledby="topic-background-heading" className="mb-8 space-y-5">
    <div className="rounded-3xl border border-aeviora-border bg-aeviora-softSage/30 p-5 sm:p-7">
      <h2 id="topic-background-heading" className="font-display text-2xl text-aeviora-primary">{spanish ? "Comprender este tema" : "Understanding this topic"}</h2>
      <p className="mt-3 max-w-4xl text-base leading-7 text-aeviora-charcoal">{read(content.background)}</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {sections.map(([key, title]) => <article key={key} className="card min-w-0">
        <h3 className="font-display text-xl text-aeviora-primary">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-aeviora-slate">{read(content[key])}</p>
      </article>)}
    </div>
    <div className="rounded-2xl border border-aeviora-border p-5 text-sm leading-7 text-aeviora-slate">
      <h3 className="font-semibold text-aeviora-primary">{spanish ? "Qué conversar con tu profesional" : "What to discuss with your clinician"}</h3>
      <p className="mt-2">{read(content.evaluation)}</p>
      <p className="mt-3 text-xs leading-6">{spanish ? "Información educativa; no diagnostica síntomas ni sustituye una evaluación individual. Los beneficios dependen de la condición y el tratamiento." : "Educational information; this does not diagnose symptoms or replace an individual assessment. Benefits depend on the condition and treatment."}</p>
    </div>
    <details className="rounded-2xl border border-aeviora-border bg-white p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-aeviora-primary">{spanish ? "Fuentes y lecturas" : "Sources and further reading"}</summary>
      <ul className="mt-3 space-y-3">{content.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-2 text-aeviora-primary underline underline-offset-4"><span className="min-w-0 break-words">{source.title}</span><ExternalLink size={14} aria-hidden="true" className="mt-1 shrink-0" /></a></li>)}</ul>
      <p className="mt-4 text-xs text-aeviora-slate">{spanish ? "Fuentes revisadas: " : "Sources reviewed: "}{topicReviewedAt}</p>
    </details>
  </section>;
}
