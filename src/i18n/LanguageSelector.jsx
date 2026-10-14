import { useEffect } from "react";
import { getLanguage, setLanguage, t } from "./language.js";
import { useLanguage } from "./useLanguage.js";

export default function LanguageSelector() {
  const language = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
    const handleStorage = (event) => {
      if (event.key === "aeviora.language") setLanguage(event.newValue === "es" ? "es" : "en");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [language]);
  return <div className="border-b border-aeviora-border bg-white px-4 py-2 text-right text-sm text-aeviora-charcoal">
    <label className="inline-flex flex-wrap items-center gap-2">
      <span>{t("Language")}</span>
      <select aria-label="Language / Idioma" className="rounded border border-aeviora-border bg-white px-3 py-2 text-aeviora-charcoal" value={getLanguage()} onChange={(event) => setLanguage(event.target.value)}>
        <option value="en" lang="en">English</option>
        <option value="es" lang="es">Español</option>
      </select>
    </label>
  </div>;
}
