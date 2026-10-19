import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLocale, getLanguage } from "../i18n/language.js";
import { apiRequest } from "../util/api.js";

export default function Referrals() {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const [data, setData] = useState(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  const money = (cents) => new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/referrals/me", { signal: controller.signal }).then(setData).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [revision]);
  async function create() {
    setBusy(true); setError("");
    try { await apiRequest("/api/referrals/me", { method: "POST" }); setRevision((value) => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const affiliate = data?.affiliate;
  const link = affiliate && typeof window !== "undefined" ? `${window.location.origin}/register?ref=${encodeURIComponent(affiliate.code)}` : "";
  async function copy() {
    try { await navigator.clipboard.writeText(link); setMessage(say("Referral link copied.", "Enlace de referido copiado.")); }
    catch { setMessage(say("Select and copy the link below.", "Selecciona y copia el enlace de abajo.")); }
  }
  return <section className="mx-auto max-w-5xl space-y-6">
    <header><h1 className="font-display text-3xl">{say("Referral rewards", "Bonos por referidos")}</h1><p className="mt-3 text-sm leading-7 text-aeviora-slate">{say("Share your unique code with someone joining Aeviora. They receive a discount on their first paid membership, and qualifying payments can earn you a referral bonus.", "Comparte tu código único con alguien que se una a Aeviora. Recibirá un descuento en su primera membresía de pago y los pagos elegibles pueden generarte un bono.")}</p></header>
    {error && <p role="alert" className="text-red-700">{error}<button type="button" className="ml-3 underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>{say("Retry", "Reintentar")}</button></p>}
    {message && <p role="status">{message}</p>}
    {!data && !error && <p role="status">{say("Loading referral rewards…", "Cargando bonos…")}</p>}
    {data && <>
      <div className="card space-y-4">
        <h2 className="font-display text-2xl">{say("Your affiliate code", "Tu código de afiliado")}</h2>
        {!data.eligible && <p>{say("A current paid membership is required to share an eligible referral coupon and earn new rewards. Existing rewards remain in your ledger.", "Se requiere una membresía de pago vigente para compartir un cupón elegible y ganar bonos nuevos. Los bonos anteriores permanecen en tu registro.")} <Link className="text-aeviora-primary underline" to="/memberships">{say("View memberships", "Ver membresías")}</Link></p>}
        {affiliate ? <>
          <p className="break-all font-mono text-2xl text-aeviora-primary">{affiliate.code}</p>
          <p className="break-all text-xs text-aeviora-slate">{say("Affiliate ID: ", "ID de afiliado: ")}{affiliate._id}</p>
          <p>{affiliate.discountPercent}% {say("off their first membership payment", "de descuento en su primer pago de membresía")}</p>
          <p>{say("Your bonus: ", "Tu bono: ")}{affiliate.commissionPercent}% {say("of the membership amount paid after discounts, excluding tax", "del importe de membresía pagado después de descuentos, sin impuestos")} · {affiliate.commissionMode === "recurring" ? say("Qualifying payments and renewals", "Pagos y renovaciones elegibles") : say("First paid membership payment only", "Solo el primer pago de membresía")}</p>
          {affiliate.enabled && affiliate.discountPercent > 0 && data.eligible ? <div><label className="label" htmlFor="referral-link">{say("Your referral link", "Tu enlace de referido")}</label><input id="referral-link" readOnly value={link} onFocus={(event) => event.target.select()} className="input w-full" /><button type="button" className="btn-primary mt-3" onClick={copy}>{say("Copy link", "Copiar enlace")}</button></div> : <p className="rounded-xl bg-aeviora-ivory p-4">{say("This coupon is not currently available. Contact the team to review its discount and activation.", "Este cupón no está disponible. Contacta al equipo para revisar el descuento y su activación.")}</p>}
        </> : data.eligible && <button type="button" disabled={busy} onClick={create} className="btn-primary disabled:opacity-50">{say(busy ? "Creating…" : "Create my referral code", busy ? "Creando…" : "Crear mi código")}</button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{[[say("Earned", "Ganado"), data.summary.earnedCents - data.summary.reversedCents], [say("Paid out", "Pagado"), data.summary.paidCents], [say("Balance", "Saldo"), data.summary.balanceCents]].map(([label, value]) => <div className="card" key={label}><p className="text-sm">{label}</p><p className="mt-2 font-display text-3xl text-aeviora-primary">{money(value)}</p></div>)}</div>
      {data.summary.balanceCents < 0 && <p>{say("Refund or reward adjustments exceed the unpaid balance. Contact the team to review this adjustment.", "Los reembolsos o ajustes superan el saldo pendiente. Contacta al equipo para revisar el ajuste.")}</p>}
      <div className="card"><h2 className="font-display text-2xl">{say("Reward history", "Historial de bonos")}</h2><p className="mt-2 text-xs text-aeviora-slate">{say("Latest 100 rewards. Rewards are recorded after confirmed payment and may be reduced by refunds or disputes. Payouts are managed by the team.", "Últimos 100 bonos. Se registran tras confirmar el pago y pueden reducirse por reembolsos o disputas. El equipo administra los pagos.")}</p>{!data.rewards.length ? <p className="mt-5">{say("No paid referrals yet.", "Aún no hay referidos con pago.")}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-120 text-left text-sm"><thead><tr>{[say("Date", "Fecha"), say("Membership", "Membresía"), say("Reward", "Bono"), say("Paid", "Pagado")].map((title) => <th scope="col" key={title} className="p-3">{title}</th>)}</tr></thead><tbody>{data.rewards.map((reward) => <tr key={reward._id} className="border-t border-aeviora-border"><td className="p-3">{new Date(reward.paymentAt).toLocaleDateString(getLocale())}</td><td className="p-3">{reward.planName}</td><td className="p-3">{money(reward.rewardCents - (reward.reversedCents || 0))}</td><td className="p-3">{money(reward.paidCents || 0)}</td></tr>)}</tbody></table></div>}</div>
    </>}
  </section>;
}
