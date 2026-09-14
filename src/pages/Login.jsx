import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../util/api";

export default function Login() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  async function handleLogin(event) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      navigate("/dashboard");
    } catch (error) { setError(error.message || "Unable to sign in."); }
    finally { setSubmitting(false); }
  }
  function resetError() { setError(""); }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aeviora-black px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <Link to="/" className="mx-auto mb-8 flex w-fit flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-aeviora-gold text-2xl font-bold text-aeviora-gold">
            A
          </div>
          <p className="mt-3 font-display text-2xl">Aeviora Wellness</p>
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Secure Portal
          </p>
        </Link>

        <h1 className="font-display text-3xl">Account Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Access your wellness records and patient information.
        </p>
        {error ? <p className='text-red-400 font-semibold'>{error}</p> : ''}
        <form onSubmit={handleLogin} className="mt-8 grid gap-5">
          <div>
            <label htmlFor="loginEmail" className="label">Email Address</label>
            <input className="input" id="loginEmail" autoComplete="username" type="email" name='email' onFocus={resetError} required />
          </div>

          <div>
            <label htmlFor="loginPassword" className="label">Password</label>
            <input className="input" id="loginPassword" autoComplete="current-password" name="password" onFocus={resetError} type="password" required />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/register" className="text-aeviora-gold">
            Create account
          </Link>
          <button className="text-gray-500">
            Forgot password?
          </button>
        </div>
      </div>
    </main>
  );
}
