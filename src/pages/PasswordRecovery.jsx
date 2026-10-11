import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";

export default function PasswordRecovery({ reset = false }) {
  const [token] = useState(() => window.location.hash.slice(1));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (reset && form.get("password") !== form.get("confirm")) { setError("Passwords must match."); return; }
    setBusy(true); setError("");
    try {
      const result = await apiRequest(`/api/auth/${reset ? "reset-password" : "forgot-password"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reset ? { token, newPassword: form.get("password") } : { email: form.get("email") }) });
      setMessage(result.message); setDone(true);
      if (reset) window.history.replaceState(null, "", window.location.pathname);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-aeviora-cream px-6 py-14"><section className="card mx-auto max-w-md space-y-5">
    <h1 className="font-display text-3xl">{reset ? "Reset password" : "Recover your account"}</h1>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {!done && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
      {reset ? <><p>Use at least 12 characters. Reset links expire after 30 minutes.</p><label className="block">New password<input required minLength={12} type="password" autoComplete="new-password" name="password" className="input" /></label><label className="block">Confirm new password<input required minLength={12} type="password" autoComplete="new-password" name="confirm" className="input" /></label></> : <label className="block">Account email<input required type="email" autoComplete="email" name="email" className="input" /></label>}
      <button className="btn-primary" type="submit">{busy ? "Please wait…" : reset ? "Set new password" : "Email reset link"}</button>
    </fieldset></form>}
    <div className="flex flex-wrap gap-4 text-sm underline"><Link to="/login">Back to sign in</Link>{reset && <Link to="/forgot-password">Request another reset link</Link>}</div>
  </section></main>;
}
