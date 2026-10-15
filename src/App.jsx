import { Routes, Route } from "react-router-dom";
import LanguageSelector from "./i18n/LanguageSelector.jsx";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import PasswordRecovery from "./pages/PasswordRecovery.jsx";
import EmailVerification from "./pages/EmailVerification.jsx";
import MainDashboard from "./pages/MainDashboard";
import TherapyExplorer from "./pages/TherapyExplorer.jsx";
import Profile from "./pages/Profile";
import Directory from "./pages/Directory.jsx";
import MembershipPlans from "./pages/MembershipPlans.jsx";
import MembershipCheckout from "./pages/MembershipCheckout.jsx";
import TermsOfUse from "./pages/termsofuse.jsx";
import AccountPrivacy from "./pages/AccountPrivacy.jsx";
import AccountTerms from "./pages/AccountTerms.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminBenefits from "./pages/AdminBenefits.jsx";
import AdminMemberships from "./pages/AdminMemberships.jsx";
import AdminFees from "./pages/AdminFees.jsx";
import AdminPayments from "./pages/AdminPayments.jsx";
import AdminEmailTemplates from "./pages/AdminEmailTemplates.jsx";
import ProtectedRoute from "./components/protectedroute";
import DashboardLayout from "./components/dashboardlayout";


export default function App() {

  return (

    <><LanguageSelector /><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
      <Route path="/reset-password" element={<PasswordRecovery key="reset" reset />} />
      <Route path="/termsofuse" element={<TermsOfUse />} />
      <Route path="/account-privacy" element={<AccountPrivacy />} />
      <Route path="/account-terms" element={<AccountTerms />} />
      {/* <Route path="test" element={<DashboardLayout />} /> */}

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
            <Route path='dashboard' element={<MainDashboard />}/>
            <Route path="therapies" element={<TherapyExplorer />} />
            <Route path="therapies/:topicId" element={<TherapyExplorer />} />
            <Route path="therapies/:topicId/:medicationId" element={<TherapyExplorer />} />
            <Route path='profile' element={<Profile />} />
            <Route path="directory" element={<Directory />} />
            <Route path="memberships" element={<MembershipPlans />} />
            <Route path="memberships/:planId/payment" element={<MembershipCheckout />} />
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/benefits" element={<AdminBenefits />} />
              <Route path="admin/memberships" element={<AdminMemberships />} />
              <Route path="admin/fees" element={<AdminFees />} />
              <Route path="admin/payments" element={<AdminPayments />} />
              <Route path="admin/email-templates" element={<AdminEmailTemplates />} />
            </Route>
        </Route>
      </Route>
    </Routes></>
  );
}
