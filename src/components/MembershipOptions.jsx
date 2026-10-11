import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";
import { CheckCircle2 } from "lucide-react";
import { discountText } from "../../shared/discounts.js";

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
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.plans.map((plan) => <article key={plan._id} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-white ${data.current.planId === plan._id ? "border-aeviora-primary" : "border-aeviora-border"}`}>
        <div className="border-b border-aeviora-border bg-aeviora-ivory p-5">
          <h4 className="break-words font-display text-2xl text-aeviora-primaryDark">{plan.name}</h4>
          <p className="mt-3 text-3xl font-bold text-aeviora-primaryDark">{plan.price === 0 ? "Free" : money(plan.price)}{plan.price !== 0 && <span className="text-sm font-normal text-aeviora-slate"> / month</span>}</p>
          <p className="mt-2 text-sm text-aeviora-slate">{plan.price === 0 ? "No monthly membership fee" : "Monthly membership fee"}</p>
        </div>
        <div className="flex flex-1 flex-col p-5">
        <h5 className="text-lg font-semibold text-aeviora-charcoal">Your plan benefits</h5>
        <ul className="my-4 flex-1 space-y-4">{plan.benefits.map((benefit) => <li key={benefit.benefitId} className="flex items-start gap-3 rounded-xl bg-aeviora-cream p-3">
          <CheckCircle2 size={20} aria-hidden="true" className="mt-1 shrink-0 text-aeviora-primary" />
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-aeviora-charcoal">{benefit.name}</p>
            <p className="mt-2 text-lg font-bold text-aeviora-primary">{benefit.pricingType === "discount" ? (benefit.discountPercent != null ? `${benefit.discountPercent}% off` : "Member discount") : benefit.price === 0 ? "Free" : money(benefit.price)}</p>
            <p className="mt-1 text-xs leading-5 text-aeviora-slate">{benefit.pricingType === "discount" ? "On eligible services; exclusions apply." : benefit.price === 0 ? "Included with this membership at no additional charge." : "Member price for this benefit; separate from the membership fee."}</p>
            {(benefit.discounts || []).map((discount, index) => <p key={index} className="mt-2 text-sm font-medium text-aeviora-primary">{discountText(discount)}</p>)}
          </div>
        </li>)}</ul>
        {!plan.benefits.length && <p className="mb-5 text-sm text-aeviora-slate">No benefits listed yet. Contact us for plan details.</p>}
        {data.current.planId === plan._id ? <p className="font-semibold text-aeviora-primary">Current membership</p> : !data.subscribed && <button type="button" disabled={busy} onClick={() => choose(plan._id)} className="btn-primary disabled:opacity-50">{busy ? "Opening checkout…" : `Choose ${plan.name}`}</button>}
        </div>
      </article>)}</div>
      {data.plans.length === 0 && <p className="mt-4">Membership options will appear here when available.</p>}
      {data.subscribed && <p className="mt-4 text-sm">For a plan change, use billing management or contact our team. Canceling takes effect according to your billing terms.</p>}
    </>}
  </section>;
}
