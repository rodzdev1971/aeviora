import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import { apiRequest } from "../util/api.js";
import { MAX_QR_BYTES } from "../../shared/formLinks.js";
import { notifyFormLibraryChanged } from "../util/formLibraryEvents.js";

const blank = { title: "", url: "", description: "", enabled: true, qrImage: "" };
export default function AdminFormLinks() {
  useLanguage();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [form, setForm] = useState(blank), [id, setId] = useState("");
  const [result, setResult] = useState(null), [search, setSearch] = useState(""), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const key = `${search}:${page}:${revision}`;
  const loading = result?.key !== key;
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/form-links?search=${encodeURIComponent(search)}&page=${page}`, { signal: controller.signal }).then((data) => setResult({ ...data, key })).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [search, page, key]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const data = await apiRequest(`/api/admin/form-links${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setId(data.link._id); setMessage(say("Form link saved.", "Enlace guardado.")); setRevision((value) => value + 1);
      notifyFormLibraryChanged();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function edit(link) {
    setBusy(true); setError(""); setMessage("");
    try {
      const { link: item } = await apiRequest(`/api/admin/form-links/${link._id}`);
      setId(item._id); setForm({ title: item.title, url: item.url, description: item.description || "", enabled: item.enabled, qrImage: item.qrImage || "" });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function image(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > MAX_QR_BYTES) { setError(say("Choose a PNG or JPEG QR image up to 200 KB.", "Elige una imagen QR PNG o JPEG de hasta 200 KB.")); return; }
    setBusy(true); setError("");
    try {
      const qrImage = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      setForm((current) => ({ ...current, qrImage }));
    } catch { setError(say("Unable to read this image.", "No se pudo leer la imagen.")); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-5xl space-y-6">
    <Link to="/admin/email-templates" className="text-sm underline">{say("Back to email manager", "Volver al administrador de correo")}</Link>
    <header><h1 className="font-display text-3xl">{say("Form links & QR codes", "Enlaces de formularios y códigos QR")}</h1><p className="mt-3 text-sm leading-7 text-aeviora-slate">{say("Save the share URLs and QR images supplied by your form provider, including HIPP FORMS. Use reusable links; completed forms stay with the form provider. Verify that each QR image opens the intended form.", "Guarda los enlaces y las imágenes QR de tu proveedor, incluido HIPP FORMS. Usa enlaces reutilizables; los formularios completados permanecen con el proveedor. Comprueba que cada QR abra el formulario correcto.")}</p></header>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <div role="status" className="space-y-2 text-green-800"><p>{message}</p><Link to="/directory" className="inline-block text-sm underline">{say("Send a saved form: choose a person in the directory, then Email user", "Enviar un formulario: elige una persona en el directorio y luego Enviar correo al usuario")}</Link></div>}
    <form onSubmit={save} className="card"><fieldset disabled={busy} className="space-y-4">
      <legend className="mb-4 font-display text-2xl">{say(id ? "Edit saved form" : "Add a form link", id ? "Editar formulario guardado" : "Agregar enlace de formulario")}</legend>
      <label className="block text-sm font-semibold">{say("Form title", "Título del formulario")}<input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input mt-2" /></label>
      <label className="block text-sm font-semibold">{say("HTTPS share URL (optional if a QR image is saved)", "URL HTTPS (opcional si guardas una imagen QR)")}<input type="url" maxLength={2000} placeholder="https://…" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} className="input mt-2" /></label>
      <label className="block text-sm font-semibold">{say("Description (optional)", "Descripción (opcional)")}<textarea rows={2} maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input mt-2" /></label>
      <label className="block text-sm font-semibold">{say("Upload provider QR code (optional, PNG/JPEG, 200 KB maximum)", "Subir QR del proveedor (opcional, PNG/JPEG, máximo 200 KB)")}<input type="file" accept="image/png,image/jpeg" onChange={image} className="mt-2 block max-w-full text-sm" /></label>
      {form.qrImage && <div className="flex flex-wrap items-center gap-4"><img src={form.qrImage} alt={say("Saved QR code preview", "Vista previa del código QR")} className="h-40 w-40 rounded-lg border border-aeviora-border bg-white object-contain p-2" /><button type="button" className="text-sm underline" onClick={() => setForm({ ...form, qrImage: "" })}>{say("Remove QR image", "Quitar imagen QR")}</button></div>}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="mt-1" /><span>{say("Available in the email composer (uncheck to archive)", "Disponible en el editor de correo (desmarca para archivar)")}</span></label>
      <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit">{say(busy ? "Saving…" : "Save form link", busy ? "Guardando…" : "Guardar enlace")}</button><button type="button" className="btn-secondary" onClick={() => { setId(""); setForm(blank); setMessage(""); }}>{say("New form", "Nuevo formulario")}</button></div>
    </fieldset></form>
    <section aria-labelledby="saved-forms-heading"><h2 id="saved-forms-heading" className="font-display text-2xl">{say("Saved form library", "Biblioteca de formularios")}</h2><label className="mt-4 block text-sm">{say("Search titles and descriptions", "Buscar títulos y descripciones")}<input type="search" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setError(""); }} className="input mt-2" /></label><button type="button" className="my-3 text-sm underline" onClick={() => { setError(""); setRevision((value) => value + 1); }}>{say("Reload library", "Recargar biblioteca")}</button>
      {loading ? !error && <p role="status">{say("Loading forms…", "Cargando formularios…")}</p> : <><p className="mb-4 text-sm">{result.total} {say("saved forms", "formularios guardados")}</p><div className="grid gap-4 sm:grid-cols-2">{result.links.map((link) => <article className="card min-w-0" key={link._id}><h3 className="font-display text-xl">{link.title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{link.description}</p>{link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-sm text-aeviora-primary underline">{link.url}</a>}<p className="mt-3 text-xs">{link.enabled ? say("Available", "Disponible") : say("Archived", "Archivado")}{link.hasQrImage ? say(" · QR image saved", " · Imagen QR guardada") : ""}</p><button type="button" disabled={busy} onClick={() => edit(link)} className="btn-secondary mt-4">{say("Edit / view QR", "Editar / ver QR")}</button></article>)}</div>{!result.total && <p>{say("No matching saved forms.", "No hay formularios que coincidan.")}</p>}<div className="mt-4 flex gap-4 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">{say("Previous", "Anterior")}</button><span>{page} / {Math.max(1, result.totalPages)}</span><button type="button" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">{say("Next", "Siguiente")}</button></div></>}
    </section>
  </section>;
}
