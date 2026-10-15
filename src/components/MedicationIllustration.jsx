import { useId } from "react";
import logo from "../assets/Aeviorafavicon.png";
import { company } from "../util/constants.jsx";

export default function MedicationIllustration({ medication, language }) {
  const id = useId();
  const spanish = language === "es";
  const vial = medication.kind === "vial";
  return <figure className="overflow-hidden rounded-3xl border border-aeviora-border bg-white">
    <div className="flex min-h-80 flex-wrap items-center justify-center gap-3 bg-gradient-to-br from-aeviora-ivory to-aeviora-softSage px-5 py-8 sm:gap-7">
      <svg viewBox="0 0 210 280" className="h-64 w-44 shrink-0" role="img" aria-label={spanish ? `Frasco ilustrativo de ${medication.name}` : `Illustrative ${medication.name} bottle`}>
        <defs>
          <linearGradient id={`${id}-glass`} x1="0" x2="1"><stop stopColor="#5a321c" /><stop offset=".35" stopColor="#a56a31" /><stop offset=".65" stopColor="#ce9851" /><stop offset="1" stopColor="#70401f" /></linearGradient>
          <linearGradient id={`${id}-cap`} x1="0" x2="1"><stop stopColor="#c4c9c4" /><stop offset=".5" stopColor="#fafbf8" /><stop offset="1" stopColor="#afb8b1" /></linearGradient>
        </defs>
        <ellipse cx="105" cy="262" rx="76" ry="10" fill="#283c30" opacity=".12" />
        <path d={vial ? "M67 54 H143 V79 Q164 90 164 109 V240 Q164 254 150 254 H60 Q46 254 46 240 V109 Q46 90 67 79 Z" : "M54 55 H156 V79 Q178 91 178 113 V237 Q178 254 160 254 H50 Q32 254 32 237 V113 Q32 91 54 79 Z"} fill={`url(#${id}-glass)`} stroke="#68452c" strokeWidth="2" />
        <rect x={vial ? 61 : 47} y="28" width={vial ? 88 : 116} height="42" rx="7" fill={`url(#${id}-cap)`} stroke="#a9b2aa" />
        {!vial && Array.from({ length: 13 }, (_, n) => <path key={n} d={`M${54 + n * 8} 35v28`} stroke="#abb2aa" opacity=".5" />)}
        <path d="M57 104 V231" stroke="white" strokeWidth="7" opacity=".15" strokeLinecap="round" />
        <rect x={vial ? 47 : 33} y="125" width={vial ? 116 : 144} height="91" fill="#faf8f0" />
        <path d={vial ? "M47 125h116" : "M33 125h144"} stroke="#536e58" strokeWidth="5" />
        <text x="105" y="159" textAnchor="middle" fill="#304b3b" fontSize={medication.name.length > 10 ? 13 : 16} fontFamily="Georgia, serif">{medication.name}</text>
        <text x="105" y="180" textAnchor="middle" fill="#59645d" fontSize="9" letterSpacing="1.5">{spanish ? "ILUSTRACIÓN" : "ILLUSTRATION"}</text>
        <path d="M80 195h50" stroke="#c3ae76" />
      </svg>
      <div className="max-w-36 text-center">
        <img src={logo} alt={`${company.name} logo`} className="mx-auto h-20 w-20 rounded-full" />
        <p className="mt-3 font-display text-xl text-aeviora-primary">Aeviora</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-aeviora-primary">Wellness</p>
      </div>
    </div>
    <figcaption className="px-5 py-4 text-xs leading-5 text-aeviora-slate">{spanish ? "Ilustración de un frasco; no representa un producto dispensado, dosis ni formulación. El logotipo identifica esta guía educativa, no al fabricante." : "Sample bottle illustration; not a dispensed product, dose or formulation. The logo identifies this educational guide, not the manufacturer."}</figcaption>
  </figure>;
}
