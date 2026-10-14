import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";

export default function DiscountEditor({ value, onChange }) {
  useLanguage();
  const [catalogs, setCatalogs] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState({});
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["laboratoryFees", "diagnosticFees"].map(async (source) => [source,
      (await apiRequest(`/api/admin/fees/${source}`, { signal: controller.signal })).fees]))
      .then((entries) => setCatalogs(Object.fromEntries(entries)))
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [reload]);
  return <div className="space-y-4">
    <label className="label" htmlFor="discount-percent">{t("Discount percentage")}</label>
    <input id="discount-percent" className="input" type="number" min="0.01" max="100" step="0.01" required value={value.percent} onChange={(event) => onChange({ ...value, percent: event.target.value })} />
    <p className="text-sm">{t("Select eligible services, or include all except exclusions. All-except includes future services. Rules cover all providers of each eligible service.")}</p>
    {error && <p role="alert">{t(error)} <button type="button" onClick={() => { setError(""); setReload((key) => key + 1); }}>{t("Retry")}</button></p>}
    {!catalogs && !error && <p role="status">{t("Loading services…")}</p>}
    {[["laboratoryFees", "Laboratory services"], ["diagnosticFees", "Diagnostic services"]].map(([source, label]) => {
      const rule = value[source];
      const entries = catalogs?.[source] || [];
      const filtered = entries.filter((fee) => `${fee.name || fee.description || fee.order} ${fee.billCode || ""}`.toLowerCase().includes((search[source] || "").toLowerCase()));
      return <fieldset key={source} className="min-w-0 space-y-3 rounded-xl border p-4">
        <legend className="font-semibold">{t(label)}</legend>
        <label className="label" htmlFor={`${source}-mode`}>{t("Eligibility")}</label>
        <select id={`${source}-mode`} className="input" value={rule.mode} onChange={(event) => onChange({ ...value, [source]: { mode: event.target.value, feeIds: [] } })}>
          <option value="selected">{t("Only selected services")}</option><option value="allExcept">{t("All except selected exclusions")}</option>
        </select>
        <p className="text-sm">{t(rule.mode === "allExcept" ? "Excluded" : "Included")}: {t(rule.feeIds.length)}</p>
        <label className="label" htmlFor={`${source}-search`}>{t("Search ")}{t(label.toLowerCase())}</label>
        <input id={`${source}-search`} type="search" className="input" value={search[source] || ""} onChange={(event) => setSearch({ ...search, [source]: event.target.value })} />
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {filtered.map((fee) => <label key={fee._id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={rule.feeIds.includes(fee._id)} onChange={(event) => onChange({ ...value, [source]: { ...rule,
              feeIds: event.target.checked ? [...rule.feeIds, fee._id] : rule.feeIds.filter((id) => id !== fee._id) } })} />
            <span>{t(rule.mode === "allExcept" ? "Exclude: " : "Include: ")}{fee.name || fee.description || fee.order}{t(fee.billCode ? ` (${fee.billCode})` : "")}</span>
          </label>)}
        </div>
        {catalogs && !filtered.length && <p>{t("No matching services.")}</p>}
        {rule.feeIds.filter((id) => catalogs && !entries.some((fee) => fee._id === id)).map((id) => <p key={id}>{t("Unavailable service: ")}{t(id)} <button type="button" onClick={() => onChange({ ...value, [source]: { ...rule, feeIds: rule.feeIds.filter((item) => item !== id) } })}>{t("Remove")}</button></p>)}
      </fieldset>;
    })}
  </div>;
}
