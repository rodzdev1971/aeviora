import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";

export default function MembershipOptions() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/payments/memberships", { signal: controller.signal }).then(setData)
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [revision]);
  async function choose(planId) {
    setBusy(true); setError("");
    try {
      const result = await apiRequest(data.subscribed ? "/api/payments/billing-portal" : "/api/payments/checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }),
      });
      window.location.assign(result.url);
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  const money = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return <section className="card lg:col-span-2" aria-labelledby="membership-heading">
    <h2 id="membership-heading" className="font-display text-2xl">Your membership</h2>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {!data ? <p role="status">Loading memberships…</p> : <>
      <p className="mt-3 text-lg font-semibold">{data.current.name}</p>
      <p className="mt-1 text-sm">{data.current.status === "free" ? "Free account — $0.00. Choose a plan below for membership benefits." : `Subscription status: ${data.current.status}`}</p>
      <button type="button" disabled={busy} className="mt-3 text-sm underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Refresh membership status</button>
      {data.subscribed && <button type="button" disabled={busy} onClick={() => choose(null)} className="btn-secondary mt-4 ml-3">Manage current membership</button>}
      <h3 className="mt-7 font-display text-xl">Membership options</h3>
      <p className="mt-2 text-sm text-aeviora-slate">Review monthly pricing and benefits. New memberships begin after secure checkout is confirmed. Benefit service prices are separate from the monthly membership fee.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{data.plans.map((plan) => <article key={plan._id} className="flex flex-col border border-aeviora-border p-5">
        <h4 className="font-display text-xl">{plan.name}</h4><p className="mt-2 font-semibold">{money(plan.price)} / month</p>
        <ul className="my-4 flex-1 space-y-2 text-sm">{plan.benefits.map((benefit) => <li key={benefit.benefitId}>{benefit.name}{benefit.pricingType === "discount" ? " — eligible service discounts; exclusions apply" : ` — ${money(benefit.price)}`}</li>)}</ul>
        {data.current.planId === plan._id ? <p className="font-semibold text-aeviora-primary">Current membership</p> : !data.subscribed && <button type="button" disabled={busy} onClick={() => choose(plan._id)} className="btn-primary disabled:opacity-50">{busy ? "Opening checkout…" : `Choose ${plan.name}`}</button>}
      </article>)}</div>
      {data.plans.length === 0 && <p className="mt-4">Membership options will appear here when available.</p>}
      {data.subscribed && <p className="mt-4 text-sm">For a plan change, use billing management or contact our team. Canceling takes effect according to your billing terms.</p>}
    </>}
  </section>;
}
