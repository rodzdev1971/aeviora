import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { apiRequest } from "../util/api.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import { appointmentTime, dateInputValue, scheduleRange } from "../util/appointmentDisplay.js";

export default function Appointments() {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const [zone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [date, setDate] = useState(() => dateInputValue());
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [slots, setSlots] = useState([]);
  const [mine, setMine] = useState([]);
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([apiRequest("/api/appointments/providers", { signal: controller.signal }), apiRequest("/api/appointments/mine", { signal: controller.signal })])
      .then(([list, appointments]) => { setProviders(list.providers); setMine(appointments.appointments); setLoading(false); })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false); } });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!providerId || !date) return;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      const query = scheduleRange(date, zone);
      return apiRequest(`/api/appointments/providers/${providerId}/slots?${query}`, { signal: controller.signal });
    })
      .then((data) => { setSlots(data.slots); setSlotsLoading(false); })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setSlotsLoading(false); } });
    return () => controller.abort();
  }, [providerId, date, zone, revision]);
  const provider = providers.find((item) => item._id === providerId);
  const available = slots.filter((slot) => !mode || slot.mode === mode);
  function refresh() { setError(""); setSlots([]); setSlotsLoading(Boolean(providerId && date)); setSelected(null); setRevision((value) => value + 1); }
  async function action(slot, operation) {
    if (busy) return;
    if (operation === "cancel" && !window.confirm(say("Cancel this appointment?", "¿Cancelar esta cita?"))) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/appointments/providers/${slot.providerId}/slots/${slot._id}/${operation}`, { method: "POST" });
      setMessage(operation === "book" ? say("Your appointment is confirmed. Visit details are in My appointments below.", "Tu cita está confirmada. Los detalles están en Mis citas a continuación.") : say("Appointment cancelled.", "Cita cancelada."));
      refresh();
    } catch (failure) { setError(failure.message); setSelected(null); setSlots([]); setSlotsLoading(Boolean(providerId && date)); setRevision((value) => value + 1); }
    finally { setBusy(false); }
  }
  const status = (slot) => slot.status === "cancelled" ? say("Cancelled", "Cancelada") : new Date(slot.endsAt) < new Date() ? say("Past appointment", "Cita pasada") : say("Confirmed", "Confirmada");
  return <section className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs uppercase tracking-widest text-aeviora-gold">Aeviora Wellness</p><h1 className="mt-2 font-display text-3xl">{say("Book an appointment", "Reservar una cita")}</h1><p className="mt-3 text-sm text-aeviora-slate">{say("Choose a professional and an available time for telehealth or an in-person visit.", "Elige un profesional y un horario disponible para una visita virtual o presencial.")}</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button type="button" onClick={refresh} className="underline">{say("Refresh", "Actualizar")}</button></p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{message}</p>}
    <section className="card space-y-5" aria-labelledby="available-slots">
      <h2 id="available-slots" className="font-display text-2xl">{say("Available appointments", "Citas disponibles")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="label">{say("Professional", "Profesional")}<select className="input mt-2" value={providerId} disabled={loading || busy} onChange={(event) => { setProviderId(event.target.value); setSelected(null); setSlots([]); setSlotsLoading(Boolean(event.target.value)); }}><option value="">{say("Choose a provider", "Elige un profesional")}</option>{providers.filter((item) => item.active).map((item) => <option key={item._id} value={item._id}>{item.name} · {item.specialty}</option>)}</select></label>
        <label className="label">{say("Week starting", "Semana desde")}<input type="date" required className="input mt-2" value={date} onChange={(event) => { setDate(event.target.value); setSelected(null); setSlots([]); setSlotsLoading(Boolean(event.target.value && providerId)); }} /></label>
        <label className="label">{say("Visit type", "Tipo de visita")}<select className="input mt-2" value={mode} onChange={(event) => { setMode(event.target.value); setSelected(null); }}><option value="">{say("All types", "Todos los tipos")}</option><option value="telehealth">{say("Telehealth", "Teleconsulta")}</option><option value="in_person">{say("In person", "Presencial")}</option></select></label>
      </div>
      <p className="text-sm text-aeviora-slate">{say("All times shown in", "Todos los horarios en")} <strong>{zone}</strong>. {say("Each view covers seven days.", "Cada vista muestra siete días.")}</p>
      {provider && <div className="rounded-xl bg-aeviora-ivory p-4"><h3 className="font-semibold">{provider.name}{provider.credentials && `, ${provider.credentials}`}</h3><p className="text-sm">{provider.specialty}</p><p className="mt-2 whitespace-pre-line text-sm text-aeviora-slate">{provider.bio}</p></div>}
      {loading || slotsLoading ? <p role="status">{say("Loading appointments…", "Cargando citas…")}</p> : !providers.length ? <p>{say("No providers are available yet. Please check back soon.", "Aún no hay profesionales disponibles. Vuelve pronto.")}</p> : !providerId ? <p className="text-sm text-aeviora-slate">{say("Select a provider to see their available times.", "Selecciona un profesional para ver sus horarios disponibles.")}</p> : !available.length ? <p>{say("No available times in this week. Try another date, visit type or provider.", "No hay horarios disponibles esta semana. Prueba otra fecha, tipo de visita o profesional.")}</p> : <div className="grid gap-3 sm:grid-cols-2">{available.map((slot) => <button key={slot._id} type="button" disabled={busy} aria-pressed={selected?._id === slot._id} onClick={() => setSelected(slot)} className={`rounded-2xl border p-4 text-left hover:border-aeviora-primary ${selected?._id === slot._id ? "border-aeviora-primary bg-aeviora-softSage" : "border-aeviora-border"}`}><span className="block font-semibold">{appointmentTime(slot, zone, language)}</span><span className="mt-2 flex items-center gap-2 text-sm">{slot.mode === "telehealth" ? <Video size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}{slot.mode === "telehealth" ? say("Telehealth", "Teleconsulta") : slot.location}</span><span className="mt-2 block text-xs text-aeviora-slate">{Math.round((new Date(slot.endsAt) - new Date(slot.startsAt)) / 60000)} {say("minutes", "minutos")}</span></button>)}</div>}
      {selected && <div className="rounded-2xl border border-aeviora-primary p-5"><h3 className="font-semibold">{say("Confirm your selection", "Confirma tu selección")}</h3><p className="mt-2 text-sm">{selected.providerName} · {appointmentTime(selected, zone, language)} ({zone})</p><p className="mt-2 text-sm">{selected.mode === "telehealth" ? say("Your telehealth link will appear after booking.", "El enlace de teleconsulta aparecerá después de reservar.") : selected.location}</p><button type="button" disabled={busy} onClick={() => action(selected, "book")} className="btn-primary mt-4 disabled:opacity-50">{busy ? say("Booking…", "Reservando…") : say("Confirm appointment", "Confirmar cita")}</button></div>}
    </section>
    <section className="space-y-4" aria-labelledby="my-appointments"><h2 id="my-appointments" className="flex items-center gap-2 font-display text-2xl"><CalendarDays aria-hidden="true" />{say("My appointments", "Mis citas")}</h2><p className="text-sm text-aeviora-slate">{say("Upcoming visits and the last 90 days. Confirmation and cancellation updates appear here.", "Próximas visitas y últimos 90 días. Las confirmaciones y cancelaciones aparecen aquí.")}</p>
      {!loading && !mine.length && <p className="card">{say("You have no appointments yet.", "Aún no tienes citas.")}</p>}
      {mine.map((slot) => <article key={slot._id} className="card"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{slot.providerName}</h3><span className="text-sm font-semibold">{status(slot)}</span></div><p className="mt-2">{appointmentTime(slot, zone, language)} ({zone})</p><p className="mt-2 text-sm">{slot.mode === "telehealth" ? say("Telehealth", "Teleconsulta") : slot.location}</p>{slot.status === "cancelled" && <p className="mt-2 text-sm text-aeviora-slate">{slot.cancelledBy === "admin" ? say("Cancelled by the office. Choose a new available time or contact the office.", "Cancelada por la oficina. Elige otro horario disponible o contacta a la oficina.") : say("You cancelled this appointment.", "Cancelaste esta cita.")}</p>}<div className="mt-4 flex flex-wrap gap-3">{slot.status === "booked" && new Date(slot.endsAt) > new Date() && slot.meetingUrl && <a href={slot.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">{say("Open telehealth room", "Abrir sala de teleconsulta")}</a>}{slot.status === "booked" && new Date(slot.startsAt) > new Date() && <button type="button" disabled={busy} onClick={() => action(slot, "cancel")} className="btn-secondary disabled:opacity-50">{say("Cancel appointment", "Cancelar cita")}</button>}</div></article>)}
    </section>
  </section>;
}
