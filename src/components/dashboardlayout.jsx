import { Link, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function DashboardLayout() {
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("aeviora_session");
    navigate("/login");
  }

  // async function logout() {
  //   await fetch("http://localhost:5000/api/auth/logout", {
  //     method: "POST",
  //     credentials: "include",
  //   });
  
  //   navigate("/login");
  // }

  const links = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Records", href: "/records", icon: <FileText size={18} /> },
    { label: "Intake Forms", href: "/intake", icon: <ClipboardList size={18} /> },
    { label: "Profile", href: "/profile", icon: <User size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-aeviora-cream">
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">

      {/* <!-- Left Aside Menu --> */}
      <aside className="bg-aeviora-black text-white md:min-h-screen">
        <div className="sticky top-0 p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">
            A
          </div>
          <div>
            <p className="font-display text-xl">Aeviora</p>
            <p className="text-xs uppercase tracking-[0.2em] text-aeviora-gold">
              Wellness Portal
            </p>
          </div>
        </Link>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center gap-3 rounded-2xl px-4 py-4 text-sm text-gray-200 hover:bg-white/10 hover:text-aeviora-gold"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          </nav>
          <div className="mt-4 md:mt-auto">
            <div className="mb-4 rounded-2xl border border-aeviora-gold/30 p-4">
              <ShieldCheck className="mb-2 text-aeviora-gold" size={20} />
              <p className="text-xs text-gray-300">
                Secure access recommended with MFA, timeout controls, and audit logs.
              </p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/20"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* <!-- Right Content Area --> */}
      <main className="min-w-0 p-4 md:p-8">
        {/* <div className="rounded-2xl bg-white p-2 shadow-sm">
          <div>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                Patient Portal
              </p>
              <h1 className="font-display text-2xl">Welcome back</h1>
          </div>
        </div> */}
        <div className=''>
          <Outlet />
        </div>
      </main>
      {/* <div className=''>
        <Outlet />
      </div> */}
    </div>
  </div>
  );
}