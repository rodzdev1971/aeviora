import nodemailer from "nodemailer";
import { z } from "zod";

const settings = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.string().trim().pipe(z.enum(["465", "587"])),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASS: z.string().min(1),
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

export async function sendEmail({ to, subject, text }, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
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
  try {
    const result = await transport.sendMail({
      from: { name: "Aeviora Wellness", address: config.SMTP_FROM },
      to: { address: z.email().parse(to) }, subject, text,
    });
    if (!result.accepted?.length) throw new Error("Message rejected.");
  } finally {
    transport.close();
  }
}

export async function sendRegistrationEmail(user, { send = sendEmail, report = (category) => console.warn("Registration email:", category) } = {}) {
  try {
    await send({
      to: user.email,
      subject: "Welcome to Aeviora Wellness — account created",
      text: `Welcome to Aeviora Wellness!\n\nYour free account has been created.\n\n${user.accountStatus === "active" ? "Your account is active. You can sign in on the Aeviora Wellness website." : "Your account is pending activation. Registration does not activate your account automatically."}\n\nCreating an account does not enroll you in a paid membership.\n\nIf you did not register, please reply to this email. Do not email passwords or medical records.\n\nAeviora Wellness`,
    });
    return "accepted";
  } catch (error) {
    report(emailFailure(error));
    return "failed";
  }
}
