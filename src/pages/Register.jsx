import { t, getLanguage } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PasswordInput from "../components/passwordInput";
import { apiRequest } from "../util/api";
import { createRegistrationSchema } from "../../shared/registration";

const fields = [
  ["firstName", "First name", "text", "given-name", true],
  ["lastName", "Last name", "text", "family-name", true],
  ["email", "Email address", "email", "email", true],
  ["phone", "Mobile phone", "tel", "tel", true],
  ["zipCode", "ZIP / postal code", "text", "postal-code", true],
  ["country", "Country code", "text", "country", true],
];
const addressFields = [
  ["addressLine1", "Address line 1", "text", "address-line1"],
  ["addressLine2", "Address line 2", "text", "address-line2"],
  ["city", "City", "text", "address-level2"],
  ["state", "State / region", "text", "address-level1"],
];

export default function Register() {
  const language = useLanguage();
  const [searchParams] = useSearchParams();
  const say = (en, es) => getLanguage() === "es" ? es : en;
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [preference, setPreference] = useState("");
  const inFlight = useRef(false);
  const errorRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/auth/registration-config", { signal: controller.signal })
      .then((data) =>
        setConfig({
          ...data,
          requiredAddressFields: Array.isArray(data.requiredAddressFields)
            ? data.requiredAddressFields
            : [],
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length) errorRef.current?.focus();
  }, [errors]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!config || inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(
      [...fields, ...addressFields].map(([name]) => [
        name,
        data.get(name) || "",
      ]),
    );
    Object.assign(payload, {
      preferredLanguage: data.get("preferredLanguage"),
      communicationPreference: data.get("communicationPreference"),
      timeZone: data.get("timeZone"),
      password: data.get("password"),
      is18OrOlder: data.has("is18OrOlder"),
      termsAccepted: data.has("termsAccepted"),
      privacyAccepted: data.has("privacyAccepted"),
      termsVersion: config.termsVersion,
      privacyVersion: config.privacyVersion,
      smsConsent: data.has("smsConsent"),
      marketingConsent: data.has("marketingConsent"),
      referralCode: data.get("referralCode") || "",
    });
    const parsed = createRegistrationSchema(
      config.requiredAddressFields,
    ).safeParse(payload);
    const nextErrors = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        nextErrors[issue.path[0] || "form"] ??= issue.message;
    if (payload.password !== data.get("confirmPassword"))
      nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      form.reset();
      setSuccess(result);
    } catch (error) {
      setErrors(
        error.fields || {
          form: error.message || "Unable to connect. Please try again.",
        },
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function renderField([name, label, type, autoComplete, required = false]) {
    const needed = required || config.requiredAddressFields.includes(name);
    return (
      <div key={name}>
        <label htmlFor={name} className="label">
          {t(label)}
          {t(needed ? " *" : " (optional)")}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={needed}
          defaultValue={name === "country" ? "US" : ""}
          maxLength={name === "country" ? 2 : 254}
          className="input"
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? name + "-error" : undefined}
        />
        {errors[name] && (
          <p id={name + "-error"} className="mt-1 text-sm text-red-700">
            {t(errors[name])}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-aeviora-primaryDark px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-[1fr_2fr]">
        <section className="bg-aeviora-primary p-8 text-white lg:p-10">
          <Link to="/" className="font-display text-2xl">{t("Aeviora Wellness")}</Link>
          <ShieldCheck className="mb-5 mt-10 h-12 w-12 text-aeviora-softGold" />
          <h1 className="font-display text-4xl">{t("Create your free account")}</h1>
          <p className="mt-5 leading-7">{t("Take the first step toward Aeviora membership and discounted prices on eligible wellness and preventive care services. Start with your contact details and communication preferences.")}</p>
          <p className="mt-4 text-sm leading-6">{t("Your ZIP code helps us check service availability. An account does not confirm eligibility for a service or enroll you in a paid membership. Account signup is free; membership plans and services are priced separately.")}</p>
        </section>
        <section className="p-6 sm:p-10">
          {success ? (
            <div role="status">
              <h2 className="font-display text-3xl">{t(success.verificationEmail === "accepted" ? "Check your email" : "Account created")}</h2>
              <p className="my-5">{t(success.message)}</p>
              <Link
                to="/verify-email"
                className="btn-primary inline-block"
              >
                {t("Request a new verification link")}
              </Link>
              <p className="mt-5 text-sm">{t("After 24 hours without verification, your registration is marked Not verified. You can request a new link anytime.")}</p>
              <Link to="/login" className="mt-5 inline-block text-sm underline">{t("Back to sign in")}</Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-3xl">{t("Account registration")}</h2>
              <p className="mt-2 text-sm text-aeviora-slate">{t("Fields marked * are required.")}</p>
              {loadError && (
                <p role="alert" className="mt-5 text-red-700">
                  {t(loadError)}{t(" ")}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => window.location.reload()}
                  >{t("Try again")}</button>
                </p>
              )}
              {!config && !loadError && (
                <p role="status" className="mt-5">{t("Loading registration…")}</p>
              )}
              {config && (
                <form
                  onSubmit={handleSubmit}
                  className="mt-7 space-y-7"
                  noValidate
                >
                  {Object.keys(errors).length > 0 && (
                    <div
                      ref={errorRef}
                      tabIndex={-1}
                      role="alert"
                      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800"
                    >
                      <p className="font-semibold">{t("Please review these details:")}</p>
                      <ul className="mt-2 list-disc pl-5">
                        {Object.entries(errors).map(([name, message]) => (
                          <li key={name}>{t(message)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <fieldset
                    disabled={submitting}
                    className="space-y-6 disabled:opacity-60"
                  >
                    <legend className="mb-4 font-semibold">{t("Contact details")}</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {t(fields.map(renderField))}
                    </div>
                    <div>
                      <label htmlFor="referralCode" className="label">{say("Referral / discount code (optional)", "Código de referido / descuento (opcional)")}</label>
                      <input id="referralCode" name="referralCode" defaultValue={(searchParams.get("ref") || "").slice(0, 32)} maxLength={32} autoCapitalize="characters" autoComplete="off" className="input uppercase" aria-invalid={Boolean(errors.referralCode)} aria-describedby="referral-code-help" />
                      <p id="referral-code-help" className="mt-2 text-xs text-aeviora-slate">{say("Your code will be saved for your first paid membership. Review the discount before payment. The referring member may earn a bonus.", "El código se guardará para tu primera membresía de pago. Revisa el descuento antes de pagar. El miembro que te refirió puede recibir un bono.")}</p>
                      {errors.referralCode && <p role="alert" className="mt-1 text-sm text-red-700">{t(errors.referralCode)}</p>}
                    </div>
                    <details
                      open={
                        config.requiredAddressFields.length > 0 ||
                        addressFields.some(([name]) => errors[name])
                      }
                    >
                      <summary className="cursor-pointer font-semibold">
                        {t(config.requiredAddressFields.length
                          ? "Address details"
                          : "Add an address (optional)")}
                      </summary>
                      <div className="mt-4 grid gap-5 sm:grid-cols-2">
                        {t(addressFields.map(renderField))}
                      </div>
                    </details>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="preferredLanguage" className="label">{t("Preferred language (optional)")}</label>
                        <select
                          id="preferredLanguage"
                          name="preferredLanguage"
                          className="input"
                          defaultValue={language}
                        >
                          <option value="">{t("No preference")}</option>
                          <option value="en">{t("English")}</option>
                          <option value="es">{t("Spanish")}</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="communicationPreference"
                          className="label"
                        >{t("Communication preference (optional)")}</label>
                        <select
                          id="communicationPreference"
                          name="communicationPreference"
                          className="input"
                          value={preference}
                          onChange={(event) =>
                            setPreference(event.target.value)
                          }
                        >
                          <option value="">{t("No preference")}</option>
                          <option value="email">{t("Email")}</option>
                          <option value="sms">{t("SMS")}</option>
                          <option value="both">{t("Email and SMS")}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="timeZone" className="label">{t("Time zone (optional)")}</label>
                      <input
                        id="timeZone"
                        name="timeZone"
                        className="input"
                        aria-invalid={Boolean(errors.timeZone)}
                        aria-describedby={errors.timeZone ? "timeZone-error" : undefined}
                        defaultValue={
                          Intl.DateTimeFormat().resolvedOptions().timeZone || ""
                        }
                        placeholder={t("America/New_York")}
                      />
                      {errors.timeZone && (
                        <p id="timeZone-error" className="mt-1 text-sm text-red-700">
                          {t(errors.timeZone)}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <PasswordInput
                        placeholder={t("At least 12 characters")}
                        error={errors.password}
                      />
                      <PasswordInput
                        name="confirmPassword"
                        label="Confirm password"
                        error={errors.confirmPassword}
                      />
                    </div>
                    <div className="space-y-4 border-t border-aeviora-border pt-5 text-sm leading-6">
                      {config.isDraft && (
                        <p className="rounded-xl bg-amber-50 p-3 text-amber-900">{t("Development registration: policy documents are drafts. Acceptance is recorded for testing.")}</p>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          name="is18OrOlder"
                          type="checkbox"
                          required
                          className="mt-1"
                          aria-invalid={Boolean(errors.is18OrOlder)}
                          aria-describedby={errors.is18OrOlder ? "is18OrOlder-error" : undefined}
                        />
                        <span>{t("I confirm that I am 18 years of age or older. *")}</span>
                      </label>
                      {errors.is18OrOlder && (
                        <p id="is18OrOlder-error" className="ml-7 text-sm text-red-700">
                          {t(errors.is18OrOlder)}
                        </p>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          name="termsAccepted"
                          type="checkbox"
                          required
                          className="mt-1"
                          aria-invalid={Boolean(errors.termsAccepted)}
                          aria-describedby={errors.termsAccepted ? "termsAccepted-error" : undefined}
                        />
                        <span>{t("I accept the")}{t(" ")}
                          <a
                            href={config.termsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >{t("Terms")}</a>{t(" ")}
                          ({t(config.termsVersion)}). *
                        </span>
                      </label>
                      {errors.termsAccepted && (
                        <p id="termsAccepted-error" className="ml-7 text-sm text-red-700">
                          {t(errors.termsAccepted)}
                        </p>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          name="privacyAccepted"
                          type="checkbox"
                          required
                          className="mt-1"
                          aria-invalid={Boolean(errors.privacyAccepted)}
                          aria-describedby={errors.privacyAccepted ? "privacyAccepted-error" : undefined}
                        />
                        <span>{t("I accept the")}{t(" ")}
                          <a
                            href={config.privacyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >{t("Privacy Policy")}</a>{t(" ")}
                          ({t(config.privacyVersion)}). *
                        </span>
                      </label>
                      {errors.privacyAccepted && (
                        <p id="privacyAccepted-error" className="ml-7 text-sm text-red-700">
                          {t(errors.privacyAccepted)}
                        </p>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          name="smsConsent"
                          type="checkbox"
                          required={["sms", "both"].includes(preference)}
                          className="mt-1"
                          aria-invalid={Boolean(errors.smsConsent)}
                          aria-describedby={errors.smsConsent ? "smsConsent-error" : undefined}
                        />
                        <span>{t("I consent to SMS messages for account verification and general account notifications. Required if SMS is selected. This does not include marketing messages.")}</span>
                      </label>
                      {errors.smsConsent && (
                        <p id="smsConsent-error" className="ml-7 text-sm text-red-700">
                          {t(errors.smsConsent)}
                        </p>
                      )}
                      <label className="flex items-start gap-3">
                        <input
                          name="marketingConsent"
                          type="checkbox"
                          className="mt-1"
                        />
                        <span>{t("I would like to receive marketing messages (optional). Creating an account does not require this consent.")}</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full disabled:opacity-60"
                    >
                      {t(submitting ? "Creating account…" : "Sign up for free")}
                    </button>
                  </fieldset>
                </form>
              )}
              <p className="mt-6 text-center text-sm">{t("Already registered?")}{t(" ")}
                <Link
                  to="/login"
                  className="font-semibold text-aeviora-primary underline"
                >{t("Sign in")}</Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
