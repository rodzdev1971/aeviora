import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";
import { emailTemplates, fillEmailTemplate } from "../util/emailTemplates";

export default function AdminEmailForm({ recipient, onClose }) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(null);
  const [configurationIssues, setConfigurationIssues] = useState([]);
  const [templateId, setTemplateId] = useState("");
  function applyTemplate() {
    if ((subject || text) && !window.confirm("Replace the current subject and message with this template?")) return;
    const template = emailTemplates.find((item) => item.id === templateId);
    const draft = template ? fillEmailTemplate(template, recipient) : { subject: "", text: "" };
    setSubject(draft.subject); setText(draft.text); setMessage("");
  }
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/admin/email/status", { signal: controller.signal })
      .then((data) => { setConfigured(data.configured); setConfigurationIssues(data.issues || []); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest("/api/admin/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recipient._id, subject, text }),
      });
      setMessage(result.message); setSubject(""); setText("");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border border-aeviora-border bg-white p-5" aria-labelledby="email-heading">
      <h2 id="email-heading" className="font-display text-2xl">Email user</h2>
      <p className="break-words">To: {recipient.firstName} {recipient.lastName} ({recipient.email})</p>
      <p className="text-sm text-aeviora-slate">Send account support messages. Do not include medical records or use this form for marketing campaigns.</p>
      {configured === false && <p role="alert">Email is not configured. Add SMTP settings on the server before sending.</p>}
      {configured === false && <ul className="list-disc pl-5 text-sm text-red-700">{configurationIssues.map((issue) => <li key={issue.variable}>{issue.variable}: {issue.reason}. {issue.hint}</li>)}</ul>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status" className="text-green-800">{message}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">Email template
          <select value={templateId} disabled={busy} onChange={(event) => setTemplateId(event.target.value)} className="input mt-1 w-full">
            <option value="">Blank email</option>
            {emailTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={applyTemplate} className="btn-secondary">Use template</button>
      </div>
      <p className="text-sm text-aeviora-slate">Templates fill in the recipient's first name. Edit the subject and message before sending.</p>
      <label className="block">Subject
        <input autoFocus required maxLength={160} value={subject} disabled={busy} onChange={(event) => setSubject(event.target.value)} className="input mt-1 w-full" />
      </label>
      <label className="block">Message
        <textarea required maxLength={10000} rows={7} value={text} disabled={busy} onChange={(event) => setText(event.target.value)} className="input mt-1 w-full" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || configured !== true || !subject.trim() || !text.trim()} className="btn-primary disabled:opacity-50">{busy ? "Sending…" : "Send email"}</button>
        <button type="button" disabled={busy} onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </form>
  );
}
