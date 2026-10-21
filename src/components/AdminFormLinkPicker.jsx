import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import { apiRequest } from "../util/api.js";
import { subscribeFormLibraryRefresh } from "../util/formLibraryEvents.js";

export default function AdminFormLinkPicker({ selected, onChange, disabled }) {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [revision, setRevision] = useState(0), [result, setResult] = useState(null), [error, setError] = useState("");
  const key = `${search}:${page}:${revision}`;
  useEffect(() => subscribeFormLibraryRefresh(() => {
    setError("");
    setRevision((value) => value + 1);
  }), []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiRequest(`/api/admin/form-links?enabled=true&search=${encodeURIComponent(search)}&page=${page}`, { signal: controller.signal, cache: "no-store" }).then((data) => setResult({ ...data, key })).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, key]);
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-aeviora-border p-4">
    <legend className="px-2 font-semibold">{say("Saved form links & QR codes", "Enlaces y códigos QR guardados")}</legend>
    <p className="text-xs text-aeviora-slate">{say("Select up to five forms. Titled links will be added to the email; saved QR images will be attached.", "Selecciona hasta cinco formularios. Sus enlaces con título se agregarán al correo y las imágenes QR se adjuntarán.")}</p>
    <label className="block text-sm">{say("Find a form", "Buscar formulario")}<input type="search" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setError(""); }} className="input mt-1" /></label>
    <div className="flex flex-wrap gap-4 text-sm"><Link to="/admin/form-links" className="underline">{say("Manage form library", "Administrar biblioteca")}</Link><button type="button" className="underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>{say("Refresh forms", "Actualizar formularios")}</button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {result?.key !== key ? !error && <p role="status" className="text-sm">{say("Loading forms…", "Cargando formularios…")}</p> : <><div className="max-h-64 space-y-2 overflow-y-auto">{result.links.map((link) => { const checked = selected.some((item) => item._id === link._id); return <label className="flex items-start gap-3 rounded-lg bg-aeviora-ivory p-3 text-sm" key={link._id}><input type="checkbox" checked={checked} disabled={disabled || (!checked && selected.length >= 5)} onChange={() => onChange(checked ? selected.filter((item) => item._id !== link._id) : [...selected, link])} className="mt-1" /><span className="min-w-0"><strong className="block">{link.title}</strong><span className="block break-all text-xs">{link.url}</span>{link.hasQrImage && <span className="text-xs">{say("QR attachment included", "Incluye adjunto QR")}</span>}</span></label>; })}</div>{!result.total && <p className="text-sm">{say("No available forms match. Add a form in the library first.", "No hay formularios disponibles. Agrega uno a la biblioteca.")}</p>}<div className="flex gap-4 text-xs"><button type="button" className="underline disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>{say("Previous", "Anterior")}</button><span>{page} / {Math.max(1, result.totalPages)}</span><button type="button" className="underline disabled:opacity-40" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>{say("Next", "Siguiente")}</button></div></>}
    {selected.length > 0 && <div className="border-t border-aeviora-border pt-3"><p className="text-sm font-semibold">{say("Selected forms", "Formularios seleccionados")} ({selected.length}/5)</p><ul className="mt-2 space-y-2 text-sm">{selected.map((item) => <li key={item._id} className="flex items-start justify-between gap-3"><span>{item.title}</span><button type="button" onClick={() => onChange(selected.filter((form) => form._id !== item._id))} className="shrink-0 underline" aria-label={`${say("Remove", "Quitar")}: ${item.title}`}>{say("Remove", "Quitar")}</button></li>)}</ul></div>}
  </fieldset>;
}
