import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import MainDashboard from "./pages/MainDashboard";
import Profile from "./pages/Profile";
import TermsOfUse from "./pages/termsofuse.jsx";
import AccountPrivacy from "./pages/AccountPrivacy.jsx";
import AccountTerms from "./pages/AccountTerms.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminBenefits from "./pages/AdminBenefits.jsx";
import AdminMemberships from "./pages/AdminMemberships.jsx";
import AdminFees from "./pages/AdminFees.jsx";
import AdminEmailTemplates from "./pages/AdminEmailTemplates.jsx";
import ProtectedRoute from "./components/protectedroute";
import DashboardLayout from "./components/dashboardlayout";


export default function App() {

  return (

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/termsofuse" element={<TermsOfUse />} />
      <Route path="/account-privacy" element={<AccountPrivacy />} />
      <Route path="/account-terms" element={<AccountTerms />} />
      {/* <Route path="test" element={<DashboardLayout />} /> */}

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
            <Route path='dashboard' element={<MainDashboard />}/>
            <Route path='profile' element={<Profile />} />
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/benefits" element={<AdminBenefits />} />
              <Route path="admin/memberships" element={<AdminMemberships />} />
              <Route path="admin/fees" element={<AdminFees />} />
              <Route path="admin/email-templates" element={<AdminEmailTemplates />} />
            </Route>
        </Route>
      </Route>
    </Routes>
  );
}
