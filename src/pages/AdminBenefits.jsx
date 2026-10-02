import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const emptyForm = () => ({ name: "", description: "", price: "", services: [] });
const optionKey = (option) => JSON.stringify([option.source, option.feeId, option.provider, option.amount]);

export default function AdminBenefits() {
  const [benefits, setBenefits] = useState([]);
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiRequest("/api/admin/benefits", { signal: controller.signal }),
      apiRequest("/api/admin/benefits/fee-options", { signal: controller.signal }),
    ]).then(([saved, catalog]) => {
      setBenefits(saved.benefits);
      setOptions(catalog.options);
      setLoading(false);
    }).catch((failure) => {
      if (!controller.signal.aborted) { setError(failure.message); setLoading(false); }
    });
    return () => controller.abort();
  }, [reload]);

  const filtered = options.filter((option) => (source === "all" || option.source === source) &&
    `${option.name} ${option.provider} ${option.billCode}`.toLowerCase().includes(search.toLowerCase()));
  const chosen = filtered.find((option) => optionKey(option) === selected);
  const cost = form.services.reduce((sum, service) => sum + Math.round(service.amount * 100), 0) / 100;
  const unavailable = form.services.some((service) => !options.some((option) => optionKey(option) === optionKey(service)));

  function reset() {
    setForm(emptyForm()); setEditingId(""); setSelected(""); setSearch(""); setSource("all");
  }
  function edit(benefit) {
    setEditingId(benefit._id);
    setForm({ name: benefit.name, description: benefit.description, price: String(benefit.price),
      services: benefit.services.map((service) => ({ ...service, provider: service.lab || service.diagnostic_center })) });
    setMessage(""); setError("");
    document.getElementById("benefit-name")?.focus();
  }
  async function save(event) {
    event.preventDefault();
    if (!form.services.length || unavailable) { setError("Add at least one current catalog service before saving."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { benefit } = await apiRequest(`/api/admin/benefits${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description, price: Number(form.price),
          services: form.services.map(({ source, feeId, provider, amount }) => ({ source, feeId, provider, amount })) }),
      });
      setBenefits((current) => editingId ? current.map((item) => item._id === editingId ? benefit : item) : [benefit, ...current]);
      setMessage(editingId ? "Benefit updated." : "Benefit created."); reset();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove(benefit) {
    if (!window.confirm(`Delete benefit “${benefit.name}”? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/admin/benefits/${benefit._id}`, { method: "DELETE" });
      setBenefits((current) => current.filter((item) => item._id !== benefit._id));
      if (editingId === benefit._id) reset();
      setMessage("Benefit deleted.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="border-b border-aeviora-border pb-5">
        <Link to="/admin" className="text-sm text-aeviora-primary underline">Account overview</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">Administration</p>
        <h1 className="mt-2 font-display text-3xl">Aeviora benefits</h1>
        <p className="mt-2 text-sm text-aeviora-slate">Build benefits from laboratory and diagnostic services. All amounts are in USD.</p>
      </header>
      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 p-4 text-red-800">{error}</p>}
      {message && <p role="status" className="border-l-4 border-green-700 bg-green-50 p-4 text-green-900">{message}</p>}
      <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || loading} onClick={() => {
        setLoading(true); setError(""); setSelected(""); setReload((value) => value + 1);
      }}>Refresh benefits and fee catalog</button>
      {loading && <p role="status">Loading benefits and service fees…</p>}
      <form onSubmit={save} className="card">
        <fieldset disabled={busy || loading} className="min-w-0 space-y-5 disabled:opacity-60">
          <legend className="mb-4 font-display text-2xl">{editingId ? "Edit benefit" : "New benefit"}</legend>
          <div><label className="label" htmlFor="benefit-name">Benefit name</label>
            <input id="benefit-name" className="input" required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div><label className="label" htmlFor="benefit-description">Description</label>
            <textarea id="benefit-description" className="input" required maxLength={4000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="benefit-price">Selling price ($)</label>
              <input id="benefit-price" className="input" type="number" min="0" max="100000000" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div>
            <div><label className="label" htmlFor="benefit-cost">Calculated service cost</label>
              <output id="benefit-cost" className="input block bg-aeviora-cream" aria-live="polite">{money(cost)}</output></div>
          </div>
          <div className="space-y-4 border-t border-aeviora-border pt-5">
            <h2 className="font-semibold">Add services</h2>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div><label className="label" htmlFor="fee-type">Service type</label>
                <select id="fee-type" className="input" value={source} onChange={(event) => { setSource(event.target.value); setSelected(""); }}>
                  <option value="all">All services</option><option value="laboratoryFees">Laboratory</option><option value="diagnosticFees">Diagnostic</option>
                </select></div>
              <div><label className="label" htmlFor="fee-search">Search name, provider, or billing code</label>
                <input id="fee-search" className="input" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelected(""); }} /></div>
            </div>
            <div><label className="label" htmlFor="fee-option">Service, provider, and cost</label>
              <select id="fee-option" className="input" value={selected} onChange={(event) => setSelected(event.target.value)}>
                <option value="">Select a service ({filtered.length} options)</option>
                {filtered.map((option, index) => <option key={`${optionKey(option)}-${index}`} value={optionKey(option)}>
                  {option.name} — {option.provider} — {money(option.amount)}{option.billCode ? ` (${option.billCode})` : ""}
                </option>)}
              </select></div>
            {!filtered.length && !loading && <p className="text-sm text-aeviora-slate">No matching fees. Diagnostic services become available when diagnosticFees contains prices.</p>}
            {chosen && <p className="break-words text-sm">{chosen.name} · {chosen.provider} · {money(chosen.amount)}</p>}
            <button className="btn-secondary disabled:opacity-50" type="button" disabled={!chosen || form.services.length >= 200} onClick={() => {
              setForm({ ...form, services: [...form.services, chosen] }); setSelected("");
            }}>Add service</button>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Included services ({form.services.length}/200)</h2>
            {!form.services.length && <p className="text-sm text-aeviora-slate">Add at least one service. You can add more services whenever you edit this benefit.</p>}
            {form.services.map((service, index) => <div key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-aeviora-border p-3">
              <div className="min-w-0 flex-1 break-words"><p className="font-medium">{service.name}</p>
                <p className="text-sm text-aeviora-slate">{service.source === "laboratoryFees" ? "Lab" : "Diagnostic center"}: {service.provider} · {money(service.amount)}</p>
                {!options.some((option) => optionKey(option) === optionKey(service)) && !loading && <p className="text-sm text-red-700">Unavailable or price changed. Remove and select a current fee.</p>}
              </div>
              <button type="button" className="text-sm font-semibold text-red-700 underline" aria-label={`Remove service ${index + 1}: ${service.name}`} onClick={() => setForm({ ...form, services: form.services.filter((_, position) => position !== index) })}>Remove</button>
            </div>)}
          </div>
          <p className="text-sm text-aeviora-slate">Cost is the sum of included services. Current catalog amounts are verified when you save.</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary disabled:opacity-50" type="submit" disabled={!form.services.length || unavailable}>{busy ? "Saving…" : editingId ? "Save changes" : "Create benefit"}</button>
            {editingId && <button className="btn-secondary" type="button" onClick={reset}>Cancel editing</button>}
          </div>
        </fieldset>
      </form>
      <section aria-labelledby="saved-benefits" className="space-y-4">
        <h2 id="saved-benefits" className="font-display text-2xl">Saved benefits ({benefits.length})</h2>
        {!loading && !benefits.length && <p className="text-aeviora-slate">No benefits yet. Create your first benefit above.</p>}
        {benefits.map((benefit) => <article key={benefit._id} className="card space-y-3">
          <h3 className="break-words text-xl font-semibold">{benefit.name}</h3>
          <p className="whitespace-pre-wrap break-words text-sm text-aeviora-slate">{benefit.description}</p>
          <p className="text-sm">Cost: <strong>{money(benefit.cost)}</strong> · Price: <strong>{money(benefit.price)}</strong> · {benefit.services.length} services</p>
          <details><summary className="cursor-pointer text-sm font-semibold">View included services</summary>
            <ul className="mt-3 space-y-2 text-sm">{benefit.services.map((service, index) => <li className="break-words" key={index}>{service.name} · {service.lab || service.diagnostic_center} · {money(service.cost)}</li>)}</ul>
          </details>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || loading} onClick={() => edit(benefit)}>Edit / add services</button>
            <button type="button" className="px-3 text-sm font-semibold text-red-700 underline disabled:opacity-50" disabled={busy || loading} onClick={() => remove(benefit)}>Delete</button>
          </div>
        </article>)}
      </section>
    </section>
  );
}
