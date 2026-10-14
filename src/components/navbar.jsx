import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { Link } from "react-router-dom"

export default function Navbar() {
  useLanguage();
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-aeviora-primaryDark backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">{t("A")}</div>
          <div>
            <p className="font-display text-xl tracking-wide text-aeviora-softGold">{t("Aeviora Wellness")}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-softSage">{t("by Health GuideLife LLC")}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#memberships" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">{t("Memberships")}</a>
          <a href="/#therapies" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">{t("Therapy Topics")}</a>
          <Link to="/login" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">{t("Login")}</Link>
          <Link to="/register" className="btn-secondary">{t("Sign up for free")}</Link>
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          <Link to="/login" className="text-aeviora-softSage">{t("Login")}</Link>
          <Link to="/register" className="text-aeviora-gold">{t("Join free")}</Link>
        </div>
      </div>
    </header>
  );
}
