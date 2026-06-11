import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

/**
 * Aeviora Wellness
 * Patient Intake Form Component
 *
 * Required sections:
 * - Patient Information
 * - Emergency Contact
 * - Primary Health Goals
 * - Medical History
 * - Medications / Allergies
 * - Family History
 * - Lifestyle Assessment
 * - Therapy Interest
 * - HIPAA Acknowledgment
 * - Financial Policy
 * - Patient Signature
 */

const phoneRegex = /^[0-9+\-() ]{7,20}$/;
const zipRegex = /^[0-9]{5}(?:-[0-9]{4})?$/;

const intakeSchema = z.object({
  // Patient Information
  fullName: z.string().min(2, "Full name is required."),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  age: z
    .string()
    .min(1, "Age is required.")
    .refine((val) => Number(val) > 0 && Number(val) < 120, {
      message: "Enter a valid age.",
    }),
  sexAssignedAtBirth: z.string().min(1, "Please select sex assigned at birth."),
  genderIdentity: z.string().min(1, "Please select current gender identity."),

  address: z.string().min(3, "Address is required."),
  city: z.string().min(2, "City is required."),
  state: z.string().min(2, "State is required."),
  zipCode: z.string().regex(zipRegex, "Enter a valid ZIP code."),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number."),
  email: z.string().email("Enter a valid email address."),
  occupation: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().min(2, "Emergency contact name is required."),
  emergencyRelationship: z.string().min(2, "Relationship is required."),
  emergencyPhone: z.string().regex(phoneRegex, "Enter a valid emergency phone number."),

  // PCP / Pharmacy
  primaryCareProvider: z.string().optional(),
  preferredPharmacy: z.string().optional(),

  // Goals
  goal1: z.string().min(3, "Please enter at least one health goal."),
  goal2: z.string().optional(),
  goal3: z.string().optional(),
  currentHealthRating: z.string().min(1, "Please rate your current health."),
  mainConcern: z.string().min(5, "Please describe your main concern."),

  // Symptoms
  symptoms: z.array(z.string()).optional(),

  // Medical History
  medicalConditions: z.array(z.string()).optional(),
  otherMedicalConditions: z.string().optional(),
  cancerHistory: z.string().min(1, "Please answer cancer history."),
  cancerType: z.string().optional(),

  // Surgeries
  surgicalHistory: z.string().optional(),

  // Medications
  currentMedications: z.string().min(
    2,
    "Please list current medications or write 'None'."
  ),
  supplements: z.string().optional(),

  // Allergies
  medicationAllergies: z.string().min(
    2,
    "Please list medication allergies or write 'None'."
  ),
  foodAllergies: z.string().optional(),
  environmentalAllergies: z.string().optional(),

  // Family History
  familyHistory: z.array(z.string()).optional(),
  familyHistoryNotes: z.string().optional(),

  // Lifestyle
  exerciseDays: z.string().min(1, "Please select exercise frequency."),
  dietStyle: z.string().min(1, "Please select current diet style."),
  sleepHours: z
    .string()
    .min(1, "Average sleep hours is required.")
    .refine((val) => Number(val) >= 0 && Number(val) <= 24, {
      message: "Enter valid sleep hours between 0 and 24.",
    }),
  sleepQuality: z.string().min(1, "Please select sleep quality."),
  stressLevel: z.string().min(1, "Please select stress level."),
  tobaccoUse: z.string().min(1, "Please answer tobacco use."),
  alcoholUse: z.string().min(1, "Please answer alcohol use."),

  // Therapy Interest
  servicesInterested: z
    .array(z.string())
    .min(1, "Please select at least one service of interest."),

  // GLP-1 Safety
  interestedInGLP1: z.boolean().optional(),
  pancreatitisHistory: z.string().optional(),
  gallbladderHistory: z.string().optional(),
  thyroidCancerHistory: z.string().optional(),

  // Consent
  hipaaAcknowledgment: z.literal(true, {
    errorMap: () => ({ message: "HIPAA acknowledgment is required." }),
  }),
  financialPolicyAcknowledgment: z.literal(true, {
    errorMap: () => ({ message: "Financial policy acknowledgment is required." }),
  }),
  accuracyAttestation: z.literal(true, {
    errorMap: () => ({ message: "Patient attestation is required." }),
  }),

  signature: z.string().min(2, "Patient signature is required."),
  signatureDate: z.string().min(1, "Signature date is required."),
});

const symptomOptions = [
  "Fatigue",
  "Low energy",
  "Brain fog",
  "Poor concentration",
  "Weight gain",
  "Difficulty losing weight",
  "Increased appetite",
  "Cravings",
  "Difficulty sleeping",
  "Snoring",
  "Wake unrefreshed",
  "Anxiety",
  "Depression",
  "Low libido",
  "Erectile dysfunction",
  "Hot flashes",
  "Night sweats",
  "Joint pain",
  "Muscle pain",
  "Bloating",
  "Constipation",
  "Reflux",
];

const medicalConditionOptions = [
  "High blood pressure",
  "High cholesterol",
  "Heart disease",
  "Arrhythmia",
  "Stroke",
  "Type 1 diabetes",
  "Type 2 diabetes",
  "Prediabetes",
  "Thyroid disorder",
  "PCOS",
  "Asthma",
  "COPD",
  "Sleep apnea",
  "Migraines",
  "Anxiety",
  "Depression",
  "ADHD",
  "Autoimmune disease",
];

const familyHistoryOptions = [
  "Father - Heart disease",
  "Mother - Heart disease",
  "Sibling - Heart disease",
  "Father - Diabetes",
  "Mother - Diabetes",
  "Sibling - Diabetes",
  "Father - Cancer",
  "Mother - Cancer",
  "Sibling - Cancer",
  "Father - Dementia/Alzheimer’s",
  "Mother - Dementia/Alzheimer’s",
  "Sibling - Dementia/Alzheimer’s",
];

const serviceOptions = [
  "Hormone Optimization",
  "Medical Weight Loss",
  "GLP-1 Programs",
  "Peptide Therapy",
  "Functional Medicine",
  "NAD+ Therapy",
  "IV Therapy",
];

function FieldError({ error }) {
  if (!error) return null;

  return (
    <p className="mt-1 text-sm font-medium text-red-600">
      {error.message}
    </p>
  );
}

function Section({ number, title, children }) {
  return (
    <section className="rounded-3xl border border-[#c8a55b]/40 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3 border-b border-[#c8a55b]/40 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-[#c8a55b]">
          {number}
        </div>
        <h2 className="text-xl font-semibold tracking-wide text-slate-900">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function TextInput({
  label,
  register,
  name,
  error,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-[#c8a55b]/20"
        }`}
      />

      <FieldError error={error} />
    </div>
  );
}

function TextArea({
  label,
  register,
  name,
  error,
  required = false,
  placeholder = "",
  rows = 4,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <textarea
        rows={rows}
        placeholder={placeholder}
        {...register(name)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-[#c8a55b]/20"
        }`}
      />

      <FieldError error={error} />
    </div>
  );
}

function SelectInput({ label, register, name, error, required = false, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <select
        {...register(name)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-slate-300 focus:border-[#c8a55b] focus:ring-[#c8a55b]/20"
        }`}
      >
        {children}
      </select>

      <FieldError error={error} />
    </div>
  );
}

function CheckboxGrid({ title, options, register, name, error }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-800">{title}</p>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm"
          >
            <input
              type="checkbox"
              value={option}
              {...register(name)}
              className="mt-1 h-4 w-4 accent-[#c8a55b]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      <FieldError error={error} />
    </div>
  );
}

export default function AevioraPatientIntakeForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      symptoms: [],
      medicalConditions: [],
      familyHistory: [],
      servicesInterested: [],
      hipaaAcknowledgment: false,
      financialPolicyAcknowledgment: false,
      accuracyAttestation: false,
      interestedInGLP1: false,
    },
  });

  const servicesInterested = watch("servicesInterested") || [];
  const glp1Selected = servicesInterested.includes("GLP-1 Programs");

  const onSubmit = async (data) => {
    console.log("Aeviora Intake Form Data:", data);

    /**
     * Replace this with your API call:
     *
     * await fetch("/api/patient-intake", {
     *   method: "POST",
     *   headers: { "Content-Type": "application/json" },
     *   body: JSON.stringify(data),
     * });
     */

    alert("Patient intake form submitted successfully.");
    reset();
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea] px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-6xl space-y-8"
      >
        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-black shadow-xl">
          <div className="border-b border-[#c8a55b]/40 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#c8a55b] text-5xl font-serif text-[#c8a55b]">
              A
            </div>

            <h1 className="font-serif text-4xl tracking-[0.35em] text-[#c8a55b]">
              Aeviora
            </h1>

            <p className="mt-2 text-sm tracking-[0.25em] text-[#c8a55b]/80">
              LONGEVITY & WELLNESS
            </p>

            <p className="mt-6 text-sm text-slate-300">
              Premium Concierge Patient Intake Form
            </p>
          </div>

          <div className="grid gap-3 px-6 py-5 text-center text-xs text-[#c8a55b] sm:grid-cols-2 lg:grid-cols-4">
            <span>Hormone Optimization</span>
            <span>Medical Weight Loss</span>
            <span>GLP-1 Programs</span>
            <span>Peptide Therapy</span>
            <span>Functional Medicine</span>
            <span>NAD+ Therapy</span>
            <span>IV Therapy</span>
            <span>Concierge Wellness</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#c8a55b]/40 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <p>
            Please complete all required fields marked with{" "}
            <span className="font-semibold text-red-600">*</span>. If a section
            does not apply, write <strong>None</strong> or <strong>N/A</strong>.
          </p>
        </div>

        {/* 1. Patient Information */}
        <Section number="1" title="Patient Information">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Full Legal Name"
              name="fullName"
              register={register}
              error={errors.fullName}
              required
            />

            <TextInput
              label="Preferred Name"
              name="preferredName"
              register={register}
              error={errors.preferredName}
            />

            <TextInput
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              register={register}
              error={errors.dateOfBirth}
              required
            />

            <TextInput
              label="Age"
              name="age"
              type="number"
              register={register}
              error={errors.age}
              required
            />

            <SelectInput
              label="Sex Assigned at Birth"
              name="sexAssignedAtBirth"
              register={register}
              error={errors.sexAssignedAtBirth}
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </SelectInput>

            <SelectInput
              label="Current Gender Identity"
              name="genderIdentity"
              register={register}
              error={errors.genderIdentity}
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to answer">Prefer not to answer</option>
              <option value="Other">Other</option>
            </SelectInput>

            <TextInput
              label="Street Address"
              name="address"
              register={register}
              error={errors.address}
              required
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <TextInput
                label="City"
                name="city"
                register={register}
                error={errors.city}
                required
              />

              <TextInput
                label="State"
                name="state"
                register={register}
                error={errors.state}
                required
              />

              <TextInput
                label="ZIP Code"
                name="zipCode"
                register={register}
                error={errors.zipCode}
                required
              />
            </div>

            <TextInput
              label="Phone"
              name="phone"
              register={register}
              error={errors.phone}
              required
              placeholder="(555) 555-5555"
            />

            <TextInput
              label="Email"
              name="email"
              type="email"
              register={register}
              error={errors.email}
              required
            />

            <TextInput
              label="Occupation"
              name="occupation"
              register={register}
              error={errors.occupation}
            />
          </div>
        </Section>

        {/* 2. Emergency Contact */}
        <Section number="2" title="Emergency Contact">
          <div className="grid gap-5 md:grid-cols-3">
            <TextInput
              label="Emergency Contact Name"
              name="emergencyContactName"
              register={register}
              error={errors.emergencyContactName}
              required
            />

            <TextInput
              label="Relationship"
              name="emergencyRelationship"
              register={register}
              error={errors.emergencyRelationship}
              required
            />

            <TextInput
              label="Emergency Phone"
              name="emergencyPhone"
              register={register}
              error={errors.emergencyPhone}
              required
            />
          </div>
        </Section>

        {/* 3. Care Coordination */}
        <Section number="3" title="Care Coordination">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Primary Care Provider"
              name="primaryCareProvider"
              register={register}
              error={errors.primaryCareProvider}
            />

            <TextInput
              label="Preferred Pharmacy"
              name="preferredPharmacy"
              register={register}
              error={errors.preferredPharmacy}
            />
          </div>
        </Section>

        {/* 4. Health Goals */}
        <Section number="4" title="Health Goals & Priorities">
          <div className="grid gap-5">
            <TextInput
              label="Health Goal 1"
              name="goal1"
              register={register}
              error={errors.goal1}
              required
            />

            <TextInput
              label="Health Goal 2"
              name="goal2"
              register={register}
              error={errors.goal2}
            />

            <TextInput
              label="Health Goal 3"
              name="goal3"
              register={register}
              error={errors.goal3}
            />

            <SelectInput
              label="How would you rate your current health?"
              name="currentHealthRating"
              register={register}
              error={errors.currentHealthRating}
              required
            >
              <option value="">Select</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </SelectInput>

            <TextArea
              label="What concerns you most about your health today?"
              name="mainConcern"
              register={register}
              error={errors.mainConcern}
              required
              rows={4}
            />
          </div>
        </Section>

        {/* 5. Symptoms */}
        <Section number="5" title="Comprehensive Symptom Assessment">
          <CheckboxGrid
            title="Check all symptoms that apply"
            options={symptomOptions}
            register={register}
            name="symptoms"
            error={errors.symptoms}
          />
        </Section>

        {/* 6. Medical History */}
        <Section number="6" title="Past Medical History">
          <div className="space-y-6">
            <CheckboxGrid
              title="Have you ever been diagnosed with any of the following?"
              options={medicalConditionOptions}
              register={register}
              name="medicalConditions"
              error={errors.medicalConditions}
            />

            <TextArea
              label="Other Medical Conditions"
              name="otherMedicalConditions"
              register={register}
              error={errors.otherMedicalConditions}
              placeholder="List any other diagnoses or chronic conditions."
            />

            <SelectInput
              label="Cancer History"
              name="cancerHistory"
              register={register}
              error={errors.cancerHistory}
              required
            >
              <option value="">Select</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </SelectInput>

            {watch("cancerHistory") === "Yes" && (
              <TextInput
                label="Cancer Type / Year / Treatment"
                name="cancerType"
                register={register}
                error={errors.cancerType}
                placeholder="Example: Breast cancer, 2018, surgery/radiation"
              />
            )}

            <TextArea
              label="Surgical History / Hospitalizations"
              name="surgicalHistory"
              register={register}
              error={errors.surgicalHistory}
              placeholder="List procedures, year, reason, and complications if any."
              rows={5}
            />
          </div>
        </Section>

        {/* 7. Medications and Allergies */}
        <Section number="7" title="Medications, Supplements & Allergies">
          <div className="grid gap-5">
            <TextArea
              label="Current Medications"
              name="currentMedications"
              register={register}
              error={errors.currentMedications}
              required
              placeholder="Medication name, dose, frequency, and reason. Write 'None' if not applicable."
              rows={5}
            />

            <TextArea
              label="Supplements / Vitamins / OTC Products"
              name="supplements"
              register={register}
              error={errors.supplements}
              placeholder="Supplement name, dose, and frequency."
              rows={4}
            />

            <TextArea
              label="Medication Allergies"
              name="medicationAllergies"
              register={register}
              error={errors.medicationAllergies}
              required
              placeholder="Write 'None' if not applicable."
              rows={3}
            />

            <TextArea
              label="Food Allergies"
              name="foodAllergies"
              register={register}
              error={errors.foodAllergies}
            />

            <TextArea
              label="Environmental Allergies"
              name="environmentalAllergies"
              register={register}
              error={errors.environmentalAllergies}
            />
          </div>
        </Section>

        {/* 8. Family History */}
        <Section number="8" title="Family History">
          <div className="space-y-6">
            <CheckboxGrid
              title="Check all family history that applies"
              options={familyHistoryOptions}
              register={register}
              name="familyHistory"
              error={errors.familyHistory}
            />

            <TextArea
              label="Family History Notes"
              name="familyHistoryNotes"
              register={register}
              error={errors.familyHistoryNotes}
              placeholder="Include father, mother, siblings, grandparents, age at diagnosis if known."
            />
          </div>
        </Section>

        {/* 9. Lifestyle */}
        <Section number="9" title="Lifestyle Assessment">
          <div className="grid gap-5 md:grid-cols-2">
            <SelectInput
              label="Exercise Days Per Week"
              name="exerciseDays"
              register={register}
              error={errors.exerciseDays}
              required
            >
              <option value="">Select</option>
              <option value="0">0 days</option>
              <option value="1-2">1-2 days</option>
              <option value="3-4">3-4 days</option>
              <option value="5+">5+ days</option>
            </SelectInput>

            <SelectInput
              label="Current Diet Style"
              name="dietStyle"
              register={register}
              error={errors.dietStyle}
              required
            >
              <option value="">Select</option>
              <option value="Standard American">Standard American</option>
              <option value="Mediterranean">Mediterranean</option>
              <option value="Keto">Keto</option>
              <option value="Paleo">Paleo</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Other">Other</option>
            </SelectInput>

            <TextInput
              label="Average Sleep Hours Per Night"
              name="sleepHours"
              type="number"
              register={register}
              error={errors.sleepHours}
              required
            />

            <SelectInput
              label="Sleep Quality"
              name="sleepQuality"
              register={register}
              error={errors.sleepQuality}
              required
            >
              <option value="">Select</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </SelectInput>

            <SelectInput
              label="Stress Level"
              name="stressLevel"
              register={register}
              error={errors.stressLevel}
              required
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </SelectInput>

            <SelectInput
              label="Tobacco Use"
              name="tobaccoUse"
              register={register}
              error={errors.tobaccoUse}
              required
            >
              <option value="">Select</option>
              <option value="Never">Never</option>
              <option value="Former">Former</option>
              <option value="Current">Current</option>
            </SelectInput>

            <SelectInput
              label="Alcohol Use"
              name="alcoholUse"
              register={register}
              error={errors.alcoholUse}
              required
            >
              <option value="">Select</option>
              <option value="None">None</option>
              <option value="Occasional">Occasional</option>
              <option value="Weekly">Weekly</option>
              <option value="Daily">Daily</option>
            </SelectInput>
          </div>
        </Section>

        {/* 10. Services */}
        <Section number="10" title="Services of Interest">
          <CheckboxGrid
            title="Which services are you interested in?"
            options={serviceOptions}
            register={register}
            name="servicesInterested"
            error={errors.servicesInterested}
          />

          {glp1Selected && (
            <div className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                GLP-1 Safety Screening
              </h3>

              <div className="grid gap-5 md:grid-cols-3">
                <SelectInput
                  label="History of pancreatitis?"
                  name="pancreatitisHistory"
                  register={register}
                  error={errors.pancreatitisHistory}
                >
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </SelectInput>

                <SelectInput
                  label="History of gallbladder disease?"
                  name="gallbladderHistory"
                  register={register}
                  error={errors.gallbladderHistory}
                >
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </SelectInput>

                <SelectInput
                  label="Family history of medullary thyroid cancer or MEN2?"
                  name="thyroidCancerHistory"
                  register={register}
                  error={errors.thyroidCancerHistory}
                >
                  <option value="">Select</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </SelectInput>
              </div>
            </div>
          )}
        </Section>

        {/* 11. HIPAA and Financial Policy */}
        <Section number="11" title="Acknowledgments & Policies">
          <div className="space-y-5">
            <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register("hipaaAcknowledgment")}
                className="mt-1 h-4 w-4 accent-[#c8a55b]"
              />
              <span>
              <strong>HIPAA Acknowledgment:</strong> I acknowledge that I have
                    been offered or received Aeviora Wellness Notice of Privacy
                    Practices and understand my protected health information may be used
                    for treatment, payment, and healthcare operations.
              </span>
            </label>
            <FieldError error={errors.hipaaAcknowledgment} />

            <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register("financialPolicyAcknowledgment")}
                className="mt-1 h-4 w-4 accent-[#c8a55b]"
              />
              <span>
                <strong>Financial Policy:</strong> I understand payment is due
                at the time services are rendered unless otherwise arranged in
                writing. I understand wellness services, labs, medications,
                injections, supplements, memberships, and therapies may not be
                covered by insurance.
              </span>
            </label>
            <FieldError error={errors.financialPolicyAcknowledgment} />

            <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                {...register("accuracyAttestation")}
                className="mt-1 h-4 w-4 accent-[#c8a55b]"
              />
              <span>
                <strong>Patient Attestation:</strong> I certify that the
                information provided is accurate and complete to the best of my
                knowledge.
              </span>
            </label>
            <FieldError error={errors.accuracyAttestation} />
          </div>
        </Section>

        {/* 12. Signature */}
        <Section number="12" title="Patient Signature">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Patient Signature / Typed Legal Name"
              name="signature"
              register={register}
              error={errors.signature}
              required
            />

            <TextInput
              label="Date"
              name="signatureDate"
              type="date"
              register={register}
              error={errors.signatureDate}
              required
            />
          </div>
        </Section>

        {/* Submit */}
        <div className="flex flex-col gap-4 rounded-3xl bg-black p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#c8a55b]">
              Ready to submit?
            </p>
            <p className="text-sm text-slate-300">
              Required fields will be checked before submission.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[#c8a55b] px-8 py-3 font-semibold text-black transition hover:bg-[#d8b86d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Intake Form"}
          </button>
        </div>
      </form>
    </div>
  );
}