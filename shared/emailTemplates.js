export const registrationTemplate = {
  _id: "registration", name: "Registration welcome",
  subject: "Welcome to Aeviora Wellness",
  text: "Hello {{firstName}},\n\nThank you for creating your free Aeviora Wellness account.\n\n{{accountStatus}}\n\nCreating an account does not enroll you in a paid membership. If you did not register, please reply to this email. Do not email passwords or medical records.\n\nAeviora Wellness",
};

export function hasAppointmentPlaceholders(template) {
  return /\{\{(?:appointmentDate|appointmentTime|providerName)\}\}/.test(`${template.subject || ""}\n${template.text || ""}`);
}

export function renderEmailTemplate(template, user, appointment = null, locale = "en-US") {
  const values = { firstName: user.firstName || "there", lastName: user.lastName || "", accountStatus: user.accountStatus === "active" ? "Your account is active. You can sign in on the Aeviora Wellness website." : "Your account is pending activation." };
  if (appointment) {
    const date = new Date(appointment.startsAt);
    values.appointmentDate = new Intl.DateTimeFormat(locale, { timeZone: appointment.timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date);
    values.appointmentTime = new Intl.DateTimeFormat(locale, { timeZone: appointment.timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
    values.providerName = appointment.providerName;
  }
  const render = (value) => value.replace(/\{\{(firstName|lastName|accountStatus|appointmentDate|appointmentTime|providerName)\}\}/g, (original, key) => values[key] ?? original);
  return { subject: render(template.subject).replace(/[\r\n]/g, " "), text: render(template.text) };
}
