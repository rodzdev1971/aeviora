import { useState } from "react";
import { apiRequest } from "../util/api";
import { zelleRecipient } from "../../shared/zelle.js";
export default function MembershipUpgrade({ plan, onComplete, initialQuote }) {
  const [quote, setQuote] = useState(initialQuote?.state === "executing" ? initialQuote : null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  async function request(confirm) {
    setBusy(true); setError("");
    try {
      const result = await apiRequest(`/api/membership-upgrades/${confirm ? "confirm" : "preview"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(confirm ? { quoteId: quote.id } : { planId: plan._id }) });
      if (!confirm) setQuote(result.quote);
      else if (result.url) window.location.assign(result.url);
      else { setQuote(null); onComplete(result.message); }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <button type="button" disabled={busy} className="btn-secondary" onClick={() => request(false)}>Preview upgrade to {plan.name}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {quote && <div className="rounded-lg border p-3 space-y-2">
      <p>New 30-day plan: {money(quote.price * 100)}</p><p>Unused paid-time credit: {money(quote.creditCents)}</p><p className="font-bold">Due now: {money(quote.amountCents)}</p>
      <p>Current expiration: {new Date(quote.sourceEnd).toLocaleString()}</p>
      <p>Estimated upgraded expiration: {new Date(quote.estimatedExpiration || new Date(quote.quotedAt).getTime() + 30 * 86400000).toLocaleString()}. The final date appears after payment is confirmed.</p>
      {quote.method === "zelle" ? <p>Send {money(quote.amountCents)} to {zelleRecipient.phone} — {zelleRecipient.name}. Ask an administrator to confirm this upgrade before {new Date(quote.expiresAt).toLocaleTimeString()}; if the quote expires, request a new quote before paying.</p> : <><p>The saved card will be charged the displayed amount. The upgraded plan renews automatically every 30 days at {money(quote.price * 100)} until canceled.</p><button disabled={busy} type="button" className="btn-primary" onClick={() => request(true)}>Pay and upgrade</button></>}
      <button type="button" className="underline" onClick={() => setQuote(null)}>Close preview</button>
    </div>}
  </div>;
}
