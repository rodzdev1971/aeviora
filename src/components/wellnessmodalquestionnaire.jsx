import { useMemo, useState } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HeartPulse,
  Scale,
  Brain,
  Activity,
  ShieldCheck,
} from "lucide-react";

const questions = [
  {
    id: "primary-goal",
    type: "single",
    title: "What is your main wellness goal?",
    subtitle: "Choose the option that best describes what you want to improve.",
    options: [
      {
        id: "weight-loss",
        label: "Weight loss and metabolic health",
        icon: <Scale size={22} />,
        feedbackTitle: "Medical Weight Loss and GLP-1 Support",
        feedback:
          "Patients interested in weight and metabolic health may benefit from an evaluation for GLP-1 programs, nutrition guidance, insulin resistance screening, and body composition tracking.",
        suggestedProtocol: "GLP-1 Weight Loss Program",
      },
      {
        id: "energy",
        label: "Low energy or fatigue",
        icon: <Activity size={22} />,
        feedbackTitle: "Energy and Cellular Wellness",
        feedback:
          "Low energy may be related to sleep quality, nutrition, hormones, thyroid function, vitamin levels, metabolic health, or lifestyle factors. A wellness assessment can help identify possible contributors.",
        suggestedProtocol: "Functional Medicine / Longevity Assessment",
      },
      {
        id: "hormones",
        label: "Hormone balance or low libido",
        icon: <HeartPulse size={22} />,
        feedbackTitle: "Hormone Optimization Interest",
        feedback:
          "Hormone-related symptoms may require a careful review of medical history, symptoms, baseline labs, contraindications, and ongoing monitoring before considering TRT, BHRT, or alternative hormone-supportive therapies.",
        suggestedProtocol: "Hormone Optimization",
      },
      {
        id: "longevity",
        label: "Healthy aging and longevity",
        icon: <Sparkles size={22} />,
        feedbackTitle: "Longevity and Preventive Wellness",
        feedback:
          "Longevity care may include advanced lab review, cardiometabolic risk assessment, inflammation markers, nutrition planning, sleep optimization, and personalized wellness recommendations.",
        suggestedProtocol: "Longevity Assessment",
      },
    ],
  },
  {
    id: "symptoms",
    type: "multiple",
    title: "Which symptoms or concerns apply to you?",
    subtitle: "Select all that apply. You can choose more than one.",
    options: [
      {
        id: "fatigue",
        label: "Fatigue or low energy",
        feedback:
          "Fatigue may be associated with sleep, hormones, thyroid status, nutrient levels, stress, inflammation, or metabolic health.",
      },
      {
        id: "weight-gain",
        label: "Weight gain or difficulty losing weight",
        feedback:
          "Difficulty losing weight may involve appetite signaling, insulin resistance, nutrition patterns, sleep, stress, medications, or hormonal factors.",
      },
      {
        id: "brain-fog",
        label: "Brain fog or poor focus",
        feedback:
          "Brain fog may be influenced by sleep quality, stress, glucose regulation, nutrient deficiencies, inflammation, or hormone imbalance.",
      },
      {
        id: "low-libido",
        label: "Low libido",
        feedback:
          "Low libido can have hormonal, psychological, lifestyle, medication-related, relationship-related, and metabolic contributors.",
      },
      {
        id: "poor-sleep",
        label: "Poor sleep",
        feedback:
          "Sleep quality is foundational to metabolic health, hormone balance, mood, recovery, and long-term wellness.",
      },
      {
        id: "joint-pain",
        label: "Joint discomfort or slow recovery",
        feedback:
          "Joint discomfort and slow recovery may benefit from reviewing inflammation, training load, nutrition, sleep, and musculoskeletal health.",
      },
    ],
    feedbackTitle: "Your Symptom Pattern",
  },
  {
    id: "program-interest",
    type: "single",
    title: "Which program are you most interested in?",
    subtitle: "Choose one protocol to explore first.",
    options: [
      {
        id: "glp1",
        label: "GLP-1 Program",
        icon: <Scale size={22} />,
        feedbackTitle: "GLP-1 Program",
        feedback:
          "This program may include medical eligibility screening, weight history, metabolic labs, nutrition support, medication counseling, and follow-up monitoring.",
        suggestedProtocol: "GLP-1 Weight Loss Program",
      },
      {
        id: "peptides",
        label: "Peptide Therapy",
        icon: <Sparkles size={22} />,
        feedbackTitle: "Peptide Therapy",
        feedback:
          "Peptide therapy interest typically requires a health assessment, medication review, contraindication screening, protocol selection, and treatment monitoring.",
        suggestedProtocol: "Peptide Therapy",
      },
      {
        id: "trt-bhrt",
        label: "TRT / BHRT",
        icon: <HeartPulse size={22} />,
        feedbackTitle: "TRT / BHRT",
        feedback:
          "Hormone therapy requires symptom evaluation, medical history, contraindication screening, baseline labs, informed consent, and follow-up lab monitoring.",
        suggestedProtocol: "Hormone Optimization",
      },
      {
        id: "functional",
        label: "Functional Medicine",
        icon: <Brain size={22} />,
        feedbackTitle: "Functional Medicine",
        feedback:
          "Functional medicine may focus on root-cause patterns including nutrition, sleep, gut health, metabolic health, stress, inflammation, and hormone balance.",
        suggestedProtocol: "Functional Medicine",
      },
    ],
  },
  {
    id: "readiness",
    type: "single",
    title: "How soon are you looking to begin?",
    subtitle: "This helps guide the next step.",
    options: [
      {
        id: "asap",
        label: "As soon as possible",
        icon: <ArrowRight size={22} />,
        feedbackTitle: "Ready to Begin",
        feedback:
          "A care coordinator can guide you through registration, intake forms, lab requirements, and consultation scheduling.",
      },
      {
        id: "this-month",
        label: "Within the next month",
        icon: <CheckCircle2 size={22} />,
        feedbackTitle: "Planning Ahead",
        feedback:
          "This is a good time to complete intake forms, collect prior labs, review medications, and schedule your wellness consultation.",
      },
      {
        id: "researching",
        label: "I am still researching",
        icon: <ShieldCheck size={22} />,
        feedbackTitle: "Exploring Options",
        feedback:
          "You can start with a general wellness assessment to learn which programs may be appropriate based on your goals and history.",
      },
    ],
  },
];

export default function WellnessQuestionnaireModal({ isOpen, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = questions[stepIndex];
  const isLastQuestion = stepIndex === questions.length - 1;

  const currentAnswer = answers[currentQuestion?.id];

  const progress = useMemo(() => {
    return Math.round(((stepIndex + 1) / questions.length) * 100);
  }, [stepIndex]);

  // if (!isOpen) return null;

  function closeAndReset() {
    onClose();
    setTimeout(() => {
      setStepIndex(0);
      setDirection("forward");
      setAnswers({});
      setShowFeedback(false);
    }, 200);
  }

  function handleSingleSelect(option) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option,
    }));

    setShowFeedback(true);
  }

  function handleCheckboxToggle(option) {
    const currentSelections = answers[currentQuestion.id] || [];
    const isSelected = currentSelections.some((item) => item.id === option.id);

    const updatedSelections = isSelected
      ? currentSelections.filter((item) => item.id !== option.id)
      : [...currentSelections, option];

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedSelections,
    }));
  }

  function handleNext() {
    if (currentQuestion.type === "multiple" && !showFeedback) {
      setShowFeedback(true);
      return;
    }

    if (isLastQuestion) {
      setDirection("forward");
      setStepIndex(stepIndex + 1);
      setShowFeedback(false);
      return;
    }

    setDirection("forward");
    setShowFeedback(false);
    setStepIndex((prev) => prev + 1);
  }

  function handleBack() {
    if (showFeedback) {
      setShowFeedback(false);
      return;
    }

    if (stepIndex > 0) {
      setDirection("backward");
      setStepIndex((prev) => prev - 1);
      setShowFeedback(false);
    }
  }

  function hasAnswer() {
    if (!currentQuestion) return true;

    const answer = answers[currentQuestion.id];

    if (currentQuestion.type === "single") {
      return Boolean(answer);
    }

    if (currentQuestion.type === "multiple") {
      return Array.isArray(answer) && answer.length > 0;
    }

    return false;
  }

  const isSummaryStep = stepIndex >= questions.length;

  return (
    // <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
    <div>
      {/* <button
        type="button"
        onClick={closeAndReset}
        aria-label="Close modal"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      /> */}

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-aeviora-border p-6">
          <div className="w-full pr-6">
            {/* <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
              Aeviora Wellness
            </p>

            <h2 className="mt-2 font-display text-3xl text-aeviora-charcoal">
              Wellness Dashboard
            </h2> */}

            {!isSummaryStep && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-aeviora-slate">
                  <span>
                    Question {stepIndex + 1} of {questions.length}
                  </span>
                  <span>{progress}% Complete</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-aeviora-softSage">
                  <div
                    className="h-full rounded-full bg-aeviora-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* <button
            type="button"
            onClick={closeAndReset}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-aeviora-charcoal"
          >
            <X size={22} />
          </button> */}
        </div>

        <div className="min-h-[520px] overflow-hidden p-6">
          <div
            key={`${stepIndex}-${showFeedback}`}
            className={`animate-question-enter ${
              direction === "forward"
                ? "motion-safe:animate-slide-in-right"
                : "motion-safe:animate-slide-in-left"
            }`}
          >
            {isSummaryStep ? (
              <SummaryStep answers={answers} onClose={closeAndReset} />
            ) : showFeedback ? (
              <FeedbackStep
                question={currentQuestion}
                answer={currentAnswer}
                onNext={handleNext}
                onBack={handleBack}
                isLastQuestion={isLastQuestion}
              />
            ) : (
              <QuestionStep
                question={currentQuestion}
                answer={currentAnswer}
                onSingleSelect={handleSingleSelect}
                onCheckboxToggle={handleCheckboxToggle}
              />
            )}
          </div>
        </div>

        {!isSummaryStep && (
          <div className="flex items-center justify-between border-t border-aeviora-border bg-aeviora-ivory p-5">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex === 0 && !showFeedback}
              className="inline-flex items-center gap-2 rounded-xl border border-aeviora-border bg-white px-4 py-3 text-sm font-semibold text-aeviora-charcoal transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            {currentQuestion.type === "multiple" && !showFeedback && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasAnswer()}
                className="inline-flex items-center gap-2 rounded-xl bg-aeviora-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-aeviora-primaryDark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight size={17} />
              </button>
            )}

            {showFeedback && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-aeviora-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-aeviora-primaryDark"
              >
                {isLastQuestion ? "View Summary" : "Continue"}
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionStep({
  question,
  answer,
  onSingleSelect,
  onCheckboxToggle,
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
          Patient Interest Assessment
        </p>

        <h3 className="mt-3 font-display text-4xl leading-tight text-aeviora-charcoal">
          {question.title}
        </h3>

        <p className="mt-3 text-base leading-7 text-aeviora-slate">
          {question.subtitle}
        </p>
      </div>

      {question.type === "single" && (
        <div className="grid gap-4">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSingleSelect(option)}
              className="group flex w-full items-center gap-4 rounded-3xl border border-aeviora-border bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-aeviora-primary hover:shadow-lg"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aeviora-softSage text-aeviora-primary transition group-hover:bg-aeviora-primary group-hover:text-white">
                {option.icon || <CheckCircle2 size={22} />}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-aeviora-charcoal">
                  {option.label}
                </p>
                {option.suggestedProtocol && (
                  <p className="mt-1 text-xs text-aeviora-slate">
                    Suggested area: {option.suggestedProtocol}
                  </p>
                )}
              </div>

              <ArrowRight
                size={18}
                className="text-aeviora-gold opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      )}

      {question.type === "multiple" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {question.options.map((option) => {
            const selected =
              Array.isArray(answer) &&
              answer.some((item) => item.id === option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onCheckboxToggle(option)}
                className={`rounded-3xl border p-5 text-left transition duration-300 ${
                  selected
                    ? "border-aeviora-primary bg-aeviora-softSage shadow-md"
                    : "border-aeviora-border bg-white hover:-translate-y-1 hover:border-aeviora-primary hover:shadow-lg"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      selected
                        ? "bg-aeviora-primary text-white"
                        : "bg-aeviora-ivory text-aeviora-primary"
                    }`}
                  >
                    <CheckCircle2 size={20} />
                  </div>

                  <div
                    className={`h-5 w-5 rounded-md border ${
                      selected
                        ? "border-aeviora-primary bg-aeviora-primary"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {selected && (
                      <CheckCircle2 size={18} className="text-white" />
                    )}
                  </div>
                </div>

                <p className="font-semibold text-aeviora-charcoal">
                  {option.label}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackStep({ question, answer, onNext, onBack, isLastQuestion }) {
  const multipleAnswers = Array.isArray(answer) ? answer : [];

  if (question.type === "multiple") {
    return (
      <div>
        <div className="rounded-[2rem] bg-gradient-to-br from-aeviora-softSage to-white p-7">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-aeviora-primary text-white">
            <Sparkles size={26} />
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
            Personalized Insight
          </p>

          <h3 className="mt-3 font-display text-4xl text-aeviora-charcoal">
            {question.feedbackTitle}
          </h3>

          <p className="mt-4 leading-7 text-aeviora-slate">
            Based on your selections, your wellness assessment may benefit from
            reviewing the following areas:
          </p>

          <div className="mt-6 grid gap-4">
            {multipleAnswers.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-aeviora-border bg-white p-5"
              >
                <p className="font-semibold text-aeviora-charcoal">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-aeviora-slate">
                  {item.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>

        <MedicalDisclaimer />
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-[2rem] bg-gradient-to-br from-aeviora-softSage to-white p-7">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-aeviora-primary text-white">
          {answer?.icon || <Sparkles size={26} />}
        </div>

        <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
          Recommended Direction
        </p>

        <h3 className="mt-3 font-display text-4xl text-aeviora-charcoal">
          {answer?.feedbackTitle}
        </h3>

        <p className="mt-4 text-base leading-7 text-aeviora-slate">
          {answer?.feedback}
        </p>

        {answer?.suggestedProtocol && (
          <div className="mt-6 rounded-2xl border border-aeviora-primary/20 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
              Suggested Protocol
            </p>
            <p className="mt-2 font-display text-2xl text-aeviora-charcoal">
              {answer.suggestedProtocol}
            </p>
          </div>
        )}
      </div>

      <MedicalDisclaimer />
    </div>
  );
}

function SummaryStep({ answers, onClose }) {
  const primaryGoal = answers["primary-goal"];
  const symptoms = answers["symptoms"] || [];
  const programInterest = answers["program-interest"];
  const readiness = answers["readiness"];

  return (
    <div>
      <div className="rounded-[2rem] bg-gradient-to-br from-aeviora-softSage to-white p-7">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-aeviora-primary text-white">
          <CheckCircle2 size={28} />
        </div>

        <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
          Assessment Complete
        </p>

        <h3 className="mt-3 font-display text-4xl text-aeviora-charcoal">
          Your Wellness Interest Summary
        </h3>

        <p className="mt-4 leading-7 text-aeviora-slate">
          This summary can be used to guide the next step in the patient
          registration or wellness intake process.
        </p>

        <div className="mt-7 grid gap-4">
          <SummaryItem label="Main Goal" value={primaryGoal?.label} />
          <SummaryItem label="Interested Program" value={programInterest?.label} />
          <SummaryItem label="Readiness" value={readiness?.label} />

          <div className="rounded-2xl border border-aeviora-border bg-white p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
              Symptoms / Concerns
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {symptoms.length > 0 ? (
                symptoms.map((symptom) => (
                  <span
                    key={symptom.id}
                    className="rounded-full bg-aeviora-softSage px-3 py-2 text-xs font-semibold text-aeviora-primary"
                  >
                    {symptom.label}
                  </span>
                ))
              ) : (
                <p className="text-sm text-aeviora-slate">No symptoms selected.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className="btn-primary">
            Continue to Registration
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-aeviora-primary px-5 py-3 text-sm font-semibold text-aeviora-primary hover:bg-aeviora-primary hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-aeviora-border bg-white p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-aeviora-primary">
        {label}
      </p>
      <p className="mt-2 font-semibold text-aeviora-charcoal">
        {value || "Not selected"}
      </p>
    </div>
  );
}

function MedicalDisclaimer() {
  return (
    <div className="mt-5 rounded-2xl border border-aeviora-border bg-white p-4">
      <p className="text-xs leading-5 text-aeviora-slate">
        This information is educational only and does not diagnose, treat, or
        replace medical advice. Final recommendations require consultation with
        a licensed healthcare professional and appropriate medical evaluation.
      </p>
    </div>
  );
}