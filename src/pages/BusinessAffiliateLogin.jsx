import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";

export default function BusinessAffiliateLogin() {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const navigate = useNavigate();
  const [token, setToken] = useState(() => typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const [email, setEmail] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => { if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname); }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (token.trim()) {
        await apiRequest("/api/business-portal/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        navigate("/business-affiliate/dashboard", { replace: true });
      } else {
        await apiRequest("/api/business-portal/request-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        setMessage(say("If a registered business uses this email, a sign-in link will be sent. Check your inbox and spam folder. Use the latest link within 15 minutes.", "Si hay un negocio registrado con este correo, recibirás un enlace de acceso. Revisa tu bandeja de entrada y correo no deseado. Usa el enlace más reciente antes de 15 minutos."));
        setCooldown(60);
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-aeviora-cream px-4 py-12 sm:px-6"><section className="card mx-auto max-w-lg space-y-5">
    <meta name="robots" content="noindex, nofollow" />
    <Link to="/" className="font-display text-xl text-aeviora-primary">Aeviora Wellness</Link>
    <h1 className="font-display text-3xl">{say("Business affiliate sign in", "Acceso de afiliado comercial")}</h1>
    <p>{say("Sign in with a private, one-time link sent to your registered business email. No password is needed.", "Accede con un enlace privado de un solo uso enviado al correo registrado de tu negocio. No necesitas contraseña.")}</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{message}</p>}
    <form onSubmit={submit} className="space-y-4">
      {!token.trim() && <label className="block text-sm font-semibold">{say("Registered business email", "Correo registrado del negocio")}<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} className="input mt-2" /></label>}
      {token.trim() && <p className="text-sm">{say("Your sign-in code is ready. Select the button below to open your business portal.", "Tu código está listo. Selecciona el botón para abrir tu portal comercial.")}</p>}
      <button disabled={busy || (!token.trim() && cooldown > 0)} className="btn-primary w-full disabled:opacity-50">{say(busy ? "Please wait…" : token.trim() ? "Sign in to business portal" : cooldown ? `Request another link in ${cooldown}s` : "Email my sign-in link", busy ? "Espera…" : token.trim() ? "Acceder al portal comercial" : cooldown ? `Solicitar otro enlace en ${cooldown}s` : "Enviar mi enlace de acceso")}</button>
    </form>
    <details className="text-sm"><summary className="cursor-pointer font-semibold">{say("Enter a sign-in code from email", "Ingresar un código del correo")}</summary><label className="mt-3 block">{say("Sign-in code", "Código de acceso")}<input autoComplete="off" spellCheck={false} maxLength={64} value={token} onChange={(e) => setToken(e.target.value)} className="input mt-2 font-mono" /></label></details>
    {token && <button type="button" disabled={busy} onClick={() => { setToken(""); setError(""); }} className="text-sm underline">{say("Request a new sign-in link", "Solicitar otro enlace de acceso")}</button>}
    <p className="text-sm">{say("New businesses must first receive a registration invitation from Aeviora Wellness.", "Los nuevos negocios deben recibir primero una invitación de registro de Aeviora Wellness.")}</p>
    <Link to="/login" className="inline-block text-sm underline">{say("Patient / admin sign in", "Acceso de paciente / administrador")}</Link>
  </section></main>;
}
