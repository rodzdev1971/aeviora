import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-aeviora-black/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">
            A
          </div>
          <div>
            <p className="font-display text-xl tracking-wide text-white">
              Aeviora Wellness
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-lightGold">
              Longevity & Precision Health
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#services" className="text-sm text-gray-200 hover:text-aeviora-gold">
            Services
          </a>
          <a href="#privacy" className="text-sm text-gray-200 hover:text-aeviora-gold">
            Privacy
          </a>
          <Link to="/login" className="text-sm text-gray-200 hover:text-aeviora-gold">
            Login
          </Link>
          <Link to="/register" className="btn-gold">
            Patient Portal
          </Link>
        </nav>

        <div className="md:hidden">
          <Link to="/login" className="text-aeviora-gold">
            Portal
          </Link>
        </div>
      </div>
    </header>
  );
}