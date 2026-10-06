import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-aeviora-primaryDark backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-aeviora-gold text-xl font-bold text-aeviora-gold">
            A
          </div>
          <div>
            <p className="font-display text-xl tracking-wide text-aeviora-softGold">
              Aeviora Wellness
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-softSage">
              by Health GuideLife LLC
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#memberships" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">
            Memberships
          </a>
          <a href="/#therapies" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">
            Therapy Topics
          </a>
          <Link to="/login" className="text-sm text-aeviora-softSage hover:text-aeviora-gold">
            Login
          </Link>
          <Link to="/register" className="btn-secondary">
            Sign up for free
          </Link>
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          <Link to="/login" className="text-aeviora-softSage">
            Login
          </Link>
          <Link to="/register" className="text-aeviora-gold">
            Join free
          </Link>
        </div>
      </div>
    </header>
  );
}
