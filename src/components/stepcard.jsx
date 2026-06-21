export default function StepCard({ number, title, text }) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-aeviora-cream p-6">
        <p className="font-display text-4xl text-aeviora-gold">{number}</p>
        <h3 className="mt-5 font-display text-2xl">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    );
  }