import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";

import { discountText } from "../../shared/discounts.js";

const discountsFor = (benefit) => benefit.discounts || (benefit.services || []).filter((service) => service.pricingType === "discount").map((service) => service.discount);
const benefitLabel = (benefit) => benefit.pricingType === "discount" ? discountsFor(benefit).map(discountText).join("; ") : money(benefit.price);
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const emptyForm = () => ({ name: "", price: "", selectedBenefits: [], overrides: {} });

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [benefitToAdd, setBenefitToAdd] = useState("");
  const availableBenefits = benefits.filter((benefit) => !form.selectedBenefits.some((selected) => selected._id === benefit._id));
  const hasUnavailableBenefit = form.selectedBenefits.some((selected) => !benefits.some((benefit) => benefit._id === selected._id));

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/admin/memberships", { signal: controller.signal }).then((data) => {
      setMemberships(data.memberships); setBenefits(data.benefits); setLoading(false); setLoaded(true);
    }).catch((failure) => {
      if (!controller.signal.aborted) { setError(failure.message); setLoading(false); }
    });
    return () => controller.abort();
  }, [reload]);

  function reset() { setForm(emptyForm()); setEditingId(""); setBenefitToAdd(""); }
  function edit(plan) {
    setEditingId(plan._id);
    setBenefitToAdd("");
    setForm({ name: plan.name, price: String(plan.price),
      selectedBenefits: plan.benefits.map((benefit) => ({ _id: benefit.benefitId, name: benefit.name, price: benefit.standardPrice, pricingType: benefit.pricingType, discounts: benefit.discounts })),
      overrides: Object.fromEntries(
      plan.benefits.filter((benefit) => benefit.customPrice).map((benefit) => [benefit.benefitId, String(benefit.price)]),
    ) });
    setError(""); setMessage(""); document.getElementById("membership-name")?.focus();
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const { membership } = await apiRequest(`/api/admin/memberships${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, price: Number(form.price), benefits: form.selectedBenefits.map((benefit) => ({
          benefitId: benefit._id, price: benefits.find((item) => item._id === benefit._id)?.pricingType === "discount" || form.overrides[benefit._id] == null ? null : Number(form.overrides[benefit._id]),
        })) }),
      });
      setMemberships((current) => (editingId ? current.map((plan) => plan._id === editingId ? membership : plan) : [...current, membership])
        .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)));
      setMessage(editingId ? "Membership updated." : "Membership created."); reset();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove(plan) {
    if (!window.confirm(`Delete the ${plan.name} membership plan? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/admin/memberships/${plan._id}`, { method: "DELETE" });
      setMemberships((current) => current.filter((item) => item._id !== plan._id));
      if (editingId === plan._id) reset();
      setMessage("Membership deleted.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="border-b border-aeviora-border pb-5">
        <Link to="/admin" className="text-sm text-aeviora-primary underline">Account overview</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-aeviora-gold">Administration</p>
        <h1 className="mt-2 font-display text-3xl">Membership plans</h1>
        <p className="mt-2 text-sm text-aeviora-slate">Set monthly membership fees and benefit prices for each plan. All prices are in USD.</p>
      </header>
      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 p-4 text-red-800">{error}</p>}
      {message && <p role="status" className="border-l-4 border-green-700 bg-green-50 p-4 text-green-900">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || loading} className="btn-secondary disabled:opacity-50" onClick={() => {
          setLoading(true); setLoaded(false); setError(""); setReload((value) => value + 1);
        }}>Refresh plans and benefits</button>
        <Link to="/admin/benefits" className="btn-outline">Manage benefit catalog</Link>
      </div>
      {loading && <p role="status">Loading membership plans…</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {memberships.map((plan) => <article className="card min-w-0 space-y-4" key={plan._id}>
          <h2 className="break-words font-display text-2xl">{plan.name}</h2>
          <p><strong className="text-2xl">{money(plan.price)}</strong><span className="text-sm text-aeviora-slate"> / month</span></p>
          <p className="text-sm text-aeviora-slate">{plan.benefits.length} saved benefits</p>
          <details><summary className="cursor-pointer text-sm font-semibold">View benefit prices</summary>
            <ul className="mt-3 space-y-2 text-sm">{plan.benefits.map((benefit) => <li className="break-words" key={benefit.benefitId}>
              {benefit.name}: {benefitLabel(benefit)}{benefit.pricingType !== "discount" && (benefit.customPrice ? " (adjusted)" : " (standard)")}
              {benefit.pricingType !== "discount" && discountsFor(benefit).map((discount, index) => <span key={index} className="block">{discountText(discount)}</span>)}
            </li>)}</ul>
          </details>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy || loading || !loaded} className="btn-secondary disabled:opacity-50" onClick={() => edit(plan)}>Edit {plan.name}</button>
            <button type="button" disabled={busy || loading} className="text-sm font-semibold text-red-700 underline disabled:opacity-50" onClick={() => remove(plan)}>Delete</button>
          </div>
        </article>)}
      </div>
      {!loading && loaded && !memberships.length && <p>No membership plans yet. Add one below.</p>}
      <form onSubmit={save} className="card">
        <fieldset disabled={busy || loading || !loaded} className="min-w-0 space-y-5 disabled:opacity-60">
          <legend className="mb-4 font-display text-2xl">{editingId ? `Edit ${form.name || "membership"}` : "New membership"}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="membership-name" className="label">Membership name</label>
              <input id="membership-name" required maxLength={100} className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div><label htmlFor="membership-price" className="label">Monthly membership price ($)</label>
              <input id="membership-price" required type="number" min="0" max="100000000" step="0.01" className="input" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div>
          </div>
          <div className="space-y-4 border-t border-aeviora-border pt-5">
            <h2 className="font-semibold">Benefit prices for this membership</h2>
            <p className="text-sm text-aeviora-slate">Choose benefits one at a time and add them to this membership. Use the standard price or set an adjusted price. Enter $0 for no additional charge. These prices do not change the monthly membership fee.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1"><label htmlFor="membership-benefit" className="label">Benefit to add</label>
                <select id="membership-benefit" className="input" value={benefitToAdd} onChange={(event) => setBenefitToAdd(event.target.value)}>
                  <option value="">Select a benefit</option>
                  {availableBenefits.map((benefit) => <option key={benefit._id} value={benefit._id}>{benefit.name} — {benefitLabel(benefit)}</option>)}
                </select>
              </div>
              <button type="button" className="btn-secondary disabled:opacity-50" disabled={!availableBenefits.some((benefit) => benefit._id === benefitToAdd)} onClick={() => {
                const benefit = availableBenefits.find((item) => item._id === benefitToAdd);
                if (benefit) setForm({ ...form, selectedBenefits: [...form.selectedBenefits, benefit] });
                setBenefitToAdd("");
              }}>Add benefit</button>
            </div>
            <h3 className="font-semibold">Selected benefits ({form.selectedBenefits.length})</h3>
            {!form.selectedBenefits.length && <p className="text-sm text-aeviora-slate">No benefits selected. Choose a benefit above and click Add benefit.</p>}
            {benefits.length > 0 && !availableBenefits.length && <p className="text-sm text-aeviora-slate">All available benefits have been selected.</p>}
            {!benefits.length && <p className="rounded-xl bg-aeviora-cream p-4 text-sm">No benefits yet. You can save the plan now, add benefits in the Benefits manager, then edit this plan to set their prices.</p>}
            {form.selectedBenefits.map((selected) => {
              const currentBenefit = benefits.find((item) => item._id === selected._id);
              const benefit = currentBenefit || selected;
              const custom = form.overrides[benefit._id] != null;
              return <div key={benefit._id} className="grid min-w-0 gap-4 rounded-xl border border-aeviora-border p-4 sm:grid-cols-2">
                <div className="min-w-0"><h3 className="break-words font-semibold">{benefit.name}</h3>
                  <p className="mt-1 break-words text-sm text-aeviora-slate">{benefit.description}</p>
                  <p className="mt-2 text-sm">{benefit.pricingType === "discount" ? "Discount prices" : `Standard price: ${money(benefit.price)}`}</p>
                  {discountsFor(benefit).map((discount, index) => <p key={index} className="mt-2 text-sm">{discountText(discount)}</p>)}
                  {!currentBenefit && <p className="mt-2 text-sm text-red-700">This benefit is no longer available. Remove it before saving.</p>}
                  <button type="button" className="mt-3 text-sm font-semibold text-red-700 underline" aria-label={`Remove ${benefit.name} from membership`} onClick={() => {
                    const overrides = { ...form.overrides };
                    delete overrides[benefit._id];
                    setForm({ ...form, overrides, selectedBenefits: form.selectedBenefits.filter((item) => item._id !== benefit._id) });
                  }}>Remove benefit</button></div>
                {benefit.pricingType !== "discount" && <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={custom} onChange={(event) => {
                    const overrides = { ...form.overrides };
                    if (event.target.checked) overrides[benefit._id] = String(benefit.price);
                    else delete overrides[benefit._id];
                    setForm({ ...form, overrides });
                  }} />Adjust price for {benefit.name}</label>
                  <label htmlFor={`benefit-${benefit._id}`} className="label">Member price for {benefit.name} ($)</label>
                  <input id={`benefit-${benefit._id}`} className="input" type="number" min="0" max="100000000" step="0.01" required readOnly={!custom}
                    value={custom ? form.overrides[benefit._id] : benefit.price} onChange={(event) => setForm({ ...form, overrides: { ...form.overrides, [benefit._id]: event.target.value } })} />
                </div>}
              </div>;
            })}
          </div>
          <p className="text-sm text-aeviora-slate">Only selected benefits are saved. Adjusted prices remain specific to this plan.</p>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={hasUnavailableBenefit} className="btn-primary disabled:opacity-50">{busy ? "Saving…" : editingId ? "Save membership" : "Create membership"}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={reset}>Cancel editing</button>}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
