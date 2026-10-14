import { t, getLocale } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useState } from "react";
import { apiRequest } from "../util/api";
import { zelleRecipient } from "../../shared/zelle.js";
export default function MembershipUpgrade({ plan, onComplete, initialQuote }) {
  useLanguage();
  const [quote, setQuote] = useState(initialQuote?.state === "executing" ? initialQuote : null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false), [zelleAccepted, setZelleAccepted] = useState(false);
  const money = (cents) => new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
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
    <button type="button" disabled={busy} className="btn-secondary" onClick={() => request(false)}>{t("Preview upgrade to ")}{plan.name}</button>
    {error && <p role="alert" className="text-red-700">{t(error)}</p>}
    {quote && <div className="rounded-lg border p-3 space-y-2">
      <p>{t("New 30-day plan: ")}{t(money(quote.price * 100))}</p><p>{t("Unused paid-time credit: ")}{t(money(quote.creditCents))}</p><p className="font-bold">{t(quote.method === "stripe" ? "Estimated due now" : "Due now")}: {t(money(quote.amountCents))}</p>
      {Number.isFinite(quote.sourcePrice) && <p className="text-sm">{t("Unused-time credit = your current plan price (")}{t(money(quote.sourcePrice * 100))}{t(") × remaining days (")}{t(quote.remainingDays.toFixed(2))}{t(") ÷ paid-period days (")}{t(quote.periodDays)}{t("). Partial days are calculated using the exact time and the credit is rounded to cents.")}</p>}
      <p className="text-sm">{t("Upgrade cost = ")}{t(money(quote.price * 100))} − {t(money(quote.creditCents))}{t(" credit")}{t(quote.amountCents !== Math.round(quote.price * 100) - quote.creditCents ? " + applicable invoice taxes or other adjustments" : "")} = {t(money(quote.amountCents))}{t(". Your unused time becomes a price credit; it is not added as extra days to the upgraded membership.")}</p>
      <p>{t("Current expiration: ")}{t(new Date(quote.sourceEnd).toLocaleString(getLocale()))}</p>
      <p>{t("Estimated upgraded expiration: ")}{t(new Date(quote.estimatedExpiration || new Date(quote.quotedAt).getTime() + 30 * 86400000).toLocaleString(getLocale()))}{t(". The final date appears after payment is confirmed.")}</p>
      <p>{t("The upgrade replaces the current paid period with a new 30-day period")}{t(quote.method === "zelle" ? " starting when an administrator confirms payment" : " starting when Stripe applies the paid upgrade")}{t(". Payment or verification delays can move the estimated expiration shown above.")}</p>
      <p>{t("You cannot upgrade or downgrade again for 24 hours after this plan change succeeds. Previewing or a failed payment does not start that restriction.")}</p>
      {quote.method !== "zelle" && <p>{t("Stripe calculates the final unused-time credit when you confirm. The charge may differ slightly from this estimate as time passes. The saved card will be charged the final invoice amount. The upgraded plan renews automatically every 30 days at ")}{t(money(quote.price * 100))}{t(" until canceled.")}</p>}
      {zelleAccepted ? <p role="status">{t("You accepted this upgrade. Send ")}{t(money(quote.amountCents))}{t(" to ")}{zelleRecipient.phone} — {zelleRecipient.name}{t(". Ask an administrator to verify receipt before ")}{t(new Date(quote.expiresAt).toLocaleString(getLocale()))}{t("; request a new quote before paying if this one expires.")}</p> : <form onSubmit={(event) => { event.preventDefault(); request(true); }} className="space-y-3">
        <label className="flex items-start gap-2"><input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />{t("I understand the credit calculation, amount due, new expiration, and 24-hour plan-change limit.")}</label>
        <button disabled={busy || !accepted} type="submit" className="btn-primary">{t(quote.method === "zelle" ? "Confirm upgrade and view payment instructions" : "Confirm and pay for upgrade")}</button>
      </form>}
      <button type="button" className="underline" onClick={() => setQuote(null)}>{t("Close preview")}</button>
    </div>}
  </div>;
}
