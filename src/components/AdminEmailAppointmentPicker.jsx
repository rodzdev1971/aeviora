import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage, getLocale } from "../i18n/language.js";
import { apiRequest } from "../util/api.js";
import { renderEmailTemplate } from "../../shared/emailTemplates.js";

export default function AdminEmailAppointmentPicker({ recipientId, selected, onChange, disabled }) {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [result, setResult] = useState(null), [revision, setRevision] = useState(0), [error, setError] = useState("");
  const key = `${recipientId}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/email/appointments/${recipientId}`, { signal: controller.signal, cache: "no-store" }).then((data) => setResult({ ...data, key })).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [recipientId, key]);
  const ready = result?.key === key;
  const appointments = ready ? result.appointments : [];
  const value = selected ? `${selected.providerId}:${selected.slotId}` : "";
  return <div className="space-y-3 rounded-xl border border-aeviora-border p-4">
    <label className="block text-sm font-semibold" htmlFor="email-appointment">{say("Appointment for this email", "Cita para este correo")}</label>
    <p className="text-xs leading-6 text-aeviora-slate">{say("Choose the recipient's booking to fill appointment date, time and provider placeholders. Times use the provider's time zone. Optional for other messages.", "Elige la reserva del destinatario para completar la fecha, hora y profesional. La hora usa la zona horaria del profesional. Es opcional para otros mensajes.")}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!ready && !error && <p role="status" className="text-sm">{say("Loading booked appointments…", "Cargando citas reservadas…")}</p>}
    <select id="email-appointment" className="input" disabled={disabled || !ready} value={value} onChange={(event) => onChange(appointments.find((item) => `${item.providerId}:${item.slotId}` === event.target.value) || null)}>
      <option value="">{say("Select an appointment (if needed)", "Selecciona una cita (si es necesario)")}</option>
      {appointments.map((item) => <option key={`${item.providerId}:${item.slotId}`} value={`${item.providerId}:${item.slotId}`}>{renderEmailTemplate({ subject: "", text: "{{appointmentDate}} · {{appointmentTime}} · {{providerName}}" }, {}, item, getLocale()).text}</option>)}
    </select>
    {ready && !appointments.length && <p className="text-sm">{say("No current or recent booked appointments for this recipient. Book the consultation first to use appointment placeholders.", "Este destinatario no tiene citas reservadas actuales o recientes. Reserva la consulta primero para usar estos marcadores.")}</p>}
    <button type="button" disabled={disabled} className="text-sm underline" onClick={() => { setError(""); onChange(null); setRevision((current) => current + 1); }}>{say("Refresh appointments", "Actualizar citas")}</button>
  </div>;
}
