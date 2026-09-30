import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { protocols } from "../util/constants";

const informationTopics = [
  "General overview",
  "How clinical evaluation is generally discussed",
  "Questions to ask a licensed professional",
];

const formats = ["Brief summary", "More detailed explanation"];

export default function TherapyInterestQuiz({ onClose, showSignupCta = false }) {
  const [step, setStep] = useState(0);
  const [therapy, setTherapy] = useState(null);
  const [information, setInformation] = useState("");
  const [format, setFormat] = useState("");

  function resetQuiz() {
    setStep(0);
    setTherapy(null);
    setInformation("");
    setFormat("");
  }

  const questions = [
    {
      title: "Which therapy topic would you like to explore?",
      subtitle: "Choose a topic for general educational information.",
      options: protocols.map((item) => item.name),
      value: therapy,
      select: setTherapy,
    },
    {
      title: "What information would be useful?",
      subtitle: "Choose the kind of general information you want to read.",
      options: informationTopics,
      value: information,
      select: setInformation,
    },
    {
      title: "How much detail would you prefer?",
      subtitle: "Choose a reading format. This does not affect care or eligibility.",
      options: formats,
      value: format,
      select: setFormat,
    },
  ];
  const currentQuestion = questions[step];
  const selectedProtocol = protocols.find((item) => item.name === therapy);

  return (
    <section
      aria-labelledby="therapy-quiz-title"
      className="border border-aeviora-border bg-white p-5 sm:p-7"
    >
      <header className="flex items-start justify-between gap-4 border-b border-aeviora-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-aeviora-gold">
            Therapy topic explorer
          </p>
          <h2 id="therapy-quiz-title" className="mt-2 font-display text-2xl text-aeviora-charcoal">
            {step < questions.length ? "Choose what to explore" : "Your topic guide"}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close therapy topic explorer"
            className="p-2 text-aeviora-slate hover:bg-aeviora-ivory hover:text-aeviora-charcoal"
          >
            <X size={20} />
          </button>
        )}
      </header>

      {step < questions.length ? (
        <>
          <div className="mt-5 flex items-center justify-between text-xs text-aeviora-slate">
            <span>Question {step + 1} of {questions.length}</span>
            <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
          </div>
          <div
            className="mt-2 h-1.5 bg-aeviora-softSage"
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={step + 1}
          >
            <div
              className="h-full bg-aeviora-primary transition-all"
              style={{ width: `${((step + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="mt-6">
            <h3 className="font-display text-xl text-aeviora-charcoal">
              {currentQuestion.title}
            </h3>
            <p className="mt-1 text-sm text-aeviora-slate">
              {currentQuestion.subtitle}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const selected = currentQuestion.value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => currentQuestion.select(option)}
                    className={`flex min-h-12 items-center justify-between gap-3 border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-aeviora-primary bg-aeviora-softSage text-aeviora-primary"
                        : "border-aeviora-border hover:border-aeviora-primary"
                    }`}
                  >
                    <span>{option}</span>
                    {selected && <CheckCircle2 aria-hidden="true" size={18} />}
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="mt-6 flex justify-between border-t border-aeviora-border pt-4">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aeviora-slate hover:text-aeviora-charcoal disabled:opacity-40"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!currentQuestion.value}
              onClick={() => setStep((current) => current + 1)}
              className="inline-flex items-center gap-2 bg-aeviora-primary px-4 py-2 text-sm font-semibold text-white hover:bg-aeviora-primaryDark disabled:opacity-40"
            >
              {step === questions.length - 1 ? "View topic guide" : "Next"}
              <ArrowRight size={16} />
            </button>
          </footer>
        </>
      ) : (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase text-aeviora-gold">
            Your selections
          </p>
          <h3 className="mt-2 font-display text-2xl text-aeviora-charcoal">
            {selectedProtocol?.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-aeviora-slate">
            {selectedProtocol?.description}
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="border border-aeviora-border p-4">
              <dt className="text-xs font-semibold uppercase text-aeviora-slate">Information topic</dt>
              <dd className="mt-1 text-sm text-aeviora-charcoal">{information}</dd>
            </div>
            <div className="border border-aeviora-border p-4">
              <dt className="text-xs font-semibold uppercase text-aeviora-slate">Format</dt>
              <dd className="mt-1 text-sm text-aeviora-charcoal">{format}</dd>
            </div>
          </dl>
          <p className="mt-5 border-l-2 border-aeviora-gold pl-4 text-sm leading-6 text-aeviora-slate">
            This is an educational topic guide, not a screening, diagnosis, or
            treatment recommendation. Discuss care decisions with a licensed
            healthcare professional.
          </p>
          <p className="mt-3 text-xs leading-5 text-aeviora-slate">
            Your selections stay in this page's temporary memory. They are not
            sent to Aeviora or saved to your account, and disappear when you
            leave or refresh this page.
          </p>
          {showSignupCta && (
            <div className="mt-5 border-l-2 border-aeviora-gold bg-aeviora-ivory p-4">
              <p className="font-semibold text-aeviora-charcoal">
                Continue exploring in your Aeviora portal
              </p>
              <p className="mt-1 text-sm leading-6 text-aeviora-slate">
                Create an account to use the guide and access provider links
                after account activation and sign-in.
              </p>
              <Link
                to="/register"
                className="mt-3 inline-flex items-center gap-2 bg-aeviora-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-aeviora-primaryDark"
              >
                Create an account <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={resetQuiz} className="btn-secondary">
              Start over
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-primary">
                Close guide
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}