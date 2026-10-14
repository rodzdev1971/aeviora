import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { Link } from "react-router-dom";
import { company } from "../util/constants";

export default function Footer() {
  useLanguage();
    return (
      <footer className="bg-aeviora-primaryDark px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <h3 className="font-display text-2xl text-aeviora-gold">{t("Aeviora Wellness")}</h3>
              <p className="mt-3 text-sm text-gray-300">{t("Explore wellness therapies and join a membership for discounted prices on eligible wellness and preventive care services.")}</p>
            </div>
  
            <div>
              <h4 className="font-semibold text-aeviora-lightGold">{t("Contact")}</h4>
              <p className="mt-3 text-sm text-gray-300">
                {t(company.address)}
                <br />
                {t(company.address1)}
                <br />
                {company.email}
                <br />{t("tel: ")}{t(company.telephone)}
                <br />{t("fax: ")}{t(company.fax)}
              </p>
            </div>
  
            <div>
              <h4 className="font-semibold text-aeviora-lightGold">{t("Using provider portals")}</h4>
              <p className="mt-3 text-sm text-gray-300">{t("Aeviora provides account registration and links to independent service providers, and does not collect health histories or clinical records on this website. Use the provider's own portal for care information and review its privacy and HIPAA practices.")}</p>
            </div>
            
            <div>
              <Link to='/termsofuse'  className="text-sm text-gray-300 hover:text-aeviora-gold"><p>{t("Terms of Use")}</p></Link>
              <Link to="/account-terms" className="mt-3 block text-sm text-gray-300 hover:text-aeviora-gold">{t("Account Terms")}</Link>
              <Link to="/account-privacy" className="mt-3 block text-sm text-gray-300 hover:text-aeviora-gold">{t("Account Privacy")}</Link>
            </div>

          </div>
  
          <p className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-400">
            © {t(new Date().getFullYear())}{t(" Aeviora Wellness by Health GuideLife LLC. All rights reserved.")}</p>
        </div>
      </footer>
    );
  }
