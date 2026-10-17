import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiRequest } from "../util/api.js";
import { getLanguage } from "../i18n/language.js";

const keyBytes = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)), (character) => character.charCodeAt(0));
const keyString = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export default function AdminPushControl({ say }) {
  const [config, setConfig] = useState(null);
  const [supported] = useState(() => typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    (async () => {
      const settings = await apiRequest("/api/admin/push/config", { signal: controller.signal });
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const status = subscription ? await apiRequest("/api/admin/push/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }), signal: controller.signal }) : { enabled: false };
      if (!controller.signal.aborted) { setConfig(settings); setEnabled(status.enabled); }
    })().catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [supported]);
  async function enable() {
    if (busy || !config?.configured) return;
    setBusy(true); setError(""); setMessage("");
    let created;
    try {
      if (await Notification.requestPermission() !== "granted") throw new Error(say("Notifications were not allowed. Enable them in your browser's site settings to try again.", "No se permitieron las notificaciones. Actívalas en la configuración del sitio de tu navegador para volver a intentarlo."));
      await navigator.serviceWorker.register("/admin-push-sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && keyString(subscription.options.applicationServerKey) !== config.publicKey) { await subscription.unsubscribe(); subscription = null; }
      if (!subscription) { subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) }); created = subscription; }
      await apiRequest("/api/admin/push/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...subscription.toJSON(), language: getLanguage() }) });
      setEnabled(true); setMessage(say("New signup notifications are enabled for this browser, including when this page is closed.", "Las notificaciones de nuevos registros están activadas en este navegador, incluso cuando esta página está cerrada."));
    } catch (failure) { if (created) await created.unsubscribe().catch(() => {}); setError(failure.message); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setError(""); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await apiRequest("/api/admin/push/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage(say("Notifications disabled for this browser.", "Notificaciones desactivadas en este navegador."));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function testNotification() {
    setBusy(true); setError(""); setMessage("");
    try { await apiRequest("/api/admin/push/test", { method: "POST" }); setMessage(say("Test notification sent. Check your device's notification center.", "Notificación de prueba enviada. Revisa el centro de notificaciones de tu dispositivo.")); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-3" aria-labelledby="admin-push-heading">
    <h2 id="admin-push-heading" className="flex items-center gap-2 font-semibold"><Bell size={19} aria-hidden="true" />{say("New signup notifications", "Notificaciones de nuevos registros")}</h2>
    <p className="text-sm text-aeviora-slate">{say("Receive a browser notification when an account registers. Click it to review signup details. Notifications do not include names or contact details.", "Recibe una notificación del navegador cuando se registre una cuenta. Haz clic para revisar los detalles. Las notificaciones no incluyen nombres ni datos de contacto.")}</p>
    {!supported ? <p className="text-sm">{say("Push notifications are not supported here. Use a supported browser over HTTPS; on iPhone or iPad, open the site from its Home Screen app.", "Las notificaciones push no están disponibles aquí. Usa un navegador compatible con HTTPS; en iPhone o iPad, abre el sitio desde su aplicación de pantalla de inicio.")}</p>
      : !config && !error ? <p role="status" className="text-sm">{say("Checking notification settings…", "Revisando notificaciones…")}</p>
        : config && !config.configured ? <p className="text-sm">{say("Browser push is not set up on the server yet. The site administrator needs to complete notification setup.", "Las notificaciones push aún no están configuradas en el servidor. El administrador del sitio debe completar la configuración.")}</p>
          : config && <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={enabled ? disable : enable}>{busy ? say("Please wait…", "Espera…") : enabled ? say("Disable browser notifications", "Desactivar notificaciones") : say("Enable browser notifications", "Activar notificaciones")}</button>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {enabled && <button type="button" disabled={busy} className="block text-sm font-semibold underline disabled:opacity-50" onClick={testNotification}>{say("Send test notification", "Enviar notificación de prueba")}</button>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
  </section>;
}
