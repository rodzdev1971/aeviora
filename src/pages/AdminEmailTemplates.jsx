import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api";
import { renderEmailTemplate } from "../../shared/emailTemplates";

const blank = { name: "", subject: "", text: "" };
export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(blank);
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/admin/email-templates", { signal: controller.signal }).then((data) => setTemplates(data.templates)).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [reload]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const { template } = await apiRequest(`/api/admin/email-templates${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setTemplates((current) => [...current.filter((item) => item._id !== template._id), template]); setId(template._id); setMessage("Template saved.");
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm("Delete this saved template?")) return;
    setBusy(true); setError("");
    try { await apiRequest(`/api/admin/email-templates/${id}`, { method: "DELETE" }); setTemplates((current) => current.filter((item) => item._id !== id)); setId(""); setForm(blank); setMessage("Template deleted."); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const preview = renderEmailTemplate(form, { firstName: "Alex", lastName: "Example", accountStatus: "pending" });
  return <section className="mx-auto max-w-4xl space-y-5">
    <Link to="/admin" className="underline">Back to administration</Link>
    <h1 className="font-display text-3xl">Email templates</h1>
    <p>Create reusable messages for the admin email composer. Edit Registration welcome to change the automatic email sent after signup.</p>
    <p className="text-sm">Available placeholders: {"{{firstName}}, {{lastName}}, {{accountStatus}}"}. Messages are plain text.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status" className="text-green-800">{message}</p>}
    <label className="block">Saved template<select className="input mt-2" disabled={busy} value={id} onChange={(event) => { const template = templates.find((item) => item._id === event.target.value); setId(event.target.value); setForm(template ? { name: template.name, subject: template.subject, text: template.text } : blank); setMessage(""); }}><option value="">New template</option>{templates.map((template) => <option key={template._id} value={template._id}>{template.name}{template._id === "registration" ? " (automatic registration)" : ""}</option>)}</select></label>
    <button type="button" className="text-sm underline" disabled={busy} onClick={() => { setError(""); setReload((value) => value + 1); }}>Reload templates</button>
    <form onSubmit={save} className="card"><fieldset disabled={busy} className="space-y-4">
      <label className="block">Template name<input required maxLength={100} className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className="block">Subject<input required maxLength={160} className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
      <label className="block">Message<textarea required maxLength={10000} rows={10} className="input" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} /></label>
      {id === "registration" && <p>Keep {"{{accountStatus}}"} in this template to explain pending or active status accurately. Saving affects future registrations.</p>}
      <div className="flex gap-3"><button className="btn-primary" type="submit">{busy ? "Saving…" : "Save template"}</button>{id && id !== "registration" && <button type="button" className="btn-secondary" onClick={remove}>Delete template</button>}</div>
    </fieldset></form>
    <section className="card"><h2 className="font-semibold">Preview with sample recipient</h2><p className="mt-3 font-semibold">{preview.subject}</p><p className="mt-3 whitespace-pre-wrap break-words">{preview.text}</p></section>
  </section>;
}
