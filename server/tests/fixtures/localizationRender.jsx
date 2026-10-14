import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Outlet, Routes, Route } from "react-router-dom";
import Home from "../../../src/pages/Home.jsx";
import Login from "../../../src/pages/Login.jsx";
import Register from "../../../src/pages/Register.jsx";
import PasswordRecovery from "../../../src/pages/PasswordRecovery.jsx";
import AccountTerms from "../../../src/pages/AccountTerms.jsx";
import AccountPrivacy from "../../../src/pages/AccountPrivacy.jsx";
import AdminFees from "../../../src/pages/AdminFees.jsx";
import AdminBenefits from "../../../src/pages/AdminBenefits.jsx";
import AdminMemberships from "../../../src/pages/AdminMemberships.jsx";
import AdminEmailTemplates from "../../../src/pages/AdminEmailTemplates.jsx";
import Directory from "../../../src/pages/Directory.jsx";
import DashboardLayout from "../../../src/components/dashboardlayout.jsx";
import LanguageSelector from "../../../src/i18n/LanguageSelector.jsx";
import { setLanguage } from "../../../src/i18n/language.js";
export { apiRequest } from "../../../src/util/api.js";

const screens = { Home, Login, Register, PasswordRecovery, AccountTerms, AccountPrivacy, AdminFees, AdminBenefits, AdminMemberships, AdminEmailTemplates, Directory, DashboardLayout };
export function renderScreen(name, language) {
  setLanguage(language);
  const Screen = screens[name];
  return renderToStaticMarkup(<MemoryRouter><LanguageSelector /><Routes><Route element={<Outlet context={{ user: { id: "synthetic", role: "admin", firstName: "Test" } }} />}><Route path="*" element={<Screen />} /></Route></Routes></MemoryRouter>);
}
