import bcrypt from "bcryptjs";
import User from "../models/users.js";
import { createRegistrationSchema } from "../../shared/registration.js";
import { registrationConfig, initialAccountStatus } from "../config/registration.js";

export class RegistrationError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

export async function registerAccount(body, {
  users = User, hashPassword = (password) => bcrypt.hash(password, 12),
  config = registrationConfig(), now = () => new Date(), status = initialAccountStatus(),
} = {}) {
  const parsed = createRegistrationSchema(config.requiredAddressFields).safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0] || "form"] ??= issue.message;
    throw new RegistrationError(400, "Please review the registration fields.", fields);
  }
  const { password, termsAccepted, privacyAccepted, termsVersion, privacyVersion, smsConsent, marketingConsent, ...account } = parsed.data;
  if (!termsAccepted || !privacyAccepted || termsVersion !== config.termsVersion || privacyVersion !== config.privacyVersion) {
    throw new RegistrationError(409, "The account policies changed. Reload this page and review them again.");
  }
  if (await users.findOne({ email: account.email })) throw new RegistrationError(409, "An account with this email already exists.");
  const timestamp = now();
  const consent = (granted) => ({ granted, recordedAt: timestamp, grantedAt: granted ? timestamp : null });
  try {
    return await users.create({
      ...account, passwordHash: await hashPassword(password), role: "patient", accountStatus: status,
      termsAcceptance: { version: config.termsVersion, documentUrl: config.termsUrl, acceptedAt: timestamp, isDraft: config.isDraft },
      privacyAcceptance: { version: config.privacyVersion, documentUrl: config.privacyUrl, acceptedAt: timestamp, isDraft: config.isDraft },
      smsConsent: consent(smsConsent), marketingConsent: consent(marketingConsent),
    });
  } catch (error) {
    if (error.code === 11000) throw new RegistrationError(409, "An account with this email already exists.");
    throw error;
  }
}
