import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";
import { feeCatalogs } from "../../shared/feeCatalog.js";

const emptyForm = () => ({ name: "", billcode: "", description: "", retailPrice: "", prices: [{ provider: "", amount: "" }] });
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const numericValue = (value) => value?.$numberDecimal ?? value ?? "";

function FeeEditor({ source }) {
  const config = feeCatalogs[source];
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/fees/${source}`, { signal: controller.signal }).then((data) => {
      setFees(data.fees); setLoading(false);
    }).catch((failure) => {
      if (!controller.signal.aborted) { setError(failure.message); setLoading(false); }
    });
    return () => controller.abort();
  }, [source, reload]);

  const filtered = fees.filter((fee) => [fee.name, fee.description, fee.order, fee[config.billcode],
    ...(fee[config.prices] || []).map((row) => row?.[config.provider])].join(" ").toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  function reset() { setForm(emptyForm()); setEditingId(""); }
  function edit(fee) {
    setEditingId(fee._id);
    setForm({ name: fee.name || fee.description || fee.order || "", billcode: fee[config.billcode] || "",
      description: fee.description || "", retailPrice: String(numericValue(fee.retailPrice)),
      prices: (fee[config.prices] || []).map((row) => ({ provider: row?.[config.provider] || "", amount: String(numericValue(row?.amount)) })) });
    setError(""); setMessage(""); document.getElementById("fee-name")?.focus();
  }
  function updatePrice(index, field, value) {
    setForm({ ...form, prices: form.prices.map((row, position) => position === index ? { ...row, [field]: value } : row) });
  }
  async function save(event) {
    event.preventDefault();
    if (!form.prices.length) { setError("Add at least one provider price."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { fee } = await apiRequest(`/api/admin/fees/${source}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, [config.billcode]: form.billcode, description: form.description,
          retailPrice: Number(form.retailPrice), [config.prices]: form.prices.map((row) => ({ [config.provider]: row.provider, amount: Number(row.amount) })) }),
      });
      setFees((current) => editingId ? current.map((item) => item._id === editingId ? fee : item) : [fee, ...current]);
      setMessage(editingId ? "Fee and provider prices updated." : "Fee created with all provider prices."); reset();
    } catch (failure) {
      const detail = Array.isArray(failure.fields) ? failure.fields.map((field) => field.message).join(" ") : "";
      setError(detail || failure.message);
    } finally { setBusy(false); }
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="border-l-4 border-green-700 bg-green-50 p-4 text-green-900">{message}</p>}
    <form onSubmit={save} className="card">
      <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-60">
        <legend className="mb-4 font-display text-2xl">{editingId ? "Edit fee" : "New fee"} · {config.label}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="fee-name">Name</label><input id="fee-name" className="input" required maxLength={300} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div><label className="label" htmlFor="fee-code">Billing code (optional)</label><input id="fee-code" className="input" maxLength={100} value={form.billcode} onChange={(event) => setForm({ ...form, billcode: event.target.value })} /></div>
        </div>
        <div><label className="label" htmlFor="fee-description">Description</label><textarea id="fee-description" className="input" required maxLength={4000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        <div><label className="label" htmlFor="retail-price">Retail price ($)</label><input id="retail-price" type="number" className="input" required min="0" max="100000000" step="0.01" value={form.retailPrice} onChange={(event) => setForm({ ...form, retailPrice: event.target.value })} /></div>
        <div className="space-y-4 border-t border-aeviora-border pt-5">
          <h2 className="font-semibold">Provider prices ({form.prices.length}/200)</h2>
          <p className="text-sm text-aeviora-slate">Add one row for each provider and their cost. Retail price is separate from provider costs. All amounts are in USD.</p>
          {form.prices.map((row, index) => <div key={index} className="grid gap-3 rounded-xl border border-aeviora-border p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div><label className="label" htmlFor={`provider-${index}`}>{config.providerLabel} {index + 1}</label><input id={`provider-${index}`} className="input" required maxLength={300} value={row.provider} onChange={(event) => updatePrice(index, "provider", event.target.value)} /></div>
            <div><label className="label" htmlFor={`amount-${index}`}>Amount {index + 1} ($)</label><input id={`amount-${index}`} className="input" required type="number" min="0" max="100000000" step="0.01" value={row.amount} onChange={(event) => updatePrice(index, "amount", event.target.value)} /></div>
            <button type="button" className="py-3 text-sm font-semibold text-red-700 underline disabled:opacity-50" disabled={form.prices.length <= 1} aria-label={`Remove provider ${index + 1}`} onClick={() => setForm({ ...form, prices: form.prices.filter((_, position) => position !== index) })}>Remove</button>
          </div>)}
          <button type="button" className="btn-secondary disabled:opacity-50" disabled={form.prices.length >= 200} onClick={() => setForm({ ...form, prices: [...form.prices, { provider: "", amount: "" }] })}>Add provider price</button>
        </div>
        <div className="flex flex-wrap gap-3"><button type="submit" className="btn-primary">{busy ? "Saving…" : editingId ? "Save fee" : "Create fee"}</button>
          {editingId && <button type="button" className="btn-secondary" onClick={reset}>Cancel editing</button>}</div>
      </fieldset>
    </form>
    <section className="space-y-4" aria-labelledby="saved-fees">
      <h2 id="saved-fees" className="font-display text-2xl">Saved {config.label.toLowerCase()}</h2>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label className="label" htmlFor="fee-search">Search name, code, or provider</label><input id="fee-search" className="input" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
        <button type="button" className="btn-secondary disabled:opacity-50" disabled={loading || busy} onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }}>Refresh fees</button></div>
      {loading ? <p role="status">Loading fees…</p> : <>
        <p className="text-sm text-aeviora-slate">{filtered.length} matching fees</p>
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map((fee) => <article key={fee._id} className="card min-w-0 space-y-3">
          <h3 className="break-words text-lg font-semibold">{fee.name || fee.description || fee.order}</h3>
          <p className="break-words text-sm text-aeviora-slate">{fee.description}</p>
          <p className="text-sm">Code: {fee[config.billcode] || "—"} · Retail: {money(numericValue(fee.retailPrice))}</p>
          <ul className="space-y-1 text-sm">{(fee[config.prices] || []).map((row, index) => <li key={index} className="break-words">{row?.[config.provider]}: {money(numericValue(row?.amount))}</li>)}</ul>
          <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => edit(fee)}>Edit / add provider prices</button>
        </article>)}
        {!filtered.length && <p>No matching fees. Add an entry above or change your search.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Page {currentPage} of {pages}</span><div className="flex gap-2">
          <button type="button" className="btn-secondary disabled:opacity-50" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <button type="button" className="btn-secondary disabled:opacity-50" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div></div>
      </>}
    </section>
  </div>;
}

export default function AdminFees() {
  const [source, setSource] = useState("laboratoryFees");
  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="border-b border-aeviora-border pb-5">
      <Link to="/admin" className="text-sm text-aeviora-primary underline">Account overview</Link>
      <h1 className="mt-4 font-display text-3xl">Fee catalogs</h1>
      <p className="mt-2 text-sm text-aeviora-slate">Manage laboratory, diagnostic, and service fees with separate prices for every provider.</p>
      <Link to="/admin/benefits" className="mt-3 inline-block text-sm text-aeviora-primary underline">Build benefits from these fees</Link>
    </header>
    <div><label className="label" htmlFor="catalog">Fee catalog</label><select id="catalog" className="input" value={source} onChange={(event) => {
      if (window.confirm("Switch fee catalogs? Unsaved form changes will be discarded.")) setSource(event.target.value);
    }}>{Object.entries(feeCatalogs).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}</select></div>
    <FeeEditor key={source} source={source} />
  </section>;
}
