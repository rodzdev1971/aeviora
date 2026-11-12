import { US_STATES } from "../../shared/usStates.js";

export function StateSelection({ states = [], say }) {
  return <fieldset className="sm:col-span-2">
    <legend className="label">{say("Authorized consultation states", "Estados autorizados para consultas")}</legend>
    <p className="mt-2 text-sm text-aeviora-slate">{say("Select only states where you are authorized to consult. These states apply to telehealth and in-person bookings. This records your declaration; it does not verify licensure. No new bookings are allowed until states are selected.", "Selecciona solo los estados donde tienes autorización para consultar. Aplican a reservas virtuales y presenciales. Esto registra tu declaración; no verifica licencias. No se permiten nuevas reservas hasta seleccionar estados.")}</p>
    <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-aeviora-border p-3 sm:grid-cols-2">
      {US_STATES.map(([code, name]) => <label key={code} className="flex items-center gap-2 text-sm"><input type="checkbox" name="authorizedStates" value={code} defaultChecked={states.includes(code)} />{name} ({code})</label>)}
    </div>
  </fieldset>;
}

export function ProviderStateSettings({ provider, busy, save, say }) {
  return <form className="card space-y-4" onSubmit={(event) => {
    event.preventDefault();
    save({ authorizedStates: new FormData(event.currentTarget).getAll("authorizedStates"), revision: provider.revision });
  }}>
    <h2 className="font-display text-2xl">{say("My consultation states", "Mis estados de consulta")}</h2>
    <p className="font-semibold">{provider.name}{provider.credentials && `, ${provider.credentials}`}</p>
    <p className="text-sm">{provider.specialty} · {provider.timeZone}</p>
    <p className="text-sm text-aeviora-slate">{say("State changes affect new bookings. Review your existing appointments separately when changing coverage.", "Los cambios de estados afectan las nuevas reservas. Revisa tus citas existentes al cambiar la cobertura.")}</p>
    <fieldset disabled={busy} className="space-y-4">
      <StateSelection states={provider.authorizedStates} say={say} />
      <button type="submit" className="btn-primary">{say("Save authorized states", "Guardar estados autorizados")}</button>
    </fieldset>
  </form>;
}

export function ProviderLoginAccess({ provider, busy, link, say }) {
  return <section className="card space-y-4">
    <h2 className="font-display text-2xl">{say("Provider login access", "Acceso del profesional")}</h2>
    {provider.userId ? <p role="status">{say("A login account is connected to this provider. They can sign in at /provider/login with their own account password.", "Este profesional tiene una cuenta conectada. Puede ingresar en /provider/login con la contraseña de su cuenta.")}</p> : <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      link(new FormData(event.currentTarget).get("email"));
    }}>
      <p className="text-sm text-aeviora-slate">{say("Have the provider register and verify an account first. Link their active account here to grant provider access. Existing sessions will be signed out.", "Pide al profesional que se registre y verifique su cuenta. Conecta aquí su cuenta activa para otorgarle acceso. Se cerrarán sus sesiones existentes.")}</p>
      <fieldset disabled={busy} className="space-y-3">
        <label className="label">{say("Registered provider email", "Correo registrado del profesional")}<input name="email" type="email" required maxLength={254} className="input mt-2" autoComplete="off" /></label>
        <button type="submit" className="btn-primary">{say("Link account and grant provider access", "Conectar cuenta y otorgar acceso")}</button>
      </fieldset>
    </form>}
  </section>;
}
