import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { apiRequest } from "../util/api";
import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";

export default function EmailVerification() {
  useLanguage();
  const [token] = useState(() => window.location.hash.slice(1));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resend, setResend] = useState(!token);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await apiRequest(`/api/auth/${resend ? "resend-verification" : "verify-email"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resend ? { email } : { token }),
      });
      setMessage(response.message);
      if (resend) setCooldown(60);
      else {
        setVerified(true);
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-aeviora-cream px-4 py-12 sm:px-6">
    <section className="card mx-auto max-w-lg space-y-5">
      <Link to="/" className="font-display text-xl text-aeviora-primary">Aeviora Wellness</Link>
      <ShieldCheck aria-hidden="true" className="h-10 w-10 text-aeviora-primary" />
      <h1 className="font-display text-3xl">{t(verified ? "Email verified" : resend ? "Request a verification link" : "Verify your email")}</h1>
      {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{t(message)}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{t(error)}</p>}
      {!verified && <>
        <p className="text-aeviora-slate">{t("Verify your email to activate your account. Links expire after 24 hours. If yours has expired, request a new one; you do not need to register again.")}</p>
        <form onSubmit={submit} className="space-y-4">
          {resend && <label className="block label">{t("Account email")}<input name="email" type="email" autoComplete="email" required maxLength={254} className="input mt-2" disabled={busy} /></label>}
          <button type="submit" className="btn-primary w-full disabled:opacity-60" disabled={busy || (resend && cooldown > 0)}>
            {t(busy ? "Please wait…" : resend ? cooldown ? "Please wait one minute before requesting another link." : "Email verification link" : "Verify my email")}
          </button>
        </form>
        {!resend && <button type="button" disabled={busy} onClick={() => { setResend(true); setError(""); }} className="text-sm underline">{t("Request a new verification link")}</button>}
        <p className="text-sm text-aeviora-slate">{t("Check your spam folder. Use the most recent verification email. If you still need help, contact Aeviora Wellness for manual verification.")}</p>
      </>}
      <Link to="/login" className="inline-block text-sm font-semibold underline">{t("Back to sign in")}</Link>
    </section>
  </main>;
}
