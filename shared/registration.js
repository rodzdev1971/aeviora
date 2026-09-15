import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).default("");
const phone = z.string().trim().regex(/^[+\d\s().-]+$/, "Enter a valid mobile number.")
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    if (value.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return value;
  }).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Include the country code for international mobile numbers."));

export const accountFields = {
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  phone,
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  city: optionalText(100),
  state: optionalText(100),
  zipCode: z.string().trim().min(1, "ZIP or postal code is required.").max(20),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter country code.").default("US"),
  preferredLanguage: z.enum(["", "en", "es"]).default(""),
  communicationPreference: z.enum(["", "email", "sms", "both"]).default(""),
  timeZone: optionalText(80).refine((value) => {
    if (!value) return true;
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
    catch { return false; }
  }, "Enter a valid time zone, such as America/New_York."),
};

function validateAddress(data, ctx, requiredAddressFields) {
  if (data.country === "US" && !/^\d{5}(-\d{4})?$/.test(data.zipCode)) {
    ctx.addIssue({ code: "custom", path: ["zipCode"], message: "Enter a valid US ZIP code." });
  }
  for (const field of requiredAddressFields) {
    if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: "This address field is required." });
  }
}

export function createRegistrationSchema(requiredAddressFields = []) {
  return z.strictObject({
    ...accountFields,
    password: z.string().min(12, "Use at least 12 characters.")
      .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes."),
    is18OrOlder: z.literal(true, { error: "You must confirm you are 18 or older." }),
    termsAccepted: z.literal(true, { error: "Accept the Terms to continue." }),
    privacyAccepted: z.literal(true, { error: "Accept the Privacy Policy to continue." }),
    termsVersion: z.string().min(1).max(100),
    privacyVersion: z.string().min(1).max(100),
    smsConsent: z.boolean().default(false),
    marketingConsent: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    validateAddress(data, ctx, requiredAddressFields);
    if (["sms", "both"].includes(data.communicationPreference) && !data.smsConsent) {
      ctx.addIssue({ code: "custom", path: ["smsConsent"], message: "SMS consent is required when choosing text messages." });
    }
  });
}

// Account edits cannot alter identity, consent records, roles, or account status.
export const profileUpdateSchema = z.strictObject({
  addressLine1: accountFields.addressLine1.optional(),
  addressLine2: accountFields.addressLine2.optional(),
  city: accountFields.city.optional(),
  state: accountFields.state.optional(),
  zipCode: accountFields.zipCode,
  preferredLanguage: accountFields.preferredLanguage.optional(),
  timeZone: accountFields.timeZone.optional(),
});

export const passwordChangeSchema = z.strictObject({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12, "Use at least 12 characters.")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes."),
});
