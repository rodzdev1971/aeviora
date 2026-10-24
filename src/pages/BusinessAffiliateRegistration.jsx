import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import ReferralShareCard from "../components/ReferralShareCard.jsx";

export default function BusinessAffiliateRegistration() {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [code, setCode] = useState(() => typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const [invitation, setInvitation] = useState(null), [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ businessName: "", contactName: "", phone: "", website: "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname); }, []);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      if (!invitation) {
        const data = await apiRequest("/api/business-invitations/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
        setInvitation(data.invitation); setForm({ ...form, businessName: data.invitation.businessName });
      } else {
        const data = await apiRequest("/api/business-invitations/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, details: form }) });
        setBusiness(data.business); setCode("");
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-aeviora-cream px-4 py-12 sm:px-6"><section className="card mx-auto max-w-2xl space-y-5">
    <meta name="robots" content="noindex, nofollow" />
    <Link to="/" className="font-display text-xl text-aeviora-primary">Aeviora Wellness</Link>
    <h1 className="font-display text-3xl">{say("Business affiliate registration", "Registro de afiliado comercial")}</h1>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {business ? <>
      <p role="status">{say("Your business is registered. Save your referral code and customer invitation below. Contact Aeviora Wellness for changes or payout questions.", "Tu negocio está registrado. Guarda tu código y la invitación para clientes. Contacta a Aeviora Wellness para cambios o preguntas sobre pagos.")}</p>
      <p className="font-semibold">{business.businessName} · {business.code}</p>
      <Link to="/business-affiliate/login" className="btn-primary inline-block">{say("Sign in to view your business records", "Accede para ver tus registros comerciales")}</Link>
      {business.enabled && business.discountPercent > 0 && <ReferralShareCard affiliate={business} link={`${window.location.origin}/register?ref=${encodeURIComponent(business.code)}`} />}
    </> : <form onSubmit={submit} className="space-y-4">
      {!invitation ? <>
        <p>{say("Registration is available only to invited businesses. Open your invitation email or enter its private access code below.", "El registro está disponible solo para negocios invitados. Abre tu correo de invitación o ingresa el código privado.")}</p>
        <label className="block text-sm font-semibold">{say("Invitation code", "Código de invitación")}<input required autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} maxLength={64} className="input mt-2 font-mono" /></label>
      </> : <>
        <p className="text-sm">{say("Invited email", "Correo invitado")}: <strong className="break-all">{invitation.email}</strong></p>
        {[["businessName", "Business name", "Nombre del negocio", 160, true], ["contactName", "Contact person", "Persona de contacto", 120, true], ["phone", "Business phone (optional)", "Teléfono comercial (opcional)", 40, false], ["website", "Website (HTTPS, optional)", "Sitio web (HTTPS, opcional)", 2000, false]].map(([field, en, es, maxLength, required]) => <label key={field} className="block text-sm font-semibold">{say(en, es)}<input type={field === "website" ? "url" : field === "phone" ? "tel" : "text"} required={required} maxLength={maxLength} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="input mt-2" /></label>)}
        <div className="rounded-xl bg-aeviora-cream p-4 text-sm space-y-2"><p>{say("Customer discount on first membership payment", "Descuento al cliente en el primer pago")}: {invitation.discountPercent}%</p><p>{say("Business commission on eligible membership payments after discounts", "Comisión sobre pagos elegibles después de descuentos")}: {invitation.commissionPercent}% · {invitation.commissionMode === "recurring" ? say("Including eligible renewals", "Incluye renovaciones elegibles") : say("First payment only", "Solo el primer pago")}</p><p>{say("Admins manage affiliate eligibility and payouts.", "La administración gestiona la elegibilidad y los pagos.")}</p></div>
      </>}
      <button disabled={busy} className="btn-primary w-full">{say(busy ? "Please wait…" : invitation ? "Complete business registration" : "Access registration", busy ? "Espera…" : invitation ? "Completar registro comercial" : "Acceder al registro")}</button>
    </form>}
  </section></main>;
}
