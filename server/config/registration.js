export function registrationConfig() {
  const production = process.env.NODE_ENV === "production";
  const termsVersion = process.env.ACCOUNT_TERMS_VERSION || "development-terms-v1";
  const privacyVersion = process.env.ACCOUNT_PRIVACY_VERSION || "development-privacy-v1";
  const termsUrl = process.env.ACCOUNT_TERMS_URL || "/termsofuse";
  const privacyUrl = process.env.ACCOUNT_PRIVACY_URL || "/account-privacy";
  const isDraft = !process.env.ACCOUNT_TERMS_VERSION || !process.env.ACCOUNT_PRIVACY_VERSION || !process.env.ACCOUNT_PRIVACY_URL;
  const validUrl = (value) => /^\/(?!\/)/.test(value) || /^https:\/\//.test(value);
  if (!validUrl(termsUrl) || !validUrl(privacyUrl)) throw new Error("Invalid account policy URL.");
  if (production && isDraft) throw new Error("Configure approved account policy versions and URLs before production registration.");
  const requestedFields = (process.env.ACCOUNT_REQUIRED_ADDRESS_FIELDS || "").split(",").map((field) => field.trim()).filter(Boolean);
  if (requestedFields.some((field) => !["addressLine1", "city", "state"].includes(field))) throw new Error("Invalid required address field.");
  return { termsVersion, privacyVersion, termsUrl, privacyUrl, isDraft, requiredAddressFields: requestedFields };
}

export function initialAccountStatus() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_ACTIVATE_ACCOUNTS === "true" ? "active" : "pending";
}
