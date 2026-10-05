import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";

export default function DiscountEditor({ value, onChange }) {
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
    <label className="label" htmlFor="discount-percent">Discount percentage</label>
    <input id="discount-percent" className="input" type="number" min="0.01" max="100" step="0.01" required value={value.percent} onChange={(event) => onChange({ ...value, percent: event.target.value })} />
    <p className="text-sm">Select eligible services, or include all except exclusions. All-except includes future services. Rules cover all providers of each eligible service.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => { setError(""); setReload((key) => key + 1); }}>Retry</button></p>}
    {!catalogs && !error && <p role="status">Loading services…</p>}
    {[["laboratoryFees", "Laboratory services"], ["diagnosticFees", "Diagnostic services"]].map(([source, label]) => {
      const rule = value[source];
      const entries = catalogs?.[source] || [];
      const filtered = entries.filter((fee) => `${fee.name || fee.description || fee.order} ${fee.billCode || ""}`.toLowerCase().includes((search[source] || "").toLowerCase()));
      return <fieldset key={source} className="min-w-0 space-y-3 rounded-xl border p-4">
        <legend className="font-semibold">{label}</legend>
        <label className="label" htmlFor={`${source}-mode`}>Eligibility</label>
        <select id={`${source}-mode`} className="input" value={rule.mode} onChange={(event) => onChange({ ...value, [source]: { mode: event.target.value, feeIds: [] } })}>
          <option value="selected">Only selected services</option><option value="allExcept">All except selected exclusions</option>
        </select>
        <p className="text-sm">{rule.mode === "allExcept" ? "Excluded" : "Included"}: {rule.feeIds.length}</p>
        <label className="label" htmlFor={`${source}-search`}>Search {label.toLowerCase()}</label>
        <input id={`${source}-search`} type="search" className="input" value={search[source] || ""} onChange={(event) => setSearch({ ...search, [source]: event.target.value })} />
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {filtered.map((fee) => <label key={fee._id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={rule.feeIds.includes(fee._id)} onChange={(event) => onChange({ ...value, [source]: { ...rule,
              feeIds: event.target.checked ? [...rule.feeIds, fee._id] : rule.feeIds.filter((id) => id !== fee._id) } })} />
            <span>{rule.mode === "allExcept" ? "Exclude: " : "Include: "}{fee.name || fee.description || fee.order}{fee.billCode ? ` (${fee.billCode})` : ""}</span>
          </label>)}
        </div>
        {catalogs && !filtered.length && <p>No matching services.</p>}
        {rule.feeIds.filter((id) => catalogs && !entries.some((fee) => fee._id === id)).map((id) => <p key={id}>Unavailable service: {id} <button type="button" onClick={() => onChange({ ...value, [source]: { ...rule, feeIds: rule.feeIds.filter((item) => item !== id) } })}>Remove</button></p>)}
      </fieldset>;
    })}
  </div>;
}
