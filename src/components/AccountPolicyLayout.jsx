import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { Link } from "react-router-dom";
import { company } from "../util/constants";

export default function AccountPolicyLayout({ title, version, preparedDate = "October 6, 2026", children }) {
  useLanguage();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-800">
      <nav aria-label={t("Account policies")} className="flex flex-wrap gap-4 text-aeviora-primary underline">
        <Link to="/register">{t("Back to registration")}</Link>
        <Link to="/account-terms">{t("Account terms")}</Link>
        <Link to="/account-privacy">{t("Account privacy")}</Link>
      </nav>
      <h1 className="mt-8 font-display text-4xl">{t(title)}</h1>
      <p className="mt-3 break-words text-sm">{t("Version: ")}{t(version)}</p>
      <p className="mt-2 text-sm">{t("Prepared ")}{t(preparedDate)}{t(" — Draft for review")}</p>
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">{t("This draft is awaiting business and legal review. It is not yet an effective account policy.")}</p>
      <div className="mt-8 space-y-8 leading-7">{t(children)}</div>
      <section className="mt-8 border-t pt-6 leading-7" aria-labelledby="policy-contact">
        <h2 id="policy-contact" className="text-xl font-semibold">{t("Contact us")}</h2>
        <p>{company.name}{t(" by Health GuideLife LLC")}</p>
        <p>{t(company.address)}<br />{t(company.address1)}</p>
        <p><a className="break-all text-aeviora-primary underline" href={`mailto:${company.email}`}>{company.email}</a></p>
        <p>{t("Telephone: ")}{t(company.telephone)}</p>
        <p className="mt-3">{t("Please do not send passwords, payment card details, or medical records by ordinary email.")}</p>
      </section>
    </main>
  );
}
