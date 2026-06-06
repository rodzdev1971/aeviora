import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function Dashboard(){
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("aeviora_session");
    navigate("/login");
  }

  const links = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Records", href: "/records", icon: <FileText size={18} /> },
    { label: "Intake Forms", href: "/intake", icon: <ClipboardList size={18} /> },
    { label: "Profile", href: "/profile", icon: <User size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-aeviora-cream">
      <aside className="fixed left-0 top-0 hidden h-full w-72 bg-aeviora-black p-6 text-white lg:block">
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

        <nav className="mt-10 grid gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/10 hover:text-aeviora-gold"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
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
      </aside>

      <header className="sticky top-0 z-40 border-b bg-white px-6 py-4 lg:ml-72">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
              Patient Portal
            </p>
            <h1 className="font-display text-2xl">Welcome back</h1>
          </div>

          <button onClick={logout} className="lg:hidden">
            <LogOut />
          </button>
        </div>

        <nav className="mt-4 flex gap-3 overflow-x-auto lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="whitespace-nowrap rounded-full bg-aeviora-black px-4 py-2 text-xs text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
    </div>
  );
}