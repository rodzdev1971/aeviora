import { z } from 'zod';

const phoneRegex = /^[0-9+\-() ]{7,20}$/;
const zipRegex = /^[0-9]{5}(?:-[0-9]{4})?$/;

export const intakeSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required."),
    preferredName: z.string().optional(),

    dateOfBirth: z.string().min(1, "Date of birth is required."),

    age: z
      .string()
      .min(1, "Age is required.")
      .refine((val) => {
        const age = Number(val);
        return age > 0 && age < 120;
      }, "Enter a valid age."),

    sexAssignedAtBirth: z.string().min(1, "Please select sex assigned at birth."),
    genderIdentity: z.string().min(1, "Please select current gender identity."),

    address: z.string().min(3, "Address is required."),
    city: z.string().min(2, "City is required."),
    state: z.string().min(2, "State is required."),
    zipCode: z.string().regex(zipRegex, "Enter a valid ZIP code."),
    phone: z.string().regex(phoneRegex, "Enter a valid phone number."),
    email: z.string().email("Enter a valid email address."),
    occupation: z.string().optional(),

    emergencyContactName: z.string().min(2, "Emergency contact name is required."),
    emergencyRelationship: z.string().min(2, "Relationship is required."),
    emergencyPhone: z.string().regex(phoneRegex, "Enter a valid emergency phone number."),

    primaryCareProvider: z.string().optional(),
    preferredPharmacy: z.string().optional(),

    goal1: z.string().min(3, "Please enter at least one health goal."),
    goal2: z.string().optional(),
    goal3: z.string().optional(),

    currentHealthRating: z.string().min(1, "Please rate your current health."),
    mainConcern: z.string().min(5, "Please describe your main concern."),

    symptoms: z.array(z.string()).optional(),
    medicalConditions: z.array(z.string()).optional(),
    otherMedicalConditions: z.string().optional(),

    cancerHistory: z.string().min(1, "Please answer cancer history."),
    cancerType: z.string().optional(),

    surgicalHistory: z.string().optional(),

    currentMedications: z
      .string()
      .min(2, "Please list current medications or write 'None'."),

    supplements: z.string().optional(),

    medicationAllergies: z
      .string()
      .min(2, "Please list medication allergies or write 'None'."),

    foodAllergies: z.string().optional(),
    environmentalAllergies: z.string().optional(),

    familyHistory: z.array(z.string()).optional(),
    familyHistoryNotes: z.string().optional(),

    exerciseDays: z.string().min(1, "Please select exercise frequency."),
    dietStyle: z.string().min(1, "Please select current diet style."),

    sleepHours: z
      .string()
      .min(1, "Average sleep hours is required.")
      .refine((val) => {
        const hours = Number(val);
        return hours >= 0 && hours <= 24;
      }, "Enter valid sleep hours between 0 and 24."),

    sleepQuality: z.string().min(1, "Please select sleep quality."),
    stressLevel: z.string().min(1, "Please select stress level."),
    tobaccoUse: z.string().min(1, "Please answer tobacco use."),
    alcoholUse: z.string().min(1, "Please answer alcohol use."),

    servicesInterested: z
      .array(z.string())
      .min(1, "Please select at least one service of interest."),

    pancreatitisHistory: z.string().optional(),
    gallbladderHistory: z.string().optional(),
    thyroidCancerHistory: z.string().optional(),

    hipaaAcknowledgment: z
      .boolean()
      .refine((val) => val === true, "HIPAA acknowledgment is required."),

    financialPolicyAcknowledgment: z
      .boolean()
      .refine((val) => val === true, "Financial policy acknowledgment is required."),

    accuracyAttestation: z
      .boolean()
      .refine((val) => val === true, "Patient attestation is required."),

    signature: z.string().min(2, "Patient signature is required."),
    signatureDate: z.string().min(1, "Signature date is required."),
  })
  .superRefine((data, ctx) => {
    if (data.cancerHistory === "Yes" && !data.cancerType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancerType"],
        message: "Please enter cancer type, year, and treatment.",
      });
    }

    if (data.servicesInterested?.includes("GLP-1 Programs")) {
      if (!data.pancreatitisHistory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pancreatitisHistory"],
          message: "Please answer pancreatitis history.",
        });
      }

      if (!data.gallbladderHistory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gallbladderHistory"],
          message: "Please answer gallbladder history.",
        });
      }

      if (!data.thyroidCancerHistory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thyroidCancerHistory"],
          message: "Please answer thyroid cancer / MEN2 history.",
        });
      }
    }
  });