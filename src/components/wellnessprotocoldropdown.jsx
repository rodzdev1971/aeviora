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
import {protocols} from '../util/constants'


export default function WellnessProtocolDropdown({modalSetting, sProtocol}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  function handleSelect(protocol) {
    setSelectedProtocol(protocol);
    setIsOpen(false);
    sProtocol(protocol.name);
  }

  function openDropDownHandler(){
    setIsOpen((prev)=>!prev);
    setSelectedProtocol(prev => null)
  }
  return (
    <div className="relative z-40 m-auto w-full max-w-xl">
      <label className="mb-2 px-2 block text-lg font-semibold text-gray-700">
        Wellness Selection
      </label>

      <button
        type="button"
        // onClick={() => setIsOpen((prev) => !prev)}
        onClick={openDropDownHandler}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-aeviora-gold focus:border-aeviora-gold focus:outline-none focus:ring-2 focus:ring-aeviora-lightGold"
      >
        <div className="no-scrollbar overflow-y-auto">
          <p className="text-xl font-semibold text-aeviora-primaryDark">
            {selectedProtocol ? selectedProtocol.name : "Select a Wellness Therapy"}
          </p>
          <p className="mt-1 text-xs text-aeviora-primary">
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
        <div className="relative z-50 mt-3 max-h-96 w-full no-scrollbar overflow-y-auto rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              type="button"
              onClick={() => handleSelect(protocol)}
              className="flex w-full gap-4 rounded-2xl p-4 text-left transition hover:bg-aeviora-cream"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-aeviora-primaryDark text-aeviora-softGold">
                {protocol.icon}
              </div>

              <div>
                <p className="text-sm font-semibold text-aeviora-primaryDark">
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
        <div className="mt-4 rounded-2xl border border-aeviora-gold/40 bg-aeviora-ivory p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
            Selected Protocol
          </p>
          <h3 className="mt-2 font-display text-2xl text-aeviora-primaryDark">
            {selectedProtocol.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {selectedProtocol.description}
          </p>
          <button className="btn-primary mt-2 text-lg w-full"
            type="button"
            onClick={() => {
            //   protocol(service);
              modalSetting(true)
            }}
          >
            Start your wellness
          </button>
        </div>
      )}
    </div>
  );
}