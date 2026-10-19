import { t, getLocale, getLanguage } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../util/api";
import { zelleRecipient } from "../../shared/zelle.js";

export default function MembershipCheckout() {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const { planId } = useParams();
  const [data, setData] = useState(null);
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralReady, setReferralReady] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [amountDueCents, setAmountDueCents] = useState(null);
  const money = (cents) => new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/referrals/checkout", { signal: controller.signal }).then((result) => { setReferralCode(result.used ? "" : result.code); setReserved(result.reserved && !result.used); setReferralReady(true); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/payments/memberships", { signal: controller.signal }).then(setData)
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [planId]);
  const plan = data?.plans.find((item) => item._id === planId);
  const code = referralCode.trim().toUpperCase();
  async function applyCode() {
    setQuoting(true); setError(""); setQuote(null);
    try {
      const result = await apiRequest("/api/referrals/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, code }) });
      setQuote(result.offer);
    } catch (failure) { setError(failure.message); }
    finally { setQuoting(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (plan.price > 0 && code && quote?.code !== code) { setError(say("Apply your referral code to review the discount before continuing.", "Aplica tu código para revisar el descuento antes de continuar.")); return; }
    setBusy(true); setError("");
    try {
      const result = await apiRequest(method === "zelle" ? "/api/membership-billing/zelle" : "/api/payments/checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, referralCode: plan.price > 0 ? code : "", ...(plan.price > 0 && code && quote ? { expectedReferralTotalCents: quote.totalCents } : {}) }),
      });
      if (method === "card") window.location.assign(result.url);
      else { setAmountDueCents(result.amountDueCents); setComplete(true); setBusy(false); }
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <section className="mx-auto max-w-3xl space-y-6">
    <Link to="/memberships" className="text-aeviora-primary underline">{t("Back to membership plans")}</Link>
    <h1 className="font-display text-3xl">{t("Choose your payment method")}</h1>
    {error && <p role="alert" className="text-red-700">{t(error)}</p>}
    {!data && !error && <p role="status">{t("Loading selected plan…")}</p>}
    {data && !plan && <p>{t("This plan is no longer available. Please choose another membership.")}</p>}
    {plan && <div className="card space-y-5">
      <h2 className="font-display text-2xl">{plan.name}</h2>
      <p className="text-xl font-semibold">{t(plan.price === 0 ? "Free — no 30-day membership fee" : `${new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(plan.price)} per 30 days`)}</p>
      {complete ? <div role="status" className="space-y-3"><h3 className="font-semibold">{t("Zelle enrollment is pending payment confirmation")}</h3>{amountDueCents != null && <p className="text-lg font-semibold">{say("First payment: ", "Primer pago: ")}{money(amountDueCents)}</p>}<p>{t("Send your payment to ")}{zelleRecipient.phone} — {zelleRecipient.name}{t(". Include your account email in the memo.")}</p><p>{t("No money has been transferred by this website. Your membership becomes active after an administrator verifies receipt.")}</p><Link to="/memberships" className="btn-primary inline-block">{t("View my membership")}</Link></div> : data.pending ? <p>{t("Your Zelle membership is pending administrator payment confirmation. It is not active yet.")}</p> : data.subscribed ? <p>{t("You already have a selected membership. Return to membership plans to manage it.")}</p> : <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-5">
          <legend className="mb-3 font-semibold">{t("Payment options")}</legend>
          {plan.price > 0 && <div className="rounded-xl border border-aeviora-border p-4">
            <label htmlFor="membership-referral" className="label">{say("Referral / discount code", "Código de referido / descuento")}</label>
            <div className="flex flex-wrap items-center gap-3"><input id="membership-referral" value={referralCode} disabled={!referralReady || quoting} onChange={(event) => { setReferralCode(event.target.value); setQuote(null); }} maxLength={32} autoComplete="off" autoCapitalize="characters" className="input min-w-0 flex-1 uppercase" /><button type="button" disabled={!referralReady || !code || quoting} onClick={applyCode} className="btn-secondary disabled:opacity-50">{say(quoting ? "Checking…" : "Apply code", quoting ? "Verificando…" : "Aplicar código")}</button></div>
            {reserved && <p className="mt-2 text-xs">{say("A referral offer is reserved for this account. Keep that code or clear it to continue without a discount. You cannot switch to a different referral offer.", "Esta cuenta tiene una oferta reservada. Conserva ese código o bórralo para continuar sin descuento. No puedes cambiar a otra oferta de referido.")}</p>}
            {quote && <div role="status" className="mt-4 space-y-2 text-sm"><p>{say("Referral discount: ", "Descuento de referido: ")}{quote.discountPercent}% (−{money(quote.discountCents)})</p><p className="font-semibold">{say("First payment: ", "Primer pago: ")}{money(quote.totalCents)}</p><p>{say("Then ", "Después ")}{money(Math.round(plan.price * 100))}{say(" every 30 days. The referring member may earn a bonus.", " cada 30 días. El miembro que te refirió puede recibir un bono.")}</p></div>}
          </div>}
          <label className="flex gap-3 rounded-xl border border-aeviora-border p-4"><input type="radio" name="payment-method" value="card" checked={method === "card"} onChange={() => setMethod("card")} /><span><strong className="block">{t("Credit card")}</strong><span className="text-sm">{t("Secure checkout through Stripe. Review recurring billing details before confirming.")}</span></span></label>
          {plan.price > 0 && <label className="flex gap-3 rounded-xl border border-aeviora-border p-4"><input type="radio" name="payment-method" value="zelle" checked={method === "zelle"} onChange={() => setMethod("zelle")} /><span><strong className="block">{t("Zelle")}</strong><span className="text-sm">{t("Send each 30-day payment through your bank. An administrator confirms receipt.")}</span></span></label>}
          {method === "zelle" && <div className="rounded-xl bg-aeviora-ivory p-4"><p className="font-semibold">{zelleRecipient.name}</p><p>{zelleRecipient.phone}</p><p className="mt-2 text-sm">{t("Continue to register your selection before sending money. Include your account email in the bank payment memo.")}</p></div>}
          <button className="btn-primary disabled:opacity-50" disabled={!referralReady || quoting} type="submit">{t(busy ? "Please wait…" : method === "card" ? "Continue to secure checkout" : "Confirm Zelle selection")}</button>
        </fieldset>
      </form>}
    </div>}
  </section>;
}
