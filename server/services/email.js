import nodemailer from "nodemailer";
import { z } from "zod";
import { registrationTemplate, renderEmailTemplate } from "../../shared/emailTemplates.js";

const settings = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.string().trim().pipe(z.enum(["465", "587"])),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASS: z.string().refine((value) => value.trim().length > 0),
  SMTP_FROM: z.string().trim().pipe(z.email()),
});

export function emailConfigurationStatus(env = process.env) {
  const parsed = settings.safeParse(env);
  const hints = {
    SMTP_HOST: "Enter the SMTP hostname.",
    SMTP_PORT: "Use 465 or 587.",
    SMTP_USER: "Enter the SMTP username.",
    SMTP_PASS: "Enter the SMTP password.",
    SMTP_FROM: "Use a single email address, without a display name or angle brackets.",
  };
  return {
    configured: parsed.success,
    issues: parsed.success ? [] : parsed.error.issues.map((issue) => ({
      variable: issue.path[0],
      reason: typeof env[issue.path[0]] !== "string" || !env[issue.path[0]].trim() ? "missing" : "invalid",
      hint: hints[issue.path[0]],
    })),
  };
}

export function emailConfigured(env = process.env) {
  return settings.safeParse(env).success;
}

export function emailFailure(error) {
  if (error.code === "SMTP_CONFIG") return "missing_configuration";
  if (error.code === "EAUTH") return "authentication_failed";
  if (["ETIMEDOUT", "ESOCKET", "ECONNECTION", "EDNS"].includes(error.code)) return "network_error";
  return "delivery_failed";
}

function smtpTransport({ env = process.env, createTransport = nodemailer.createTransport } = {}) {
  const parsed = settings.safeParse(env);
  if (!parsed.success) throw Object.assign(new Error("Email is not configured."), { code: "SMTP_CONFIG" });
  const config = parsed.data;
  const transport = createTransport({
    host: config.SMTP_HOST, port: Number(config.SMTP_PORT),
    secure: config.SMTP_PORT === "465", requireTLS: true,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, dnsTimeout: 5000,
    disableFileAccess: true, disableUrlAccess: true,
    logger: false, debug: false,
  });
  return { transport, config };
}

async function withTransport(dependencies, operation) {
  const { transport, config } = smtpTransport(dependencies);
  let timer;
  try {
    return await Promise.race([
      operation(transport, config),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("SMTP deadline exceeded."), { code: "ETIMEDOUT" })), 15000); }),
    ]);
  } finally { clearTimeout(timer); transport.close(); }
}

export async function verifyEmailConnection(dependencies) {
  await withTransport(dependencies, (transport) => transport.verify());
}

export async function sendEmail({ to, subject, text }, dependencies) {
  await withTransport(dependencies, async (transport, config) => {
    const result = await transport.sendMail({
      from: { name: "Aeviora Wellness", address: config.SMTP_FROM },
      to: { address: z.email().parse(to) }, subject, text,
    });
    if (!result.accepted?.length) throw new Error("Message rejected.");
  });
}

export async function sendRegistrationEmail(user, { send = sendEmail, template = registrationTemplate, report = (category) => console.warn("Registration email:", category) } = {}) {
  try {
    await send({
      to: user.email,
      ...renderEmailTemplate(template, user),
    });
    return "accepted";
  } catch (error) {
    report(emailFailure(error));
    return "failed";
  }
}

export function emailFailureMessage(error) {
  const messages = {
    missing_configuration: "SMTP settings are missing or invalid. Recheck configuration for details.",
    authentication_failed: "The SMTP provider rejected authentication. Check the SMTP username and password or app password.",
    network_error: "The SMTP connection failed or timed out. Check the hostname, TLS port, and provider network restrictions.",
    delivery_failed: "The SMTP provider did not confirm the operation. Check sender authorization and provider logs.",
  };
  return messages[emailFailure(error)];
}
