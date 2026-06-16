import { useState } from "react";
import {
  ChevronDown,
  HeartPulse,
  Syringe,
  Scale,
  Activity,
  Sparkles,
  Droplets,
  Brain,
  ShieldPlus,
} from "lucide-react";

const protocols = [
  {
    id: "hormone-optimization",
    name: "Hormone Optimization",
    description: "TRT, BHRT, symptom review, and hormone wellness support.",
    icon: <HeartPulse size={20} />,
  },
  {
    id: "peptide-therapy",
    name: "Peptide Therapy",
    description: "Wellness-focused peptide protocols and clinical monitoring.",
    icon: <Sparkles size={20} />,
  },
  {
    id: "glp1-program",
    name: "GLP-1 Weight Loss Program",
    description: "Medical weight loss support with GLP-1 therapy options.",
    icon: <Scale size={20} />,
  },
  {
    id: "functional-medicine",
    name: "Functional Medicine",
    description: "Root-cause health evaluation and personalized wellness planning.",
    icon: <Activity size={20} />,
  },
  {
    id: "nad-iv-therapy",
    name: "NAD+ and IV Therapy",
    description: "IV wellness therapy, hydration, micronutrients, and NAD+ support.",
    icon: <Droplets size={20} />,
  },
  {
    id: "longevity-assessment",
    name: "Longevity Assessment",
    description: "Preventive wellness, biomarkers, aging risk, and optimization plan.",
    icon: <ShieldPlus size={20} />,
  },
  {
    id: "metabolic-health",
    name: "Metabolic Health",
    description: "Insulin resistance, weight, lipids, and cardiometabolic wellness.",
    icon: <Brain size={20} />,
  },
  {
    id: "injectable-wellness",
    name: "Injectable Wellness",
    description: "B12, MIC, Lipo-Mino, and other wellness injection options.",
    icon: <Syringe size={20} />,
  },
];

export default function WellnessProtocolDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  function handleSelect(protocol) {
    setSelectedProtocol(protocol);
    setIsOpen(false);
  }

  return (
    <div className="relative w-full max-w-xl">
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        Wellness Dashboard
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-aeviora-gold focus:border-aeviora-gold focus:outline-none focus:ring-2 focus:ring-aeviora-lightGold"
      >
        <div>
          <p className="text-sm font-semibold text-aeviora-black">
            {selectedProtocol ? selectedProtocol.name : "Select a wellness protocol"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {selectedProtocol
              ? selectedProtocol.description
              : "Choose the service you are interested in"}
          </p>
        </div>

        <ChevronDown
          size={20}
          className={`text-aeviora-gold transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-3 max-h-96 w-full overflow-y-auto rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              type="button"
              onClick={() => handleSelect(protocol)}
              className="flex w-full gap-4 rounded-2xl p-4 text-left transition hover:bg-aeviora-cream"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
                {protocol.icon}
              </div>

              <div>
                <p className="text-sm font-semibold text-aeviora-black">
                  {protocol.name}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {protocol.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedProtocol && (
        <div className="mt-4 rounded-2xl border border-aeviora-gold/40 bg-aeviora-cream p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Selected Protocol
          </p>
          <h3 className="mt-2 font-display text-2xl text-aeviora-black">
            {selectedProtocol.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {selectedProtocol.description}
          </p>
        </div>
      )}
    </div>
  );
}