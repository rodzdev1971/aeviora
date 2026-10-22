import { useRef, useState } from "react";
import { useLanguage } from "../i18n/useLanguage.js";
import { getLanguage } from "../i18n/language.js";
import { company } from "../util/constants.jsx";
import { referralShareMessage } from "../util/referralShare.js";

export default function ReferralShareCard({ affiliate, link }) {
  useLanguage();
  const language = getLanguage();
  const say = (en, es) => language === "es" ? es : en;
  const { text, emailHref } = referralShareMessage({ company, affiliate, link }, language);
  const [status, setStatus] = useState("");
  const message = useRef(null);
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(say("Referral message copied. Paste it into an SMS or email.", "Mensaje copiado. Pégalo en un SMS o correo."));
      return true;
    } catch {
      message.current?.focus(); message.current?.select();
      setStatus(say("The message is selected. Copy it and paste it into your SMS or email app.", "El mensaje está seleccionado. Cópialo y pégalo en tu app de SMS o correo."));
      return false;
    }
  }
  async function sms() {
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
    if (await copyMessage()) {
      setStatus(say("Message copied. Paste it into your messaging app and choose the recipient.", "Mensaje copiado. Pégalo en tu app de mensajes y elige el destinatario."));
      window.location.assign("sms:");
    }
  }
  return <section aria-labelledby="referral-share-heading" className="mt-5 space-y-4 rounded-2xl border border-aeviora-border bg-aeviora-ivory p-4 sm:p-5">
    <h3 id="referral-share-heading" className="font-display text-xl text-aeviora-primary">{say("Share Aeviora and your offer", "Comparte Aeviora y tu oferta")}</h3>
    <label className="block text-sm font-semibold" htmlFor="referral-share-message">{say("Ready-to-share message", "Mensaje listo para compartir")}</label>
    <textarea id="referral-share-message" ref={message} readOnly value={text} rows={10} onFocus={(event) => event.target.select()} className="input w-full resize-y text-sm leading-6" />
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={copyMessage}>{say("Copy message", "Copiar mensaje")}</button><button type="button" className="btn-secondary" onClick={sms}>{say("Share by SMS", "Compartir por SMS")}</button><a href={emailHref} className="btn-secondary">{say("Share by email", "Compartir por correo")}</a></div>
    <p className="text-xs leading-6 text-aeviora-slate">{say("For SMS, choose Messages in your device's share menu, or paste the copied message into your SMS app. Email opens a draft in your email app. Choose the recipient and review before sending.", "Para SMS, elige Mensajes en el menú de tu dispositivo o pega el mensaje copiado en tu app de SMS. El correo abre un borrador en tu app. Elige el destinatario y revisa antes de enviar.")}</p>
    {status && <p role="status" className="text-sm text-aeviora-primary">{status}</p>}
  </section>;
}
