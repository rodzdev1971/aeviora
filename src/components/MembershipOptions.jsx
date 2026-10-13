import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";
import { CheckCircle2 } from "lucide-react";
import { discountText } from "../../shared/discounts.js";
import { zelleRecipient } from "../../shared/zelle.js";
import MembershipUpgrade from "./MembershipUpgrade";

export default function MembershipOptions() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const returnedFromPayment = new URLSearchParams(window.location.search).get("payment") === "success";
  useEffect(() => {
    const controller = new AbortController();
    let retry;
    apiRequest("/api/payments/memberships", { signal: controller.signal }).then(setData)
      .then(() => { if (returnedFromPayment && revision < 4) retry = setTimeout(() => setRevision((value) => value + 1), 3000); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => { controller.abort(); clearTimeout(retry); };
  }, [revision, returnedFromPayment]);
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
  async function renewal(cancel) {
    if (!window.confirm(cancel ? "Cancel renewal at the end of the current period? Paid access continues until then." : "Reactivate recurring billing on the next billing date? The current period will not be charged again.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest("/api/payments/renewal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancel }) });
      setMessage(result.message); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="card lg:col-span-2" aria-labelledby="membership-heading">
    <h2 id="membership-heading" className="font-display text-2xl">Your membership</h2>
    {returnedFromPayment && <p role="status" className="mt-3 rounded-lg bg-aeviora-ivory p-3">{data?.subscribed ? `Your membership is ${data.current.name}. Status: ${data.current.status}.` : "Checking your payment with Stripe. Your plan will appear once the subscription is confirmed."}</p>}
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3">{message}</p>}
    {error && <button type="button" className="mt-2 underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Retry membership check</button>}
    {!data ? <p role="status">Loading memberships…</p> : <>
      <p className="mt-3 text-lg font-semibold">{data.pending ? `${data.current.name} — Pending payment confirmation` : data.current.name}</p>
      {data.pending && <p role="status" className="mt-3 rounded-lg bg-aeviora-ivory p-3">Your paid membership and its benefits are not active. They become available after {data.current.paymentMethod === "zelle" ? "an administrator verifies your Zelle payment" : "your payment is confirmed"}.</p>}
      {data.current.paidThrough && <p className="mt-3 font-semibold">Paid membership expires: {new Date(data.current.paidThrough).toLocaleString()}</p>}
      <p className="mt-1 text-sm">{data.current.status === "free" ? "Free account — $0.00. Choose a plan below for membership benefits." : `Subscription status: ${data.current.status}`}</p>
      {data.current.cancelAtPeriodEnd && <p role="status" className="mt-3">Renewal canceled. Your paid membership remains available until {new Date(data.current.paidThrough || data.current.periodEnd).toLocaleString()}. Reactivating before then resumes renewal for the next period; it does not pay for the next period in advance.</p>}
      {!data.current.cancelAtPeriodEnd && data.current.periodEnd && <p className="mt-3">Next billing date: {new Date(data.current.periodEnd).toLocaleString()}. Reactivation does not charge the current period again.</p>}
      <button type="button" disabled={busy} className="mt-3 text-sm underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Refresh membership status</button>
      {data.subscribed && data.current.paymentMethod !== "zelle" && <button type="button" disabled={busy} onClick={() => choose(null)} className="btn-secondary mt-4 ml-3">Manage current membership</button>}
      {data.subscribed && data.current.paymentMethod === "stripe" && <button type="button" disabled={busy} onClick={() => renewal(!data.current.cancelAtPeriodEnd)} className="btn-secondary mt-4 ml-3">{data.current.cancelAtPeriodEnd ? "Reactivate renewal" : "Cancel renewal"}</button>}
      {data.current.paymentMethod === "zelle" && <div className="mt-4 rounded-xl border border-aeviora-border p-4">
        <h3 className="font-semibold">Pay with Zelle</h3>
        <p>{zelleRecipient.name} · {zelleRecipient.phone}</p>
        <p>{money(data.current.price)} 30-day · Next unpaid period starts {new Date(data.current.dueAt).toLocaleDateString()}</p>
        <p className="mt-2 text-sm">Include your account email in the payment memo. An administrator verifies receipt; selecting Zelle does not send money.</p>
      </div>}
      <h3 className="mt-7 font-display text-xl">Membership options</h3>
      <p className="mt-2 text-sm text-aeviora-slate">Pay by card through Stripe or choose Zelle. Membership begins after checkout confirmation or administrator verification of your Zelle payment. Benefit service prices are separate from the 30-day membership fee.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.plans.map((plan) => <article key={plan._id} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-white ${data.current.planId === plan._id ? "border-aeviora-primary" : "border-aeviora-border"}`}>
        <div className="border-b border-aeviora-border bg-aeviora-ivory p-5">
          <h4 className="break-words font-display text-2xl text-aeviora-primaryDark">{plan.name}</h4>
          <p className="mt-3 text-3xl font-bold text-aeviora-primaryDark">{plan.price === 0 ? "Free" : money(plan.price)}{plan.price !== 0 && <span className="text-sm font-normal text-aeviora-slate"> / 30 days</span>}</p>
          <p className="mt-2 text-sm text-aeviora-slate">{plan.price === 0 ? "No 30-day membership fee" : "30-day membership fee"}</p>
        </div>
        <div className="flex flex-1 flex-col p-5">
        <h5 className="text-lg font-semibold text-aeviora-charcoal">Plan benefits</h5>
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
        {data.current.planId === plan._id ? <p className="font-semibold text-aeviora-primary">{data.pending ? "Pending — awaiting administrator payment confirmation" : "Current membership"}</p> : !data.subscribed && !data.pending && <Link to={`/memberships/${plan._id}/payment`} className="btn-primary text-center">Choose {plan.name}</Link>}
        {data.subscribed && plan.price > data.current.price && <MembershipUpgrade plan={plan} initialQuote={String(data.upgradeQuote?.planId) === plan._id ? data.upgradeQuote : null} onComplete={(text) => { setMessage(text); setRevision((value) => value + 1); }} />}
        </div>
      </article>)}</div>
      {data.plans.length === 0 && <p className="mt-4">Membership options will appear here when available.</p>}
      {(data.subscribed || data.pending) && <p className="mt-4 text-sm">{data.current.paymentMethod === "zelle" ? "Contact our team for help with your Zelle membership." : "For a plan change, use billing management or contact our team. Canceling takes effect according to your billing terms."}</p>}
    </>}
  </section>;
}
