import {
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    ChevronDown,
    Stethoscope,
    HeartPulse,
    Syringe,
    Scale,
    Activity,
    Sparkles,
    Droplets,
    Brain,
    ShieldPlus,
  } from "lucide-react";
export const questions = [
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
export const protocols = [
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