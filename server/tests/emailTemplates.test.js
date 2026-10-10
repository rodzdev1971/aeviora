import test from "node:test";
import assert from "node:assert/strict";
import { registrationTemplate, renderEmailTemplate } from "../../shared/emailTemplates.js";
import { templateInput } from "../routes/emailTemplateRoutes.js";
import EmailTemplate from "../models/emailTemplates.js";

test("saved template validates and renders supported placeholders without interpreting content", async () => {
  const template = { name: "Support", subject: "Hello {{firstName}}", text: "{{lastName}}: {{accountStatus}}" };
  assert.equal(templateInput.safeParse(template).success, true);
  await new EmailTemplate(template).validate();
  const rendered = renderEmailTemplate(template, { firstName: "Alex", lastName: "Example", accountStatus: "active" });
  assert.equal(rendered.subject, "Hello Alex");
  assert.match(rendered.text, /account is active/);
  assert.match(renderEmailTemplate(registrationTemplate, { accountStatus: "pending" }).text, /pending activation/);
  assert.equal(templateInput.safeParse({ ...template, subject: "Injected\r\nHeader" }).success, false);
  assert.equal(templateInput.safeParse({ ...template, text: "" }).success, false);
});
