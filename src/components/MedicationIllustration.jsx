import { useId } from "react";
import logo from "../assets/Aeviorafavicon.png";
import { company } from "../util/constants.jsx";

function MedicationContainer({ name, kind, spanish, compact = false }) {
  const id = useId();
  const vial = kind === "vial";
  return <svg viewBox="0 0 210 280" className={compact ? "h-52 w-36 shrink-0" : "h-64 w-44 shrink-0"} role="img" aria-label={spanish ? `${vial ? "Vial" : "Frasco"} ilustrativo de ${name}` : `Illustrative ${name} ${vial ? "vial" : "bottle"}`}>
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
        <text x="105" y="159" textAnchor="middle" fill="#304b3b" fontSize={name.length > 10 ? 13 : 16} fontFamily="Georgia, serif">{name}</text>
        <path d="M80 195h50" stroke="#c3ae76" />
      </svg>;
}

function InjectionVial({ name, spanish }) {
  const id = useId();
  return <svg viewBox="0 0 210 280" className="h-auto w-full" role="img" aria-label={spanish ? `Vial inyectable ilustrativo de ${name}` : `Illustrative ${name} injection vial`}>
    <defs>
      <linearGradient id={`${id}-vial-glass`} x1="0" x2="1"><stop stopColor="#a9c4be" stopOpacity=".85" /><stop offset=".18" stopColor="#f5fffc" stopOpacity=".9" /><stop offset=".55" stopColor="#eaf5ee" stopOpacity=".65" /><stop offset="1" stopColor="#9db8ad" stopOpacity=".9" /></linearGradient>
      <linearGradient id={`${id}-vial-metal`} x1="0" x2="1"><stop stopColor="#84928f" /><stop offset=".24" stopColor="#e0e7e3" /><stop offset=".5" stopColor="#fafdf9" /><stop offset=".8" stopColor="#b4c0bb" /><stop offset="1" stopColor="#7c8b85" /></linearGradient>
      <linearGradient id={`${id}-vial-liquid`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e8d7a1" stopOpacity=".6" /><stop offset="1" stopColor="#c8b477" stopOpacity=".8" /></linearGradient>
      <clipPath id={`${id}-vial-body`}><path d="M78 89H132V108Q158 119 158 141V239Q158 254 143 254H67Q52 254 52 239V141Q52 119 78 108Z" /></clipPath>
    </defs>
    <ellipse cx="105" cy="262" rx="67" ry="9" fill="#283c30" opacity=".16" />
    <path d="M78 89H132V108Q158 119 158 141V239Q158 254 143 254H67Q52 254 52 239V141Q52 119 78 108Z" fill={`url(#${id}-vial-glass)`} stroke="#8fa69a" strokeWidth="2" />
    <g clipPath={`url(#${id}-vial-body)`}><path d="M48 181Q105 188 163 181V258H48Z" fill={`url(#${id}-vial-liquid)`} /><ellipse cx="105" cy="182" rx="57" ry="5" fill="#e6d7a7" opacity=".6" /></g>
    <rect x="75" y="77" width="60" height="23" rx="4" fill="#52645c" />
    <rect x="68" y="61" width="74" height="31" rx="5" fill={`url(#${id}-vial-metal)`} stroke="#8b9c93" strokeWidth="1.5" />
    <path d="M69 84H141M74 66V78M136 66V78" stroke="#84968b" strokeWidth="1.5" opacity=".75" />
    <ellipse cx="105" cy="61" rx="36" ry="7" fill="#c1cec5" stroke="#8b9c93" />
    <ellipse cx="105" cy="61" rx="16" ry="4" fill="#40594b" />
    <ellipse cx="105" cy="60" rx="10" ry="2" fill="#6f8677" />
    <path d="M66 137V234" stroke="#fff" strokeWidth="6" opacity=".72" strokeLinecap="round" />
    <path d="M148 145V235" stroke="#789284" strokeWidth="3" opacity=".3" strokeLinecap="round" />
    <rect x="53" y="157" width="104" height="65" rx="2" fill="#fffdf6" />
    <path d="M53 157H157" stroke="#536e58" strokeWidth="4" />
    <text x="105" y="188" textAnchor="middle" fill="#304b3b" fontSize="19" fontFamily="Georgia, serif">{name}</text>
    <path d="M86 207H124" stroke="#c3ae76" strokeWidth="1.5" />
    <path d="M63 244Q105 251 147 244" stroke="#fff" strokeWidth="3" opacity=".65" fill="none" />
  </svg>;
}

export default function MedicationIllustration({ medication, language }) {
  const spanish = language === "es";
  const paired = medication.kind === "bottle-and-vial";
  return <figure className="overflow-hidden rounded-3xl border border-aeviora-border bg-white">
    <div className={`${paired ? "flex-col gap-5" : "flex-wrap gap-3 sm:gap-7"} flex min-h-80 items-center justify-center bg-gradient-to-br from-aeviora-ivory to-aeviora-softSage px-5 py-8`}>
      {paired ? <div className="relative isolate aspect-[7/6] w-full max-w-xs">
        <div className="absolute bottom-0 left-0 w-[65%] [&>svg]:h-auto [&>svg]:w-full"><MedicationContainer kind="bottle" name={medication.name} spanish={spanish} /></div>
        <div className="absolute bottom-0 right-0 z-10 w-[40%]"><InjectionVial name={medication.name} spanish={spanish} /></div>
      </div> : <MedicationContainer kind={medication.kind} name={medication.name} spanish={spanish} />}
      <div className="max-w-36 text-center">
        <img src={logo} alt={`${company.name} logo`} className="mx-auto h-20 w-20 rounded-full" />
        <p className="mt-3 font-display text-xl text-aeviora-primary">Aeviora</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-aeviora-primary">Wellness</p>
      </div>
    </div>
  </figure>;
}
