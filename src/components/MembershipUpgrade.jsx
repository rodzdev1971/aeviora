import { useState } from "react";
import { apiRequest } from "../util/api";
import { zelleRecipient } from "../../shared/zelle.js";
export default function MembershipUpgrade({ plan, onComplete, initialQuote }) {
  const [quote, setQuote] = useState(initialQuote?.state === "executing" ? initialQuote : null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false), [zelleAccepted, setZelleAccepted] = useState(false);
  const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  async function request(confirm) {
    setBusy(true); setError("");
    try {
      const result = await apiRequest(`/api/membership-upgrades/${confirm ? quote.method === "zelle" ? "accept" : "confirm" : "preview"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(confirm ? { quoteId: quote.id, accepted } : { planId: plan._id }) });
      if (!confirm) { setQuote(result.quote); setAccepted(false); setZelleAccepted(false); }
      else if (quote.method === "zelle") setZelleAccepted(true);
      else if (result.url) window.location.assign(result.url);
      else { setQuote(null); onComplete(result.message); }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <button type="button" disabled={busy} className="btn-secondary" onClick={() => request(false)}>Preview upgrade to {plan.name}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {quote && <div className="rounded-lg border p-3 space-y-2">
      <p>New 30-day plan: {money(quote.price * 100)}</p><p>Unused paid-time credit: {money(quote.creditCents)}</p><p className="font-bold">{quote.method === "stripe" ? "Estimated due now" : "Due now"}: {money(quote.amountCents)}</p>
      {Number.isFinite(quote.sourcePrice) && <p className="text-sm">Unused-time credit = your current plan price ({money(quote.sourcePrice * 100)}) × remaining days ({quote.remainingDays.toFixed(2)}) ÷ paid-period days ({quote.periodDays}). Partial days are calculated using the exact time and the credit is rounded to cents.</p>}
      <p className="text-sm">Upgrade cost = {money(quote.price * 100)} − {money(quote.creditCents)} credit{quote.amountCents !== Math.round(quote.price * 100) - quote.creditCents ? " + applicable invoice taxes or other adjustments" : ""} = {money(quote.amountCents)}. Your unused time becomes a price credit; it is not added as extra days to the upgraded membership.</p>
      <p>Current expiration: {new Date(quote.sourceEnd).toLocaleString()}</p>
      <p>Estimated upgraded expiration: {new Date(quote.estimatedExpiration || new Date(quote.quotedAt).getTime() + 30 * 86400000).toLocaleString()}. The final date appears after payment is confirmed.</p>
      <p>The upgrade replaces the current paid period with a new 30-day period{quote.method === "zelle" ? " starting when an administrator confirms payment" : " starting when Stripe applies the paid upgrade"}. Payment or verification delays can move the estimated expiration shown above.</p>
      <p>You cannot upgrade or downgrade again for 24 hours after this plan change succeeds. Previewing or a failed payment does not start that restriction.</p>
      {quote.method !== "zelle" && <p>Stripe calculates the final unused-time credit when you confirm. The charge may differ slightly from this estimate as time passes. The saved card will be charged the final invoice amount. The upgraded plan renews automatically every 30 days at {money(quote.price * 100)} until canceled.</p>}
      {zelleAccepted ? <p role="status">You accepted this upgrade. Send {money(quote.amountCents)} to {zelleRecipient.phone} — {zelleRecipient.name}. Ask an administrator to verify receipt before {new Date(quote.expiresAt).toLocaleString()}; request a new quote before paying if this one expires.</p> : <form onSubmit={(event) => { event.preventDefault(); request(true); }} className="space-y-3">
        <label className="flex items-start gap-2"><input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />I understand the credit calculation, amount due, new expiration, and 24-hour plan-change limit.</label>
        <button disabled={busy || !accepted} type="submit" className="btn-primary">{quote.method === "zelle" ? "Confirm upgrade and view payment instructions" : "Confirm and pay for upgrade"}</button>
      </form>}
      <button type="button" className="underline" onClick={() => setQuote(null)}>Close preview</button>
    </div>}
  </div>;
}
