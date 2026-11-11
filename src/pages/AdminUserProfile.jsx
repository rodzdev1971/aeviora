import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLocale, t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { apiRequest } from "../util/api";

function dateLabel(value) {
  if (!value) return t("Not recorded");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t("Not recorded") : new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function consentLabel(consent) {
  if (consent?.granted === true) return t("Granted");
  if (consent?.granted === false) return t("Not granted");
  return t("Not recorded");
}

function DetailSection({ title, rows }) {
  return <section className="card min-w-0">
    <h2 className="font-display text-xl">{t(title)}</h2>
    <dl className="mt-4 divide-y divide-aeviora-border">
      {rows.map(([label, value]) => <div key={label} className="py-3">
        <dt className="text-sm text-aeviora-slate">{t(label)}</dt>
        <dd className="mt-1 break-words font-medium">{value || t("Not provided")}</dd>
      </div>)}
    </dl>
  </section>;
}

export default function AdminUserProfile() {
  useLanguage();
  const { userId } = useParams();
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { signal: controller.signal })
      .then(({ user }) => { if (!controller.signal.aborted) setResult({ userId, retry, user }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ userId, retry, error: error.message }); });
    return () => controller.abort();
  }, [userId, retry]);

  const current = result?.userId === userId && result?.retry === retry ? result : null;
  const profile = current?.user;

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="border-b border-aeviora-border pb-5">
      <Link to="/admin" className="text-sm font-semibold text-aeviora-primary underline">{t("Back to accounts")}</Link>
      <h1 className="mt-3 font-display text-3xl">{t("User profile")}</h1>
      {profile && <p className="mt-2 break-words text-lg">{profile.firstName} {profile.lastName}</p>}
    </header>
    {!current ? <p role="status">{t("Loading profile…")}</p> : current.error ? <div role="alert" className="border-l-4 border-red-600 bg-red-50 p-4 text-red-800">
      <p>{t(current.error)}</p>
      <button type="button" className="mt-3 font-semibold underline" onClick={() => setRetry((value) => value + 1)}>{t("Try again")}</button>
    </div> : <div className="grid gap-5 md:grid-cols-2">
      <DetailSection title="Contact information" rows={[
        ["First name", profile.firstName],
        ["Last name", profile.lastName],
        ["Email", profile.email],
        ["Phone", profile.phone],
        ["Address", profile.addressLine1],
        ["Address line 2", profile.addressLine2],
        ["City", profile.city],
        ["State", profile.state],
        ["ZIP code", profile.zipCode],
        ["Country", profile.country],
      ]} />
      <DetailSection title="Account information" rows={[
        ["Account ID", profile._id],
        ["Status", t(profile.accountStatus)],
        ["Role", t(profile.role)],
        ["Email verification", t(({ verified: "Verified", pending: "Awaiting verification", not_verified: "Not verified", legacy: "Existing account" })[profile.verificationStatus] || "Not verified")],
        ["Email verified at", dateLabel(profile.emailVerifiedAt)],
        ["Verification method", t(({ admin: "Verified by admin", email: "Email" })[profile.emailVerificationMethod] || "Not recorded")],
        ["Created", dateLabel(profile.createdAt)],
        ["Last updated", dateLabel(profile.updatedAt)],
      ]} />
      <DetailSection title="Preferences" rows={[
        ["Preferred language", t(({ en: "English", es: "Spanish" })[profile.preferredLanguage] || "Not provided")],
        ["Communication preference", t(({ email: "Email", sms: "SMS", both: "Email and SMS" })[profile.communicationPreference] || "Not provided")],
        ["Time zone", profile.timeZone],
      ]} />
      <DetailSection title="Consent records" rows={[
        ["18 or older confirmed", t(profile.is18OrOlder === true ? "Yes" : "Not recorded")],
        ["Terms accepted", dateLabel(profile.termsAcceptance?.acceptedAt)],
        ["Terms version", profile.termsAcceptance?.version],
        ["Privacy policy accepted", dateLabel(profile.privacyAcceptance?.acceptedAt)],
        ["Privacy policy version", profile.privacyAcceptance?.version],
        ["SMS consent", consentLabel(profile.smsConsent)],
        ["SMS consent recorded", dateLabel(profile.smsConsent?.recordedAt)],
        ["Marketing consent", consentLabel(profile.marketingConsent)],
        ["Marketing consent recorded", dateLabel(profile.marketingConsent?.recordedAt)],
      ]} />
    </div>}
  </div>;
}
