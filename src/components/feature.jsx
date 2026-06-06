export default function Feature({ icon, title}){
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-aeviora-gold">{icon}</div>
        <p className="text-sm text-aeviora-cream">{title}</p>
      </div>
    );
  }