export const registrationTemplate = {
  _id: "registration", name: "Registration welcome",
  subject: "Welcome to Aeviora Wellness",
  text: "Hello {{firstName}},\n\nThank you for creating your free Aeviora Wellness account.\n\n{{accountStatus}}\n\nCreating an account does not enroll you in a paid membership. If you did not register, please reply to this email. Do not email passwords or medical records.\n\nAeviora Wellness",
};

export function renderEmailTemplate(template, user) {
  const values = { firstName: user.firstName || "there", lastName: user.lastName || "", accountStatus: user.accountStatus === "active" ? "Your account is active. You can sign in on the Aeviora Wellness website." : "Your account is pending activation." };
  const render = (value) => value.replace(/\{\{(firstName|lastName|accountStatus)\}\}/g, (_, key) => values[key]);
  return { subject: render(template.subject).replace(/[\r\n]/g, " "), text: render(template.text) };
}
