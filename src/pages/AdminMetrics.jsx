import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Users, UserPlus, ArrowRight, RefreshCw } from "lucide-react";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import AdminPushControl from "../components/AdminPushControl.jsx";

// Add future badge definitions here; each badge links to its detail view.
const badges = [
  { id: "subscribers", icon: Users, value: (data) => data.total, title: ["Total subscribers", "Suscriptores totales"], description: ["Free and paid memberships", "Membresías gratuitas y de pago"] },
  { id: "signups", icon: UserPlus, value: (data) => data.signups.total, title: ["New signups", "Nuevos registros"], description: ["Review email verification", "Revisar verificación de correo"] },
];

export default function AdminMetrics() {
  useLanguage();
  const language = getLanguage(), locale = language === "es" ? "es-US" : "en-US";
  const say = (en, es) => language === "es" ? es : en;
  const { metric } = useParams();
  const [params, setParams] = useSearchParams();
  const days = [1, 7, 30, 90].includes(Number(params.get("days"))) ? Number(params.get("days")) : 7;
  const plan = params.get("plan") || "all", verification = params.get("verification") || "all";
  const pageInput = Number(params.get("page")), page = Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1;
  const [data, setData] = useState(null), [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true), [detailsLoading, setDetailsLoading] = useState(true);
  const [error, setError] = useState(""), [detailsError, setDetailsError] = useState(null);
  const [revision, setRevision] = useState(0);
  const validMetric = !metric || ["subscribers", "signups"].includes(metric);
  const detailsKey = `${metric}|${days}|${page}|${verification}|${plan}`;
  function refresh() { setError(""); setDetailsError(null); setLoading(true); setDetailsLoading(true); setRevision((value) => value + 1); }
  function change(key, value) {
    setParams((current) => { const next = new URLSearchParams(current); next.set(key, value); if (key !== "page") next.delete("page"); return next; });
    if (key === "days") setLoading(true);
    setDetailsLoading(true); setError(""); setDetailsError(null);
  }
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/metrics?days=${days}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) { setData(result); setError(""); setLoading(false); } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false); } });
    return () => controller.abort();
  }, [days, revision]);
  useEffect(() => {
    if (!metric || !validMetric) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ view: metric, days, page, limit: 25, verification, ...(plan !== "all" ? { plan } : {}) });
    apiRequest(`/api/admin/metrics/accounts?${query}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) { setDetails({ ...result, key: detailsKey }); setDetailsError(null); setDetailsLoading(false); } })
      .catch((failure) => { if (!controller.signal.aborted) { setDetailsError({ key: detailsKey, message: failure.message }); setDetailsLoading(false); } });
    return () => controller.abort();
  }, [metric, validMetric, days, page, verification, plan, revision, detailsKey]);
  useEffect(() => {
    const manifest = document.createElement("link");
    manifest.rel = "manifest"; manifest.href = "/admin.webmanifest";
    document.head.appendChild(manifest);
    const update = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    const interval = setInterval(update, 60000);
    const push = (event) => { if (event.data?.type === "ADMIN_METRICS_REFRESH") update(); };
    document.addEventListener("visibilitychange", update);
    navigator.serviceWorker?.addEventListener("message", push);
    return () => { manifest.remove(); clearInterval(interval); document.removeEventListener("visibilitychange", update); navigator.serviceWorker?.removeEventListener("message", push); };
  }, []);
  const date = (value) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const status = (value) => ({ verified: say("Verified", "Verificado"), pending: say("Awaiting verification", "Esperando verificación"), not_verified: say("Not verified — link expired", "No verificado — enlace vencido"), legacy: say("Existing account (verification not recorded)", "Cuenta existente (verificación no registrada)") })[value] || value;
  const link = (view, values = {}) => `/admin/metrics/${view}?${new URLSearchParams({ days, ...values })}`;
  if (!validMetric) return <section className="card"><p>{say("Metric not found.", "Métrica no encontrada.")}</p><Link to="/admin/metrics" className="underline">{say("Back to metrics", "Volver a métricas")}</Link></section>;
  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="space-y-3"><p className="text-xs uppercase tracking-widest text-aeviora-gold">{say("Administration", "Administración")}</p><h1 className="font-display text-3xl">{say("Metrics & notifications", "Métricas y notificaciones")}</h1><p className="text-sm text-aeviora-slate">{say("Subscriber badges and account growth, with space for future metrics.", "Indicadores de suscriptores y crecimiento de cuentas, con espacio para futuras métricas.")}</p><Link to="/admin" className="inline-block text-sm underline">{say("Manage accounts", "Gestionar cuentas")}</Link></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><label className="label">{say("New signup period", "Periodo de nuevos registros")}<select className="input mt-2" value={days} onChange={(event) => change("days", event.target.value)}>{[1, 7, 30, 90].map((value) => <option key={value} value={value}>{value === 1 ? say("Last 24 hours", "Últimas 24 horas") : say(`Last ${value} days`, `Últimos ${value} días`)}</option>)}</select></label><button type="button" onClick={refresh} disabled={loading} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />{say("Refresh metrics", "Actualizar métricas")}</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {loading && (!data || data.days !== days) ? <p role="status">{say("Loading metrics…", "Cargando métricas…")}</p> : data && <>
      <div className="grid gap-4 sm:grid-cols-2">{badges.map(({ id, icon: Icon, value, title, description }) => <Link key={id} to={link(id)} className={`card group block transition hover:border-aeviora-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aeviora-primary ${metric === id ? "border-aeviora-primary" : ""}`}><div className="flex items-center justify-between gap-3"><span className="rounded-xl bg-aeviora-softSage p-3 text-aeviora-primary"><Icon size={24} aria-hidden="true" /></span><ArrowRight size={20} aria-hidden="true" /></div><p className="mt-4 text-sm font-semibold">{say(...title)}</p><p className="mt-2 font-display text-5xl text-aeviora-primary">{new Intl.NumberFormat(locale).format(value(data))}</p><p className="mt-3 text-sm text-aeviora-slate">{say(...description)}{id === "signups" && ` · ${data.days === 1 ? say("24 hours", "24 horas") : say(`${data.days} days`, `${data.days} días`)}`}</p></Link>)}</div>
      <p className="text-xs leading-5 text-aeviora-slate">{say("Counts include pending and active patient/user accounts. Staff, suspended and deleted accounts are excluded. Accounts without a current paid period count under Free, including accounts awaiting payment.", "Los totales incluyen cuentas de pacientes/usuarios pendientes y activas. Se excluyen personal, cuentas suspendidas y eliminadas. Las cuentas sin un periodo pagado vigente cuentan como gratuitas, incluidas las pendientes de pago.")}</p>
      <p className="text-xs text-aeviora-slate">{say("Updated:", "Actualizado:")} {date(data.asOf)} · {say("Refreshes every minute while this page is visible.", "Se actualiza cada minuto mientras esta página está visible.")}</p>
      {metric === "subscribers" && <section className="card space-y-4" aria-labelledby="plan-totals"><h2 id="plan-totals" className="font-display text-2xl">{say("Subscribers per plan", "Suscriptores por plan")}</h2><p className="text-sm">{data.free} {say("Free", "Gratuitos")} · {data.paid} {say("Paid", "De pago")} · {data.awaitingPayment} {say("awaiting payment (included in Free)", "pendientes de pago (incluidos en gratuitos)")}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.plans.map((item) => <Link key={item.id} to={link("subscribers", { plan: item.id })} className="rounded-xl border border-aeviora-border p-4 hover:border-aeviora-primary"><span className="block font-semibold">{item.id === "free" ? say("Free membership", "Membresía gratuita") : item.name}</span><span className="mt-2 block font-display text-3xl text-aeviora-primary">{item.count}</span></Link>)}</div></section>}
      {metric === "signups" && <section className="card space-y-4" aria-labelledby="signup-totals"><h2 id="signup-totals" className="font-display text-2xl">{say("New account verification", "Verificación de nuevas cuentas")}</h2><div className="grid gap-3 sm:grid-cols-3">{[["verified", data.signups.verified, say("Verified", "Verificados")], ["unverified", data.signups.unverified, say("Not yet verified", "Aún no verificados")], ["legacy", data.signups.legacy, say("Verification not recorded", "Verificación no registrada")]].map(([key, count, label]) => <Link key={key} to={link("signups", { verification: key })} className="rounded-xl border border-aeviora-border p-4 hover:border-aeviora-primary"><span className="block font-semibold">{label}</span><span className="mt-2 block font-display text-3xl text-aeviora-primary">{count}</span></Link>)}</div><p className="text-sm text-aeviora-slate">{data.signups.pending} {say("awaiting verification", "esperando verificación")} · {data.signups.not_verified} {say("verification links expired", "enlaces de verificación vencidos")}</p></section>}
    </>}
    {metric && <section className="card space-y-4" aria-labelledby="subscriber-accounts"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="subscriber-accounts" className="font-display text-2xl">{say("Account details", "Detalles de cuentas")}</h2><div className="flex flex-wrap gap-3">
      {metric === "subscribers" && <label className="label">{say("Plan", "Plan")}<select className="input mt-2" value={plan} onChange={(event) => change("plan", event.target.value)}><option value="all">{say("All plans", "Todos los planes")}</option>{data?.plans.map((item) => <option key={item.id} value={item.id}>{item.id === "free" ? say("Free membership", "Membresía gratuita") : item.name}</option>)}</select></label>}
      <label className="label">{say("Email verification", "Verificación de correo")}<select className="input mt-2" value={verification} onChange={(event) => change("verification", event.target.value)}><option value="all">{say("All accounts", "Todas las cuentas")}</option><option value="verified">{say("Verified", "Verificadas")}</option><option value="unverified">{say("Not yet verified", "Aún no verificadas")}</option><option value="legacy">{say("Existing accounts", "Cuentas existentes")}</option></select></label>
    </div></div>
      {detailsError?.key === detailsKey ? <p role="alert" className="text-red-700">{detailsError.message}</p> : detailsLoading || details?.key !== detailsKey ? <p role="status">{say("Loading account details…", "Cargando detalles…")}</p> : <><p className="text-sm">{details.total} {say("accounts match these filters", "cuentas coinciden con estos filtros")}</p><div className="overflow-x-auto"><table className="w-full min-w-170 text-left text-sm"><thead><tr className="border-b border-aeviora-border">{[say("Name", "Nombre"), say("Email", "Correo"), say("Plan", "Plan"), say("Verification", "Verificación"), say("Registered", "Registro")].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{details.accounts.map((account) => <tr key={account._id} className="border-b border-aeviora-border"><td className="p-3">{account.firstName} {account.lastName}</td><td className="p-3">{account.email}</td><td className="p-3">{account.planId === "free" ? say("Free membership", "Membresía gratuita") : account.planName}</td><td className="p-3">{status(account.verificationStatus)}</td><td className="p-3">{date(account.createdAt)}</td></tr>)}</tbody></table></div>{!details.accounts.length && <p>{say("No accounts match these filters.", "No hay cuentas con estos filtros.")}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{say(`Page ${details.page} of ${Math.max(1, details.totalPages)}`, `Página ${details.page} de ${Math.max(1, details.totalPages)}`)}</p><div className="flex gap-2"><button type="button" className="btn-secondary disabled:opacity-50" disabled={page <= 1} onClick={() => change("page", String(page - 1))}>{say("Previous", "Anterior")}</button><button type="button" className="btn-secondary disabled:opacity-50" disabled={page >= details.totalPages} onClick={() => change("page", String(page + 1))}>{say("Next", "Siguiente")}</button></div></div></>}
    </section>}
    <AdminPushControl say={say} />
  </section>;
}
