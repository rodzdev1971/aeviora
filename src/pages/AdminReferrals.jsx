import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLocale, getLanguage } from "../i18n/language.js";
import { apiRequest } from "../util/api.js";
import AdminBusinessAffiliates from "../components/AdminBusinessAffiliates.jsx";

function TermsForm({ initial, onSave, busy, say, affiliate = false }) {
  function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onSave({ enabled: values.has("enabled"), discountPercent: Number(values.get("discountPercent")), commissionPercent: Number(values.get("commissionPercent")), commissionMode: values.get("commissionMode"), ...(affiliate ? { code: values.get("code").trim().toUpperCase() } : {}) });
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="space-y-4">
    {affiliate && <label className="block text-sm font-semibold">{say("Affiliate / coupon code", "Código de afiliado / cupón")}<input name="code" required minLength={6} maxLength={32} pattern="[A-Za-z0-9-]{6,32}" defaultValue={initial.code} className="input mt-2 uppercase" /></label>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">{say("Customer discount (%) · first payment", "Descuento al cliente (%) · primer pago")}<input name="discountPercent" type="number" min="0" max="90" step="0.01" required defaultValue={initial.discountPercent} className="input mt-2" /></label><label className="block text-sm font-semibold">{say("Affiliate commission (%)", "Comisión del afiliado (%)")}<input name="commissionPercent" type="number" min="0" max="100" step="0.01" required defaultValue={initial.commissionPercent} className="input mt-2" /></label></div>
    <label className="block text-sm font-semibold">{say("Commission applies to", "La comisión aplica a")}<select name="commissionMode" defaultValue={initial.commissionMode} className="input mt-2"><option value="first_payment">{say("First payment only", "Solo el primer pago")}</option><option value="recurring">{say("First payment and eligible renewals", "Primer pago y renovaciones elegibles")}</option></select></label>
    <label className="flex items-start gap-3 text-sm"><input name="enabled" type="checkbox" defaultChecked={initial.enabled} className="mt-1" /><span>{say("Enable coupon (requires a customer discount above zero)", "Activar cupón (requiere un descuento mayor que cero)")}</span></label>
    <button className="btn-primary disabled:opacity-50" type="submit">{say(busy ? "Saving…" : "Save settings", busy ? "Guardando…" : "Guardar configuración")}</button>
  </fieldset></form>;
}
function Pagination({ page, totalPages, change, say }) {
  return <div className="mt-4 flex flex-wrap items-center gap-4 text-sm"><span>{say("Page", "Página")} {page} / {Math.max(1, totalPages)}</span><button type="button" className="underline disabled:opacity-40" disabled={page <= 1} onClick={() => change(page - 1)}>{say("Previous", "Anterior")}</button><button type="button" className="underline disabled:opacity-40" disabled={page >= totalPages} onClick={() => change(page + 1)}>{say("Next", "Siguiente")}</button></div>;
}
function RewardActions({ reward, act, busy, say }) {
  const net = reward.rewardCents - (reward.reversedCents || 0);
  return <div className="mt-4 grid gap-4 lg:grid-cols-2">
    {!reward.paidCents && net > 0 && !reward.voidReason && <form onSubmit={(event) => { event.preventDefault(); act(`/rewards/${encodeURIComponent(reward._id)}/pay`, { amountCents: net, reference: new FormData(event.currentTarget).get("reference") }); }}><fieldset disabled={busy} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs">{say("Reference for payout already sent", "Referencia del pago ya enviado")}<input name="reference" required maxLength={150} className="input mt-1" /></label><button className="btn-secondary" type="submit">{say("Record payout", "Registrar pago")}</button></fieldset></form>}
    {net > 0 && <form onSubmit={(event) => { event.preventDefault(); act(`/rewards/${encodeURIComponent(reward._id)}/void`, { reason: new FormData(event.currentTarget).get("reason") }); }}><fieldset disabled={busy} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs">{say("Reason for reversal", "Motivo de reversión")}<input name="reason" required maxLength={250} className="input mt-1" /></label><button className="btn-secondary" type="submit">{say("Reverse reward", "Revertir bono")}</button></fieldset></form>}
  </div>;
}

export default function AdminReferrals() {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const [defaults, setDefaults] = useState(null), [affiliates, setAffiliates] = useState(null), [rewards, setRewards] = useState(null);
  const [page, setPage] = useState(1), [rewardPage, setRewardPage] = useState(1), [search, setSearch] = useState(""), [filter, setFilter] = useState("");
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const money = (cents) => new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([apiRequest("/api/referrals/admin/defaults", { signal: controller.signal }), apiRequest(`/api/referrals/admin/affiliates?page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal }), apiRequest(`/api/referrals/admin/rewards?page=${rewardPage}${filter ? `&affiliateId=${encodeURIComponent(filter)}` : ""}`, { signal: controller.signal })])
      .then(([settings, affiliateData, rewardData]) => { setDefaults(settings.defaults); setAffiliates(affiliateData); setRewards(rewardData); setLoading(false); })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false); } });
    return () => controller.abort();
  }, [revision, page, rewardPage, search, filter]);
  async function act(path, body, method = "POST") {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest(`/api/referrals/admin${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setMessage(result.message || say("Referral settings saved.", "Configuración guardada."));
      setLoading(true); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-6xl space-y-7">
    <header><h1 className="font-display text-3xl">{say("Affiliates & referral coupons", "Afiliados y cupones de referido")}</h1><p className="mt-3 max-w-4xl text-sm leading-7 text-aeviora-slate">{say("Manage unique member codes, customer discounts and referral commissions. The default commission is 20%: $2 per $10 of membership payment collected after discounts, excluding taxes. No bonus is earned on an unpaid signup.", "Administra códigos únicos, descuentos y comisiones. La comisión predeterminada es 20%: $2 por cada $10 cobrados por membresía después de descuentos y sin impuestos. Un registro sin pago no genera un bono.")}</p></header>
    {error && <p role="alert" className="text-red-700">{error}<button type="button" className="ml-3 underline" onClick={() => { setError(""); setLoading(true); setRevision((value) => value + 1); }}>{say("Reload", "Recargar")}</button></p>}
    {message && <p role="status">{message}</p>}
    {loading && <p role="status">{say("Loading referrals…", "Cargando referidos…")}</p>}
    <AdminBusinessAffiliates onViewRewards={(id) => { setFilter(id); setRewardPage(1); setLoading(true); setRevision((value) => value + 1); }} />
    {defaults && <details className="card"><summary className="cursor-pointer font-display text-2xl">{say("Defaults for new affiliate codes", "Valores para códigos nuevos")}</summary><p className="my-4 text-sm">{say("Set the customer discount and enable the program. Defaults apply to newly created codes; edit existing affiliates individually. Reserved offers retain their agreed terms.", "Define el descuento y activa el programa. Estos valores aplican a códigos nuevos; edita los existentes individualmente. Las ofertas reservadas conservan sus condiciones.")}</p><TermsForm key={`defaults-${revision}`} initial={defaults} busy={busy || loading} say={say} onSave={(values) => act("/defaults", values, "PUT")} /></details>}
    <div className="card"><h2 className="font-display text-2xl">{say("Create or find a member's code", "Crear o buscar el código de un miembro")}</h2><form className="mt-4" onSubmit={(event) => { event.preventDefault(); act("/affiliates", { email: new FormData(event.currentTarget).get("email") }); }}><fieldset disabled={busy || loading} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">{say("Member account email", "Correo del miembro")}<input name="email" type="email" required maxLength={254} className="input mt-2" /></label><button type="submit" className="btn-primary">{say("Create / find code", "Crear / buscar código")}</button></fieldset></form><p className="mt-3 text-xs">{say("A current paid membership is required for a new affiliate code.", "Se requiere una membresía de pago vigente para crear un código.")}</p></div>
    <section aria-labelledby="affiliate-list-heading"><h2 id="affiliate-list-heading" className="font-display text-2xl">{say("Affiliate codes", "Códigos de afiliados")}</h2>
      <form className="my-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(new FormData(event.currentTarget).get("search").trim()); setLoading(true); setRevision((value) => value + 1); }}><label className="min-w-0 flex-1 text-sm">{say("Search code, name or email", "Buscar código, nombre o correo")}<input name="search" type="search" maxLength={100} className="input mt-2" /></label><button type="submit" className="btn-secondary">{say("Search", "Buscar")}</button></form>
      {affiliates && <><p className="mb-4 text-sm">{affiliates.total} {say("affiliate codes", "códigos de afiliados")}</p><div className="grid items-start gap-4 lg:grid-cols-2">{affiliates.affiliates.map((affiliate) => <article key={affiliate._id} className="card space-y-4"><div><h3 className="font-display text-xl">{affiliate.owner ? `${affiliate.owner.firstName} ${affiliate.owner.lastName}` : affiliate.userId}</h3><p className="break-all text-sm">{affiliate.owner?.email}</p><p className="mt-2 break-all font-mono text-xs">ID: {affiliate._id}</p><p className="mt-2 text-sm">{affiliate.eligible ? say("Current paid member", "Miembro de pago vigente") : say("Membership currently ineligible", "Membresía no elegible actualmente")}</p></div><p className="text-sm">{say("Reward balance: ", "Saldo de bonos: ")}{money(affiliate.summary.balanceCents)} · {say("Paid: ", "Pagado: ")}{money(affiliate.summary.paidCents)}</p><TermsForm key={`${affiliate._id}-${revision}`} initial={affiliate} affiliate busy={busy || loading} say={say} onSave={(values) => act(`/affiliates/${affiliate._id}`, values, "PATCH")} /><button type="button" className="text-sm text-aeviora-primary underline" onClick={() => { setFilter(affiliate._id); setRewardPage(1); setLoading(true); setRevision((value) => value + 1); }}>{say("View this affiliate's rewards below", "Ver bonos de este afiliado abajo")}</button></article>)}</div><Pagination page={page} totalPages={affiliates.totalPages} change={(value) => { setPage(value); setLoading(true); }} say={say} /></>}
    </section>
    <section aria-labelledby="referral-rewards-heading"><div className="flex flex-wrap items-center gap-4"><h2 id="referral-rewards-heading" className="font-display text-2xl">{say("Reward ledger & payouts", "Registro de bonos y pagos")}</h2>{filter && <button type="button" className="text-sm underline" onClick={() => { setFilter(""); setRewardPage(1); setLoading(true); }}>{say("Show all affiliates", "Ver todos los afiliados")}</button>}</div><p className="mt-3 text-sm leading-6">{say("Record a payout only after sending it separately. This page does not transfer money. Reversals preserve payout history; a refund after payout can leave a negative affiliate balance.", "Registra un pago solo después de enviarlo por separado. Esta página no transfiere dinero. Las reversiones conservan el historial; un reembolso posterior puede dejar un saldo negativo.")}</p>
      {rewards && <><p className="my-4 text-sm">{rewards.total} {say("rewards", "bonos")}</p><div className="space-y-4">{rewards.rewards.map((reward) => <article className="card" key={reward._id}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{reward.code} · {reward.planName}</h3><p className="mt-1 text-xs">{new Date(reward.paymentAt).toLocaleDateString(getLocale())} · {reward.method}</p><p className="mt-2 break-all font-mono text-xs">{reward._id}</p></div><div className="text-sm"><p>{say("Payment: ", "Pago: ")}{money(reward.baseCents)}</p><p>{say("Reward: ", "Bono: ")}{money(reward.rewardCents)}</p><p>{say("Reversed: ", "Revertido: ")}{money(reward.reversedCents || 0)}</p><p>{say("Paid out: ", "Pagado: ")}{money(reward.paidCents || 0)}</p></div></div>{reward.payoutReference && <p className="mt-3 break-words text-sm">{say("Payout reference: ", "Referencia de pago: ")}{reward.payoutReference}</p>}{reward.voidReason && <p className="mt-3 break-words text-sm">{reward.voidReason}</p>}<RewardActions reward={reward} act={act} busy={busy || loading} say={say} /></article>)}</div><Pagination page={rewardPage} totalPages={rewards.totalPages} change={(value) => { setRewardPage(value); setLoading(true); }} say={say} /></>}
    </section>
  </section>;
}
