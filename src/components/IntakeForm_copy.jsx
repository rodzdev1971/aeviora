import React, {useState} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { intakeSchema } from "../util/IntakeSchema";
import {Section, TextInput, SelectInput} from './FormComponents';

export default function AevioraPatientIntakeForm() {
  const [currentStep, setCurrentStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
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
    },
  });

  const steps = [
    {
      title: "Patient Information",
      fields: [
        "fullName",
        "dateOfBirth",
        "age",
        "sexAssignedAtBirth",
        "genderIdentity",
        "address",
        "city",
        "state",
        "zipCode",
        "phone",
        "email",
      ],
    },
    {
      title: "Emergency Contact",
      fields: [
        "emergencyContactName",
        "emergencyRelationship",
        "emergencyPhone",
      ],
    },
    {
      title: "Care Coordination",
      fields: [
        "primaryCareProvider",
        "preferredPharmacy",
      ],
    },
    {
      title: "Health Goals",
      fields: [
        "goal1",
        "currentHealthRating",
        "mainConcern",
      ],
    },
    {
      title: "Symptoms",
      fields: ["symptoms"],
    },
    {
      title: "Medical History",
      fields: [
        "medicalConditions",
        "cancerHistory",
        "currentMedications",
        "medicationAllergies",
      ],
    },
    {
      title: "Family History",
      fields: ["familyHistory"],
    },
    {
      title: "Lifestyle",
      fields: [
        "exerciseDays",
        "dietStyle",
        "sleepHours",
        "sleepQuality",
        "stressLevel",
        "tobaccoUse",
        "alcoholUse",
      ],
    },
    {
      title: "Services of Interest",
      fields: ["servicesInterested"],
    },
    {
      title: "Acknowledgments",
      fields: [
        "hipaaAcknowledgment",
        "financialPolicyAcknowledgment",
        "accuracyAttestation",
      ],
    },
    {
      title: "Signature",
      fields: [
        "signature",
        "signatureDate",
      ],
    },
  ];

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const nextStep = async () => {
    const currentFields = steps[currentStep].fields;

    const isStepValid = await trigger(currentFields, {
      shouldFocus: true,
    });

    if (!isStepValid) return;

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const onSubmit = async (data) => {
    console.log("Aeviora Wellness Intake Form Data:", data);

    alert("Patient intake form submitted successfully.");
    reset();
    setCurrentStep(0);
  };

  const servicesInterested = watch("servicesInterested") || [];
  const glp1Selected = servicesInterested.includes("GLP-1 Programs");

  return (
    <div className="min-h-screen bg-[#f7f3ea] px-4 py-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-6xl space-y-8"
      >
        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-black shadow-xl">
          <div className="border-b border-[#c8a55b]/40 px-6 py-8 text-center">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-[#c8a55b] text-5xl font-serif text-[#c8a55b]">
              A
            </div>

            <h1 className="font-serif text-2xl tracking-[0.2em] text-[#c8a55b]">
              AEVIORA
            </h1>

            <p className="mt-2 text-sm tracking-[0.25em] text-[#c8a55b]/80">
              WELLNESS
            </p>

            <p className="mt-6 text-sm text-slate-300">
              Premium Concierge Patient Intake Form
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="rounded-3xl border border-[#c8a55b]/40 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-700">
            <span>
              Section {currentStep + 1} of {steps.length}
            </span>
            <span className="font-semibold text-slate-900">
              {steps[currentStep].title}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#c8a55b] transition-all"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step 1 */}
        {currentStep === 0 && (
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
        )}

        {/* Step 2 */}
        {currentStep === 1 && (
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
        )}

        {/* Step 3 */}
        {currentStep === 2 && (
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
        )}

        {/* Step 4 */}
        {currentStep === 3 && (
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
                label="Current Health Rating"
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
                label="Main Health Concern"
                name="mainConcern"
                register={register}
                error={errors.mainConcern}
                required
                rows={4}
              />
            </div>
          </Section>
        )}

        {/* Step 5 */}
        {currentStep === 4 && (
          <Section number="5" title="Comprehensive Symptom Assessment">
            <CheckboxGrid
              title="Check all symptoms that apply"
              options={symptomOptions}
              register={register}
              name="symptoms"
              error={errors.symptoms}
            />
          </Section>
        )}

        {/* Step 6 */}
        {currentStep === 5 && (
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
                />
              )}

              <TextArea
                label="Current Medications"
                name="currentMedications"
                register={register}
                error={errors.currentMedications}
                required
                placeholder="List medications or write None."
                rows={5}
              />

              <TextArea
                label="Medication Allergies"
                name="medicationAllergies"
                register={register}
                error={errors.medicationAllergies}
                required
                placeholder="List allergies or write None."
                rows={3}
              />
            </div>
          </Section>
        )}

        {/* Step 7 */}
        {currentStep === 6 && (
          <Section number="7" title="Family History">
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
              />
            </div>
          </Section>
        )}

        {/* Step 8 */}
        {currentStep === 7 && (
          <Section number="8" title="Lifestyle Assessment">
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
                label="Average Sleep Hours"
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
        )}

        {/* Step 9 */}
        {currentStep === 8 && (
          <Section number="9" title="Services of Interest">
            <CheckboxGrid
              title="Which services are you interested in?"
              options={serviceOptions}
              register={register}
              name="servicesInterested"
              error={errors.servicesInterested}
            />

            {glp1Selected && (
              <div className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5">
                <h3 className="mb-4 text-lg font-semibold">
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
        )}

        {/* Step 10 */}
        {currentStep === 9 && (
          <Section number="10" title="Acknowledgments & Policies">
            <div className="space-y-5">
              <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  {...register("hipaaAcknowledgment")}
                  className="mt-1 h-4 w-4 accent-[#c8a55b]"
                />
                <span>
                  <strong>HIPAA Acknowledgment:</strong> I acknowledge that I
                  have been offered or received Aeviora Wellness Notice of
                  Privacy Practices.
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
                  writing.
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
        )}

        {/* Step 11 */}
        {currentStep === 10 && (
          <Section number="11" title="Patient Signature">
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
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col gap-4 rounded-3xl bg-black p-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={isFirstStep}
            className="rounded-2xl border border-[#c8a55b] px-8 py-3 font-semibold text-[#c8a55b] transition hover:bg-[#c8a55b]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <div className="text-center text-sm text-slate-300">
            Step {currentStep + 1} of {steps.length}
          </div>

          {!isLastStep ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-2xl bg-[#c8a55b] px-8 py-3 font-semibold text-black transition hover:bg-[#d8b86d]"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-[#c8a55b] px-8 py-3 font-semibold text-black transition hover:bg-[#d8b86d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Intake Form"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}