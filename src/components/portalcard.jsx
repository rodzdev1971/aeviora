export default function PortalCard({ icon, title, value }) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-aeviora-black text-aeviora-gold">
          {icon}
        </div>
        <p className="text-sm text-gray-300">{title}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </div>
    );
  }