import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../util/api";
import { loginDestination } from "../util/loginDestination.js";

export default function Login() {
  useLanguage();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  async function handleLogin(event) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      navigate(loginDestination(location.state?.from), { replace: true });
    } catch (error) { setError(error.message || "Unable to sign in."); }
    finally { setSubmitting(false); }
  }
  function resetError() { setError(""); }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aeviora-black px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <Link to="/" className="mx-auto mb-8 flex w-fit flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-aeviora-gold text-2xl font-bold text-aeviora-gold">{t("A")}</div>
          <p className="mt-3 font-display text-2xl">{t("Aeviora Wellness")}</p>
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">{t("Secure Portal")}</p>
        </Link>

        <h1 className="font-display text-3xl">{t("Account Login")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("Access your wellness records and patient information.")}</p>
        {error ? <p className='text-red-400 font-semibold'>{t(error)}</p> : ''}
        <form onSubmit={handleLogin} className="mt-8 grid gap-5">
          <div>
            <label htmlFor="loginEmail" className="label">{t("Email Address")}</label>
            <input className="input" id="loginEmail" autoComplete="username" type="email" name='email' onFocus={resetError} required />
          </div>

          <div>
            <label htmlFor="loginPassword" className="label">{t("Password")}</label>
            <input className="input" id="loginPassword" autoComplete="current-password" name="password" onFocus={resetError} type="password" required />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {t(submitting ? "Signing in…" : "Sign in")}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/register" className="text-aeviora-gold">{t("Sign up for free")}</Link>
          <Link to="/forgot-password" className="text-gray-500">{t("Forgot password?")}</Link>
        </div>
        <Link to="/verify-email" className="mt-5 block text-sm text-aeviora-primary underline">{t("Need a verification email?")}</Link>
        <Link to="/business-affiliate/login" className="mt-4 block text-sm text-aeviora-primary underline">{t("Business affiliate sign in")}</Link>
      </div>
    </main>
  );
}
