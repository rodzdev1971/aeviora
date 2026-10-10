import { useEffect, useState } from "react";
import { apiRequest } from "../util/api";
import { emailTemplates, fillEmailTemplate } from "../util/emailTemplates";
import { Link } from "react-router-dom";
import { renderEmailTemplate } from "../../shared/emailTemplates";

export default function AdminEmailForm({ recipient, onClose }) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(null);
  const [configurationIssues, setConfigurationIssues] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateRevision, setTemplateRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/admin/email-templates", { signal: controller.signal }).then((data) => setSavedTemplates(data.templates)).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [templateRevision]);
  const [checking, setChecking] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [checkRevision, setCheckRevision] = useState(0);
  async function verifyConnection() {
    setChecking(true); setError(""); setConnectionMessage("");
    try {
      const result = await apiRequest("/api/admin/email/verify", { method: "POST" });
      setConnectionMessage(result.message);
    } catch (failure) { setError(failure.message); }
    finally { setChecking(false); }
  }
  function applyTemplate() {
    if ((subject || text) && !window.confirm("Replace the current subject and message with this template?")) return;
    const template = emailTemplates.find((item) => item.id === templateId);
    const saved = savedTemplates.find((item) => item._id === templateId);
    const draft = saved ? renderEmailTemplate(saved, recipient) : template ? fillEmailTemplate(template, recipient) : { subject: "", text: "" };
    setSubject(draft.subject); setText(draft.text); setMessage("");
  }
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/admin/email/status", { signal: controller.signal })
      .then((data) => { setConfigured(data.configured); setConfigurationIssues(data.issues || []); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [checkRevision]);
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
      <div className="space-y-3 rounded-lg border border-aeviora-border p-4">
        <h3 className="font-semibold">Email setup and testing</h3>
        <p role="status" className="text-sm">{configured === null ? "Configuration has not been confirmed." : configured ? "Required settings are valid. Test the connection to check SMTP authentication." : "Configuration needs attention. Review the settings listed below."}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || checking} className="btn-secondary" onClick={() => { setConfigured(null); setError(""); setConnectionMessage(""); setCheckRevision((value) => value + 1); }}>Recheck configuration</button>
          <button type="button" disabled={busy || checking || configured !== true} className="btn-secondary disabled:opacity-50" onClick={verifyConnection}>{checking ? "Testing connection…" : "Test SMTP connection"}</button>
        </div>
        {connectionMessage && <p role="status" className="text-sm text-green-800">{connectionMessage}</p>}
        <p className="text-xs text-aeviora-slate">Connection testing sends no email. To test delivery, select your own account and send a message. After changing Vercel settings, redeploy; local settings require restarting Node.js.</p>
      </div>
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
            {savedTemplates.map((template) => <option key={template._id} value={template._id}>{template.name} (saved)</option>)}
            {emailTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={applyTemplate} className="btn-secondary">Use template</button>
      </div>
      <p className="text-sm text-aeviora-slate">Templates fill in the recipient's first name. Edit the subject and message before sending.</p>
      <div className="flex gap-4 text-sm"><Link to="/admin/email-templates" className="underline">Create or edit saved templates</Link><button type="button" disabled={busy} className="underline" onClick={() => setTemplateRevision((value) => value + 1)}>Refresh templates</button></div>
      <label className="block">Subject
        <input autoFocus required maxLength={160} value={subject} disabled={busy} onChange={(event) => setSubject(event.target.value)} className="input mt-1 w-full" />
      </label>
      <label className="block">Message
        <textarea required maxLength={10000} rows={7} value={text} disabled={busy} onChange={(event) => setText(event.target.value)} className="input mt-1 w-full" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || checking || configured !== true || !subject.trim() || !text.trim()} className="btn-primary disabled:opacity-50">{busy ? "Sending…" : "Send email"}</button>
        <button type="button" disabled={busy} onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </form>
  );
}
