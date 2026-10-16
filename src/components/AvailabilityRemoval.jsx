import { useState } from "react";
import { apiRequest } from "../util/api.js";
import { dateInputValue } from "../util/appointmentDisplay.js";

export default function AvailabilityRemoval({ provider, busy, remove, say }) {
  const [date, setDate] = useState(() => dateInputValue(new Date(), provider.timeZone));
  const [scope, setScope] = useState("day");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  function resetPreview() { setPreview(null); setError(""); }
  async function review(event) {
    event.preventDefault();
    if (loading || busy) return;
    const selection = scope === "day" ? { scope, date } : { scope, date, startTime, endTime };
    setLoading(true); setError(""); setPreview(null);
    try {
      const data = await apiRequest(`/api/appointments/providers/${provider._id}/availability/removal-preview`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selection),
      });
      setPreview({ ...data, selection });
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  return <form onSubmit={review} className="card space-y-4" aria-label={say("Remove availability", "Eliminar disponibilidad")}>
    <h2 className="font-display text-2xl">{say("Remove availability", "Eliminar disponibilidad")}</h2>
    <p className="text-sm text-aeviora-slate">{say("Remove unbooked slots for a whole day or selected hours. Booked appointments and cancellation history are kept.", "Elimina horarios sin reserva de un día completo o de horas seleccionadas. Las citas reservadas y el historial de cancelaciones se conservan.")}</p>
    <p className="text-sm">{say("Provider's time zone:", "Zona horaria del profesional:")} <strong>{provider.timeZone}</strong></p>
    <fieldset disabled={busy || loading} className="grid gap-4 sm:grid-cols-2">
      <label className="label">{say("Date to remove", "Fecha para eliminar")}<input required type="date" className="input mt-2" value={date} onChange={(event) => { setDate(event.target.value); resetPreview(); }} /></label>
      <label className="label">{say("Remove", "Eliminar")}<select className="input mt-2" value={scope} onChange={(event) => { setScope(event.target.value); resetPreview(); }}><option value="day">{say("Whole day", "Día completo")}</option><option value="hours">{say("Selected hours", "Horas seleccionadas")}</option></select></label>
      {scope === "hours" && <>
        <label className="label">{say("From", "Desde")}<input required type="time" className="input mt-2" value={startTime} onChange={(event) => { setStartTime(event.target.value); resetPreview(); }} /></label>
        <label className="label">{say("Until", "Hasta")}<input required type="time" className="input mt-2" value={endTime} onChange={(event) => { setEndTime(event.target.value); resetPreview(); }} /></label>
      </>}
      <p className="text-xs leading-5 text-aeviora-slate sm:col-span-2">{say("Any available or blocked slot overlapping this day or time range is removed in full, across both visit types. Review the count before confirming.", "Cualquier horario disponible o bloqueado que se superponga con este día o intervalo se elimina por completo, para ambos tipos de visita. Revisa la cantidad antes de confirmar.")}</p>
      <button type="submit" className="btn-secondary sm:col-span-2">{loading ? say("Checking slots…", "Revisando horarios…") : say("Preview removal", "Vista previa de eliminación")}</button>
    </fieldset>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {preview && <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="font-semibold">{provider.name} · {preview.selection.date} · {preview.selection.scope === "day" ? say("Whole day", "Día completo") : `${preview.selection.startTime}–${preview.selection.endTime}`} ({provider.timeZone})</p>
      <p role="status">{preview.removableCount} {say("unbooked slots will be removed.", "horarios sin reserva se eliminarán.")} {preview.bookedCount} {say("booked appointments will be kept.", "citas reservadas se conservarán.")}</p>
      {preview.removableCount > 0 ? <button type="button" disabled={busy || loading} onClick={async () => {
        await remove({ selection: preview.selection, revision: preview.revision });
        setPreview(null);
      }} className="btn-secondary text-red-700 disabled:opacity-50">{busy ? say("Removing…", "Eliminando…") : say(`Remove ${preview.removableCount} unbooked slots`, `Eliminar ${preview.removableCount} horarios sin reserva`)}</button> : <p className="text-sm">{say("There are no unbooked slots to remove in this selection.", "No hay horarios sin reserva para eliminar en esta selección.")}</p>}
    </div>}
  </form>;
}
