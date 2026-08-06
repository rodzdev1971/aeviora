export default function ProfessionalCard({ icon, title, text }) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-aeviora-gold hover:shadow-xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-primaryDark text-aeviora-softGold">
          {icon}
        </div>
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    );
  }