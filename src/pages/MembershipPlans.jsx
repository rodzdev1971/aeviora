import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import MembershipOptions from "../components/MembershipOptions.jsx";

export default function MembershipPlans() {
  useLanguage();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl">{t("Membership plans")}</h1>
        <p className="mt-3 text-sm leading-6 text-aeviora-slate">{t("View your current membership and compare available plans, monthly prices, and benefits. Choose a plan to continue to secure checkout.")}</p>
      </header>
      <MembershipOptions />
    </div>
  );
}
