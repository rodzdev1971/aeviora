import { company } from "./constants";

export const emailTemplates = [
  { id: "welcome", name: "Account welcome", subject: "Welcome to Aeviora Wellness", body: "Thank you for creating your free Aeviora Wellness account. If you have questions about your account or next steps, please contact our team." },
  { id: "support", name: "Account assistance", subject: "Your Aeviora Wellness account", body: "We are following up about your account. Please let us know how we can help. For your security, do not send passwords, payment card details, or medical records by email." },
  { id: "membership", name: "Reply to a membership question", subject: "Your Aeviora membership question", body: "Thank you for asking about Aeviora membership options. We can help explain plan pricing, included benefits, participating providers, and service exclusions. Please tell us which membership information you would like to review." },
];

export function fillEmailTemplate(template, recipient) {
  return { subject: template.subject, text: `Hello ${recipient.firstName},\n\n${template.body}\n\n${company.name}\n${company.telephone}\n${company.email}` };
}
