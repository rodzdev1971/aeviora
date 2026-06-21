import {
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