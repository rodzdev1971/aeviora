import { Link } from "react-router-dom";

export default function AccountPrivacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link to="/register" className="text-aeviora-primary underline">Back to registration</Link>
      <h1 className="mt-8 font-display text-4xl">Account Privacy Policy — development placeholder</h1>
      <p className="mt-6 leading-7">An approved account privacy policy has not been configured for this development environment. Test registration records acceptance of this placeholder only.</p>
      <p className="mt-4 leading-7">Use synthetic information while testing. Production registration requires the published policy URL and its version.</p>
    </main>
  );
}
