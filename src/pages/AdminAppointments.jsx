import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import { availabilitySlots } from "../../shared/appointments.js";
import { appointmentTime, scheduleRange } from "../util/appointmentDisplay.js";

function ProviderForm({ provider, busy, save, say }) {
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(["name", "credentials", "specialty", "email", "phone", "timeZone", "bio"].map((name) => [name, form.get(name)]));
    data.active = form.has("active");
    if (provider) data.revision = provider.revision;
    await save(data);
  }
  return <form onSubmit={submit} className="card space-y-4"><h2 className="font-display text-2xl">{provider ? say("Edit provider", "Editar profesional") : say("Add provider", "Agregar profesional")}</h2>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {[["name", say("Full name", "Nombre completo"), "text", 120, true], ["credentials", say("Credentials", "Credenciales"), "text", 80, false], ["specialty", say("Specialty", "Especialidad"), "text", 120, true], ["email", say("Office email (admin only)", "Correo de oficina (solo admin)"), "email", 254, true], ["phone", say("Office phone", "Teléfono de oficina"), "tel", 40, false], ["timeZone", say("Time zone (IANA)", "Zona horaria (IANA)"), "text", 80, true]].map(([name, label, type, maxLength, required]) => <label key={name} className="label">{label}<input className="input mt-2" name={name} type={type} required={required} maxLength={maxLength} defaultValue={provider?.[name] ?? (name === "timeZone" ? "America/New_York" : "")} /></label>)}
      <label className="label sm:col-span-2">{say("Short professional bio", "Breve biografía profesional")}<textarea name="bio" rows={3} maxLength={1000} className="input mt-2" defaultValue={provider?.bio || ""} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={provider?.active ?? true} />{say("Active — allow new bookings", "Activo — permitir nuevas reservas")}</label>
      <p className="text-xs leading-5 text-aeviora-slate sm:col-span-2">{say("Use America/New_York, America/Chicago, America/Denver, America/Los_Angeles or another IANA zone. Deactivating hides availability but preserves existing appointments. Provider profiles do not create login accounts.", "Usa America/New_York, America/Chicago, America/Denver, America/Los_Angeles u otra zona IANA. Desactivar oculta disponibilidad pero conserva las citas existentes. Los perfiles no crean cuentas de acceso.")}</p>
      <button type="submit" className="btn-primary sm:col-span-2">{busy ? say("Saving…", "Guardando…") : say("Save provider", "Guardar profesional")}</button>
    </fieldset>
  </form>;
}

function AvailabilityForm({ provider, busy, publish, say }) {
  const [form, setForm] = useState({ start: "", end: "", duration: 30, mode: "telehealth", meetingUrl: "", location: "" });
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  function change(name, value) { setForm((current) => ({ ...current, [name]: value })); setPreview(null); setError(""); }
  function review(event) {
    event.preventDefault();
    try { const slots = availabilitySlots(form, provider.timeZone); setPreview(slots); setError(""); }
    catch (failure) { setError(failure.issues?.[0]?.message || failure.message); }
  }
  return <form onSubmit={review} className="card space-y-4"><h2 className="font-display text-2xl">{say("Publish availability", "Publicar disponibilidad")}</h2><p className="text-sm text-aeviora-slate">{say("Enter times in the provider's time zone:", "Ingresa las horas en la zona del profesional:")} <strong>{provider.timeZone}</strong></p>
    <fieldset disabled={busy || !provider.active} className="grid gap-4 sm:grid-cols-2">
      <label className="label">{say("Start", "Inicio")}<input required type="datetime-local" className="input mt-2" value={form.start} onChange={(event) => change("start", event.target.value)} /></label>
      <label className="label">{say("End", "Fin")}<input required type="datetime-local" className="input mt-2" value={form.end} onChange={(event) => change("end", event.target.value)} /></label>
      <label className="label">{say("Slot length (minutes)", "Duración (minutos)")}<input required type="number" min={15} max={120} step={1} className="input mt-2" value={form.duration} onChange={(event) => change("duration", Number(event.target.value))} /></label>
      <label className="label">{say("Visit type", "Tipo de visita")}<select className="input mt-2" value={form.mode} onChange={(event) => change("mode", event.target.value)}><option value="telehealth">{say("Telehealth", "Teleconsulta")}</option><option value="in_person">{say("In person", "Presencial")}</option></select></label>
      {form.mode === "telehealth" ? <label className="label sm:col-span-2">{say("HTTPS telehealth room link", "Enlace HTTPS de teleconsulta")}<input required type="url" maxLength={500} placeholder="https://" className="input mt-2" value={form.meetingUrl} onChange={(event) => change("meetingUrl", event.target.value)} /></label> : <label className="label sm:col-span-2">{say("Full address and suite / location", "Dirección completa y oficina / ubicación")}<input required minLength={5} maxLength={300} className="input mt-2" value={form.location} onChange={(event) => change("location", event.target.value)} /></label>}
      <p className="text-xs leading-5 text-aeviora-slate sm:col-span-2">{say("Default: 30 minutes. Add one availability window at a time, up to 12 hours. Existing slots cannot overlap, even across different visit types.", "Predeterminado: 30 minutos. Agrega una ventana a la vez, hasta 12 horas. Los horarios no pueden superponerse, incluso con distintos tipos de visita.")}</p>
      <button type="submit" className="btn-secondary sm:col-span-2">{say("Preview slots", "Vista previa de horarios")}</button>
    </fieldset>
    {!provider.active && <p className="text-sm">{say("Activate this provider to publish availability.", "Activa este profesional para publicar disponibilidad.")}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {preview && <div className="rounded-xl bg-aeviora-softSage p-4"><p className="font-semibold">{preview.length} {say("slots", "horarios")} · {form.duration} {say("minutes each", "minutos cada uno")}</p><p className="mt-2 text-sm">{form.start.replace("T", " ")} → {form.end.replace("T", " ")} ({provider.timeZone})</p><button type="button" disabled={busy || !provider.active} onClick={async () => { if (await publish(form)) setPreview(null); }} className="btn-primary mt-4 disabled:opacity-50">{busy ? say("Publishing…", "Publicando…") : say("Publish these slots", "Publicar estos horarios")}</button></div>}
  </form>;
}

export default function AdminAppointments() {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const provider = providers.find((item) => item._id === providerId);
  const zone = provider?.timeZone;
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/appointments/providers", { signal: controller.signal }).then((data) => { setProviders(data.providers); setLoading(false); })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false); } });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!providerId || !zone) return;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      const query = date ? `?${scheduleRange(date, zone)}` : "";
      return apiRequest(`/api/appointments/providers/${providerId}/slots${query}`, { signal: controller.signal });
    }).then((data) => { if (!controller.signal.aborted) { setSlots(data.slots); setSlotsLoading(false); } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setSlotsLoading(false); } });
    return () => controller.abort();
  }, [providerId, date, zone, revision]);
  function reloadSchedule(nextDate = date) { setDate(nextDate); setSlots([]); setSlotsLoading(Boolean(providerId)); setRevision((value) => value + 1); }
  function refresh() { setError(""); reloadSchedule(); }
  async function run(task, success, scheduleDate) {
    if (busy) return null;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await task();
      setMessage(success);
      if (scheduleDate !== undefined) setFilter("");
      reloadSchedule(scheduleDate);
      return result;
    }
    catch (failure) {
      setError(failure.message);
      if (scheduleDate !== undefined) { setFilter(""); reloadSchedule(scheduleDate); }
      return null;
    }
    finally { setBusy(false); }
  }
  async function save(data) {
    const result = await run(() => apiRequest(`/api/appointments/providers${provider ? `/${provider._id}` : ""}`, { method: provider ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), say("Provider saved.", "Profesional guardado."));
    if (result) { setProviderId(result.provider._id); setSlotsLoading(true); }
  }
  function slotAction(slot, operation) {
    if (operation === "cancel" && !window.confirm(say("Cancel this patient's appointment? The cancellation will appear in their account. Contact them directly about the change.", "¿Cancelar la cita del paciente? La cancelación aparecerá en su cuenta. Contáctalo directamente sobre el cambio."))) return;
    if (operation === "remove" && !window.confirm(say("Remove this unbooked slot?", "¿Eliminar este horario sin reserva?"))) return;
    run(() => apiRequest(`/api/appointments/providers/${providerId}/slots/${slot._id}/${operation}`, { method: "POST" }), say("Schedule updated.", "Agenda actualizada."));
  }
  const statusLabel = (value) => ({ available: say("Available", "Disponible"), booked: say("Booked", "Reservada"), blocked: say("Blocked", "Bloqueada"), cancelled: say("Cancelled", "Cancelada") })[value];
  return <section className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-xs uppercase tracking-widest text-aeviora-gold">{say("Administration", "Administración")}</p><h1 className="mt-2 font-display text-3xl">{say("Providers & appointments", "Profesionales y citas")}</h1><p className="mt-3 text-sm text-aeviora-slate">{say("Manage provider profiles, publish availability and oversee bookings.", "Gestiona perfiles, publica disponibilidad y supervisa reservas.")}</p><Link to="/appointments" className="mt-4 inline-block text-sm underline">{say("Open patient booking page", "Abrir página de reservas")}</Link></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button type="button" onClick={refresh} className="underline">{say("Reload", "Recargar")}</button></p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{message}</p>}
    <label className="label">{say("Select a provider to manage", "Selecciona un profesional")}<select className="input mt-2 max-w-xl" value={providerId} disabled={busy || loading} onChange={(event) => { setProviderId(event.target.value); setDate(""); setFilter(""); setSlots([]); setSlotsLoading(Boolean(event.target.value)); setError(""); setMessage(""); }}><option value="">{say("+ Add a new provider", "+ Agregar un profesional")}</option>{providers.map((item) => <option key={item._id} value={item._id}>{item.name}{!item.active ? say(" (inactive)", " (inactivo)") : ""}</option>)}</select></label>
    {loading ? <p role="status">{say("Loading providers…", "Cargando profesionales…")}</p> : <div className="grid items-start gap-6 xl:grid-cols-2"><ProviderForm key={provider ? `${provider._id}-${provider.revision}` : "new"} provider={provider} busy={busy} save={save} say={say} />{provider && <AvailabilityForm key={`${provider._id}-${provider.timeZone}`} provider={provider} busy={busy} say={say} publish={(data) => run(() => apiRequest(`/api/appointments/providers/${providerId}/availability`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), say("Availability published. The saved slots are shown in Schedule & bookings below.", "Disponibilidad publicada. Los horarios guardados aparecen en Agenda y reservas a continuación."), date ? data.start.slice(0, 10) : "")} />}</div>}
    {provider && <section className="card space-y-5" aria-labelledby="provider-schedule"><h2 id="provider-schedule" className="font-display text-2xl">{say("Schedule & bookings", "Agenda y reservas")}</h2><div className="flex flex-wrap gap-4"><label className="label">{say("Week starting", "Semana desde")}<input type="date" className="input mt-2" value={date} onChange={(event) => { setDate(event.target.value); setSlots([]); setSlotsLoading(true); }} /></label><button type="button" disabled={busy} onClick={() => { setFilter(""); reloadSchedule(""); }} className="self-end btn-secondary mb-2">{say("All dates", "Todas las fechas")}</button><label className="label">{say("Status", "Estado")}<select className="input mt-2" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">{say("All slots", "Todos los horarios")}</option>{["available", "booked", "blocked", "cancelled"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><button type="button" disabled={busy} onClick={refresh} className="self-end btn-secondary mb-2">{say("Refresh schedule", "Actualizar agenda")}</button></div><p role="status" className="text-sm text-aeviora-slate">{date ? say(`Showing seven days starting ${date}.`, `Mostrando siete días desde ${date}.`) : say("Showing all saved slots for this provider. Choose a week to narrow the list.", "Mostrando todos los horarios guardados de este profesional. Elige una semana para filtrar la lista.")}</p><p className="text-sm text-aeviora-slate">{say("Times shown in", "Horarios en")} <strong>{provider.timeZone}</strong>. {say("Remove and recreate an unbooked slot to change its time or location. For a booked visit, cancel it and arrange a new time with the patient.", "Elimina y vuelve a crear un horario sin reserva para cambiar su hora o ubicación. Para una cita reservada, cancélala y acuerda otro horario con el paciente.")}</p>
      {slotsLoading ? <p role="status">{say("Loading schedule…", "Cargando agenda…")}</p> : !slots.filter((slot) => !filter || slot.status === filter).length ? <p>{say("No matching slots for the selected dates and status.", "No hay horarios coincidentes para las fechas y el estado seleccionados.")}</p> : <div className="grid gap-4 lg:grid-cols-2">{slots.filter((slot) => !filter || slot.status === filter).map((slot) => <article key={slot._id} className="rounded-2xl border border-aeviora-border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{appointmentTime(slot, provider.timeZone, language)}</h3><span className="text-sm">{statusLabel(slot.status)}</span></div><p className="mt-2 text-sm">{slot.mode === "telehealth" ? say("Telehealth", "Teleconsulta") : slot.location}</p>{slot.patientName && <p className="mt-2 text-sm">{slot.patientName} · {slot.patientEmail}</p>}{slot.meetingUrl && <a href={slot.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">{say("Telehealth room", "Sala de teleconsulta")}</a>}<div className="mt-4 flex flex-wrap gap-2">{new Date(slot.startsAt) > new Date() && <>{slot.status === "available" && <button type="button" disabled={busy} onClick={() => slotAction(slot, "block")} className="btn-secondary">{say("Block", "Bloquear")}</button>}{["blocked", "cancelled"].includes(slot.status) && <button type="button" disabled={busy || !provider.active} onClick={() => slotAction(slot, "open")} className="btn-secondary">{say("Reopen time", "Reabrir horario")}</button>}{slot.status === "booked" && <button type="button" disabled={busy} onClick={() => slotAction(slot, "cancel")} className="btn-secondary text-red-700">{say("Cancel booking", "Cancelar reserva")}</button>}</>}{["available", "blocked"].includes(slot.status) && <button type="button" disabled={busy} onClick={() => slotAction(slot, "remove")} className="btn-secondary">{say("Remove slot", "Eliminar horario")}</button>}</div></article>)}</div>}
    </section>}
  </section>;
}
