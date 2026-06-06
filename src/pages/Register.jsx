import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();

    /*
      Production HIPAA-oriented workflow:
      - Send data only over HTTPS.
      - Do not store PHI in localStorage.
      - Validate on backend.
      - Encrypt sensitive data at rest.
      - Use audit logs.
      - Use MFA for patient access.
      - Use Business Associate Agreements with vendors.
    */

    sessionStorage.setItem("aeviora_session", "active");
    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen bg-aeviora-black px-6 py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
        <section className="bg-aeviora-black p-10 text-white">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">
              A
            </div>
            <div>
              <p className="font-display text-2xl">Aeviora Wellness</p>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-lightGold">
                Patient Portal
              </p>
            </div>
          </Link>

          <div className="mt-16">
            <ShieldCheck className="mb-6 h-12 w-12 text-aeviora-gold" />
            <h1 className="font-display text-5xl">Create your secure account</h1>
            <p className="mt-6 text-gray-300">
              Register to complete intake forms, manage your wellness records,
              and access your care information.
            </p>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <h2 className="font-display text-3xl">Patient Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your information exactly as it appears on your ID.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">First Name</label>
                <input className="input" type="text" required />
              </div>

              <div>
                <label className="label">Last Name</label>
                <input className="input" type="text" required />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" required />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input className="input" type="tel" required />
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input className="input" type="date" required />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                minLength={10}
                required
                placeholder="Minimum 10 characters"
              />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type="password" minLength={10} required />
            </div>

            <label className="flex gap-3 text-sm text-gray-600">
              <input type="checkbox" required className="mt-1" />
              <span>
                I acknowledge that Aeviora Wellness will use secure systems to
                manage my patient information and that I will not share my portal
                credentials.
              </span>
            </label>

            <button className="btn-primary w-full" type="submit">
              Create Secure Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-aeviora-gold">
              Login here
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}