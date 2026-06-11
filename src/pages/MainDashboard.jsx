import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function MainDashboard(){
  // const navigate = useNavigate();

  // function logout() {
  //   sessionStorage.removeItem("aeviora_session");
  //   navigate("/login");
  // }

  // const links = [
  //   { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  //   { label: "Records", href: "/records", icon: <FileText size={18} /> },
  //   { label: "Intake Forms", href: "/intake", icon: <ClipboardList size={18} /> },
  //   { label: "Profile", href: "/profile", icon: <User size={18} /> },
  // ];

  return (
    <div className="min-h-screen mx-auto max-w-5xl bg-aeviora-cream">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
          <div>
              <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                Patient Portal
              </p>
              <h1 className="font-display text-2xl">Welcome back</h1>
          </div>
        </div>
    </div>
  );
}