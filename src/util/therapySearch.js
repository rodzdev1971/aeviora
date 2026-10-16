import { therapyMedications } from "./therapyResearch.js";
import { translate } from "../i18n/language.js";

const normalize = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function searchTherapies(query, topics) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = (fields) => {
    const text = fields.filter(Boolean).map(normalize).join(" ");
    const compact = text.replaceAll(" ", "");
    return terms.length > 0 && terms.every((term) => text.includes(term) || compact.includes(term));
  };
  const topicNames = (topic) => [topic.name, translate(topic.name, "es")];
  return {
    topics: topics.filter((topic) => matches([...topicNames(topic), topic.id, topic.description, translate(topic.description, "es")])),
    medications: topics.flatMap((topic) => (therapyMedications[topic.id] || [])
      .filter((medication) => matches([medication.name, medication.id, ...(medication.aliases || []), medication.category.en, medication.category.es, ...topicNames(topic)]))
      .map((medication) => ({ medication, topic }))),
  };
}
