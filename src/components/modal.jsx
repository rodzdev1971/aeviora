import { X } from "lucide-react";
import WellnessQuestionnaireModal from "./wellnessmodalquestionnaire"

export default function Modal({ isOpen, onClose, title, description, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center bg-white justify-center px-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 bg-white backdrop-blur-sm"
      />

      {/* Modal Box */}
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        <div className="relative z-10 w-full max-w-3xl border-none rounded-none bg-white">
            {/* Header */}
            {/* <div className="flex justify-end pr-5 pt-1">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-aeviora-black"
                >
                    <X size={22} />
                </button>
            </div> */}
            {/* <div className="flex items-start justify-center border-b border-gray-200 p-1">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-aeviora-gold">
                    Aeviora Wellness
                    </p>

                    {title && (
                    <h2 className="mt-2 font-display text-3xl text-aeviora-black">
                        {title}
                    </h2>
                    )}

                    {description && (
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        {description}
                    </p>
                    )}
                </div>
            </div> */}

            {/* Body */}
            <div className="max-h-[100vh] overflow-y-auto no-scrollbar p-6">
                <div className="flex justify-end pr-5 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-aeviora-black"
                    >
                        <X size={22} />
                    </button>
                </div>
                <WellnessQuestionnaireModal />
            </div>
        </div>
     </div>
    </div>
  );
}