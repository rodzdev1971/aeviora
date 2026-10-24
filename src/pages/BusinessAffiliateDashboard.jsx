import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage, getLocale } from "../i18n/language.js";
import { company } from "../util/constants.jsx";
import ReferralShareCard from "../components/ReferralShareCard.jsx";

export default function BusinessAffiliateDashboard() {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState(""), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const key = `${businessId}:${page}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/business-portal/me?page=${page}${businessId ? `&businessId=${encodeURIComponent(businessId)}` : ""}`, { signal: controller.signal })
      .then((data) => { setResult({ ...data, key }); setError(""); })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) navigate("/business-affiliate/login", { replace: true });
        else setError(failure.message);
      });
    return () => controller.abort();
  }, [businessId, page, key, navigate]);
  async function logout() {
    if (busy) return; setBusy(true); setError("");
    try {
      await apiRequest("/api/business-portal/logout", { method: "POST" });
      navigate("/business-affiliate/login", { replace: true });
    } catch (failure) {
      if (failure.status === 401) navigate("/business-affiliate/login", { replace: true });
      else setError(failure.message);
    } finally { setBusy(false); }
  }
  const money = (cents = 0) => new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
  const date = (value) => value ? new Date(value).toLocaleString(getLocale()) : "—";
  const business = result?.business;
  return <main className="min-h-screen bg-aeviora-cream px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <meta name="robots" content="noindex, nofollow" />
    <header className="flex flex-wrap items-center justify-between gap-4"><div><Link to="/" className="font-display text-lg text-aeviora-primary">Aeviora Wellness</Link><h1 className="mt-2 font-display text-3xl">{say("Business affiliate portal", "Portal de afiliado comercial")}</h1></div><button type="button" onClick={logout} disabled={busy} className="btn-secondary">{say("Sign out", "Cerrar sesión")}</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button type="button" className="text-sm underline" onClick={() => { setError(""); setRevision((v) => v + 1); }}>{say("Refresh records", "Actualizar registros")}</button>
    {result?.key !== key ? !error && <p role="status">{say("Loading your business records…", "Cargando tus registros comerciales…")}</p> : <>
      {result.businesses.length > 1 && <label className="block max-w-lg text-sm font-semibold">{say("Business", "Negocio")}<select className="input mt-2" value={business._id} onChange={(e) => { setBusinessId(e.target.value); setPage(1); }}>
        {result.businesses.map((item) => <option key={item._id} value={item._id}>{item.businessName}</option>)}
      </select></label>}
      <section className="card space-y-4"><h2 className="font-display text-2xl">{business.businessName}</h2><p className="text-sm">{business.enabled ? say("Affiliate program enabled", "Programa de afiliados activo") : say("Affiliate program disabled — contact Aeviora Wellness to review eligibility.", "Programa de afiliados inactivo — contacta a Aeviora Wellness para revisar tu elegibilidad.")}</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
          [say("Contact person", "Persona de contacto"), business.contactName], [say("Registered email", "Correo registrado"), business.email], [say("Business phone", "Teléfono comercial"), business.phone], [say("Website", "Sitio web"), business.website], [say("Affiliate code", "Código de afiliado"), business.code], [say("Registered", "Registrado"), date(business.createdAt)],
          [say("First membership payment discount", "Descuento en el primer pago"), `${business.discountPercent}%`], [say("Commission on eligible payments after discounts", "Comisión sobre pagos elegibles después de descuentos"), `${business.commissionPercent}%`], [say("Commission schedule", "Frecuencia de comisión"), business.commissionMode === "recurring" ? say("First payment and eligible renewals", "Primer pago y renovaciones elegibles") : say("First payment only", "Solo el primer pago")],
        ].map(([label, value]) => <div key={label}><dt className="text-aeviora-slate">{label}</dt><dd className="mt-1 break-words font-semibold">{value || "—"}</dd></div>)}</dl>
        <p className="text-sm">{say("For contact details, program terms or payout questions, email", "Para cambios de contacto, condiciones o preguntas sobre pagos, escribe a")} <a className="underline" href={`mailto:${company.email}`}>{company.email}</a>.</p>
      </section>
      <section aria-label={say("Commission totals", "Totales de comisiones")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[say("Generated commissions", "Comisiones generadas"), result.summary.earnedCents], [say("Reversed commissions", "Comisiones revertidas"), result.summary.reversedCents], [say("Recorded payouts", "Pagos registrados"), result.summary.paidCents], [say("Commission balance", "Saldo de comisiones"), result.summary.balanceCents]].map(([label, amount]) => <div key={label} className="card"><p className="text-sm text-aeviora-slate">{label}</p><p className="mt-2 text-2xl font-semibold">{money(amount)}</p></div>)}</section>
      <p className="text-sm">{say("Referred membership checkouts", "Procesos de membresía referidos")}: <strong>{result.referredCheckouts}</strong> · {say("Commission records", "Registros de comisiones")}: <strong>{result.total}</strong>. {say("Checkouts may be unpaid. Commissions require eligible confirmed payments. A negative balance can reflect reversals after a payout. Payouts are recorded by admins; this portal does not transfer funds.", "Los procesos pueden estar sin pagar. Las comisiones requieren pagos elegibles confirmados. Un saldo negativo puede reflejar reversiones posteriores a un pago. La administración registra los pagos; este portal no transfiere fondos.")}</p>
      {business.enabled && business.discountPercent > 0 && <section className="card space-y-4"><h2 className="font-display text-2xl">{say("Your referral invitation", "Tu invitación de referido")}</h2><label className="block text-sm font-semibold">{say("Customer referral link", "Enlace de referido para clientes")}<input readOnly onFocus={(e) => e.target.select()} value={`${window.location.origin}/register?ref=${encodeURIComponent(business.code)}`} className="input mt-2" /></label><ReferralShareCard affiliate={{ ...business, kind: "business" }} link={`${window.location.origin}/register?ref=${encodeURIComponent(business.code)}`} /></section>}
      <section className="card space-y-4"><h2 className="font-display text-2xl">{say("Commission and payout records", "Registros de comisiones y pagos")}</h2><p className="text-sm">{say("Your own referral payment activity is listed below. Customer identities and medical information are private.", "Aquí se muestra la actividad de pagos de tus referidos. Las identidades y la información médica de los clientes son privadas.")}</p>
        {!result.rewards.length ? <p>{say("No commission records yet.", "Todavía no hay registros de comisiones.")}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{[say("Payment date", "Fecha de pago"), say("Membership / method", "Membresía / método"), say("Eligible payment", "Pago elegible"), say("Commission", "Comisión"), say("Reversed", "Revertido"), say("Paid out", "Pagado"), say("Payout details", "Detalles del desembolso")].map((label) => <th scope="col" key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{result.rewards.map((reward, index) => <tr key={index}>
          <td className="border-b p-3">{date(reward.paymentAt)}<div className="text-xs">{reward.code}</div></td><td className="border-b p-3">{reward.planName}<div className="text-xs uppercase">{reward.method}</div></td><td className="border-b p-3">{money(reward.baseCents)}</td><td className="border-b p-3">{money(reward.rewardCents)}</td><td className="border-b p-3">{money(reward.reversedCents)}</td><td className="border-b p-3">{money(reward.paidCents)}</td><td className="max-w-xs break-words border-b p-3">{date(reward.paidAt)}{reward.payoutReference && <div>{reward.payoutReference}</div>}</td>
        </tr>)}</tbody></table></div>}
        <div className="flex items-center gap-4 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">{say("Previous", "Anterior")}</button><span>{page} / {Math.max(1, result.totalPages)}</span><button type="button" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">{say("Next", "Siguiente")}</button></div>
      </section>
    </>}
  </div></main>;
}
