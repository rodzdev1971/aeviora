import { useEffect, useState } from "react";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";

export default function AdminBusinessInvitations() {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [form, setForm] = useState({ businessName: "", email: "" });
  const [result, setResult] = useState(null), [rows, setRows] = useState(null);
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/business-invitations/admin?page=${page}`, { signal: controller.signal }).then(setRows).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [page, revision]);
  async function send(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      setResult(await apiRequest("/api/business-invitations/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function revoke(id) {
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/business-invitations/admin/${id}/revoke`, { method: "POST" });
      if (result?.id === id) setResult(null);
      setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4">
    <h3 className="text-xl font-semibold">{say("Invite a business to register", "Invitar a un negocio a registrarse")}</h3>
    <p className="text-sm">{say("Email a private registration link and access code. Invitations expire in 7 days. The business submits its own contact details; the current default affiliate terms are saved with the invitation.", "Envía un enlace privado y un código de acceso por correo. Las invitaciones vencen en 7 días. El negocio completa sus datos; las condiciones predeterminadas actuales se guardan con la invitación.")}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <form onSubmit={send} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">{say("Invited business name", "Nombre del negocio invitado")}<input required maxLength={160} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="input mt-2" /></label>
      <label className="block text-sm font-semibold">{say("Invitation email", "Correo de invitación")}<input required type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input mt-2" /></label>
      <button disabled={busy} className="btn-primary sm:col-span-2">{say(busy ? "Please wait…" : "Create and email invitation", busy ? "Espera…" : "Crear y enviar invitación")}</button>
    </form>
    {result && <div className="space-y-3 rounded-xl bg-aeviora-cream p-4">
      <p role={result.delivery === "failed" ? "alert" : "status"}>{result.message}</p>
      {result.delivery === "failed" && <p className="text-sm">{say("The invitation was saved. Copy the private link to deliver it yourself, or revoke it before creating another invitation.", "La invitación se guardó. Copia el enlace privado para enviarlo, o revócala antes de crear otra invitación.")}</p>}
      <label className="block text-sm">{say("Private registration link", "Enlace privado de registro")}<input readOnly value={result.link} onFocus={(e) => e.target.select()} className="input mt-2" /></label>
      <label className="block text-sm">{say("Invitation access code", "Código de acceso")}<input readOnly value={result.code} onFocus={(e) => e.target.select()} className="input mt-2 font-mono" /></label>
      <p className="text-xs">{say("Keep these private. They are shown only when the invitation is created.", "Mantén estos datos privados. Solo se muestran al crear la invitación.")}</p>
    </div>}
    <div className="space-y-3">
      <h4 className="font-semibold">{say("Business registration invitations", "Invitaciones de registro comercial")}</h4>
      <button type="button" className="text-sm underline" onClick={() => setRevision((v) => v + 1)}>{say("Reload invitations", "Recargar invitaciones")}</button>
      {rows?.invitations.map((item) => <article key={item._id} className="rounded-xl border p-3 text-sm">
        <p className="font-semibold">{item.businessName}</p><p className="break-all">{item.email}</p>
        <p>{["pending", "processing"].includes(item.status) && new Date(item.expiresAt) <= new Date() ? say("Expired", "Vencida") : ({ pending: say("Pending", "Pendiente"), processing: say("Registration in progress", "Registro en proceso"), completed: say("Registered", "Registrado"), revoked: say("Revoked", "Revocada") })[item.status]} · {say("Expires", "Vence")}: {new Date(item.expiresAt).toLocaleString(getLanguage() === "es" ? "es-US" : "en-US")}</p>
        {item.status === "pending" && <button type="button" disabled={busy} onClick={() => revoke(item._id)} className="mt-2 text-red-700 underline">{say("Revoke invitation", "Revocar invitación")}</button>}
      </article>)}
      {rows && !rows.invitations.length && <p>{say("No business invitations yet.", "Todavía no hay invitaciones.")}</p>}
      <div className="flex items-center gap-4 text-sm"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">{say("Previous", "Anterior")}</button><span>{page} / {Math.max(1, rows?.totalPages || 1)}</span><button disabled={!rows || page >= rows.totalPages} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">{say("Next", "Siguiente")}</button></div>
    </div>
  </section>;
}
