import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PatientDirectory from "../components/PatientDirectory";
import { apiRequest } from "../util/api";

const fields = { addressLine1: "Address", city: "City", state: "State", zipCode: "ZIP code", timeZone: "Time zone" };

export default function Directory() {
  const { user } = useOutletContext();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (!["admin", "provider"].includes(user?.role)) return <Navigate to="/dashboard" replace />;
  function edit(account) {
    setSelected(account); setError(""); setMessage("");
    setForm(Object.fromEntries(Object.keys(fields).map((key) => [key, account[key] || ""])));
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest(`/api/users/${selected._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setSelected(null); setRevision((value) => value + 1); setMessage("Profile updated.");
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-6xl space-y-5">
    <h1 className="font-display text-3xl">Patient &amp; User Directory</h1>
    <p>Find an account by name, email, or phone, then select it to view contact actions.</p>
    {message && <p role="status" className="text-green-800">{message}</p>}
    {selected && user.role === "admin" ? <form onSubmit={save} className="card">
      <h2 className="font-display text-2xl">Update profile: {selected.firstName} {selected.lastName}</h2>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      <fieldset disabled={busy} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">{Object.entries(fields).map(([key, label]) => <label key={key} className="block">{label}<input className="input mt-1" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
        <div className="flex gap-3"><button type="submit" className="btn-primary">{busy ? "Saving…" : "Save profile"}</button><button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button></div>
      </fieldset>
    </form> : <PatientDirectory role={user.role} onEdit={edit} refreshKey={revision} />}
  </div>;
}
