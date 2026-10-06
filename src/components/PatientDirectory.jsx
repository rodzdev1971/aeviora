import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { apiRequest } from "../util/api";
import AdminEmailForm from "./AdminEmailForm";

export default function PatientDirectory({ role, onEdit, refreshKey }) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      apiRequest(`/api/users?search=${encodeURIComponent(search)}`, { signal: controller.signal })
        .then(({ users }) => { setUsers(users); setSelected((current) => current ? users.find((user) => user._id === current._id) || current : null); })
        .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, refreshKey]);
  return (
    <section className="card lg:col-span-2">
      <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">{role === "admin" ? "Administrator" : "Provider"} workspace</p>
      <h2 className="mt-2 font-display text-2xl">Patient and user directory</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">Search by name, email, or phone
          <input type="search" maxLength={100} value={search} disabled={composing} onChange={(event) => { setSearch(event.target.value); setLoading(true); }} className="input mt-2 w-full" placeholder="Find a patient or user" />
        </label>
        <label className="block">Select a patient or user
          <select value={selected?._id || ""} disabled={loading || composing || Boolean(error)} onChange={(event) => setSelected(users.find((user) => user._id === event.target.value) || null)} className="input mt-2 w-full">
            <option value="">Choose an account</option>
            {selected && !users.some((user) => user._id === selected._id) && <option value={selected._id}>{selected.firstName} {selected.lastName} — selected</option>}
            {users.map((user) => <option key={user._id} value={user._id}>{user.firstName} {user.lastName} — {user.email} ({user.role})</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      <p role="status" className="mt-3 text-sm text-aeviora-slate">{loading ? "Searching…" : `${users.length} matching accounts. Showing up to 100; narrow your search for more specific results.`}</p>
      {selected && <div className="mt-5 rounded-xl border border-aeviora-border p-4">
        <h3 className="font-semibold">{selected.firstName} {selected.lastName}</h3>
        <p className="break-words text-sm text-aeviora-slate">{selected.email} · {selected.phone}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {role === "admin" ? <button type="button" disabled={composing || selected.accountStatus === "deleted"} onClick={() => setComposing(true)} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Mail size={16} aria-hidden="true" />Compose email</button> : <a href={`mailto:${selected.email}`} className="btn-outline">Email</a>}
          <a href={`tel:${selected.phone}`} className="btn-outline inline-flex items-center gap-2"><Phone size={16} aria-hidden="true" />Call</a>
          {role === "admin" && <button type="button" disabled={composing} onClick={() => onEdit(selected)} className="btn-secondary">Update profile</button>}
        </div>
        {composing && role === "admin" && <AdminEmailForm key={selected._id} recipient={selected} onClose={() => setComposing(false)} />}
      </div>}
    </section>
  );
}
