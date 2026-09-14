import React, { useEffect, useRef, useState } from "react";

const sideEffects = [
  "Nausea",
  "Vomiting",
  "Diarrhea",
  "Constipation",
  "Abdominal discomfort",
  "Bloating",
  "Acid reflux or indigestion",
  "Decreased appetite",
  "Fatigue",
  "Headache",
  "Dizziness",
  "Injection-site reaction",
];

const thyroidAttestations = [
  "I do not have a personal history of medullary thyroid carcinoma.",
  "I do not have a family history of medullary thyroid carcinoma.",
  "I have not been diagnosed with Multiple Endocrine Neoplasia syndrome type 2.",
  "I will report neck mass, difficulty swallowing, shortness of breath, or persistent hoarseness.",
];

const compoundedAcknowledgments = [
  "I understand compounded medications are not FDA-approved and are not reviewed by FDA for safety, effectiveness, or quality before use.",
  "I understand I must follow the exact dose instructions provided by my provider and pharmacy.",
  "I understand dosing errors may cause serious side effects, including severe nausea, vomiting, dehydration, abdominal pain, constipation, and hospitalization.",
  "I agree not to use research-only, not-for-human-consumption, online, non-pharmacy, or patient-supplied GLP-1 products.",
  "I understand I must never share my medication, needles, syringes, pens, or vials with another person.",
];

function TextInput({ label, name, value, onChange, type = "text", required = true }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function Section({ number, title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
          {number}
        </div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}

function InitialRow({ statement, value, onChange, required = true }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_1fr]">
      <label>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Patient initial
        </span>
        <input
          value={value}
          onChange={onChange}
          maxLength={4}
          required={required}
          placeholder="Initial"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold uppercase outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <p className="self-center text-sm text-slate-700">{statement}</p>
    </div>
  );
}

function SignaturePad({ label, value, onChange, required = true }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = 180;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, []);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX =
      event.touches && event.touches.length > 0
        ? event.touches[0].clientX
        : event.clientX;

    const clientY =
      event.touches && event.touches.length > 0
        ? event.touches[0].clientY
        : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const currentPoint = getPoint(event);
    const lastPoint = lastPointRef.current;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
    onChange(canvas.toDataURL("image/png"));
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="h-[180px] w-full cursor-crosshair rounded-xl border border-slate-300 bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {!value && (
        <p className="mt-2 text-xs text-slate-500">
          Patient may sign using mouse, trackpad, finger, or stylus.
        </p>
      )}
    </div>
  );
}

export default function GLP1ConsentForm({ onSubmit }) {
  const [form, setForm] = useState({
    patientName: "",
    dateOfBirth: "",
    medicationPrescribed: "",
    doseRouteFrequency: "",
    pharmacySource: "",
    prescribingProvider: "",
    dateReviewed: "",

    reviewedSideEffects: [],
    thyroidInitials: thyroidAttestations.map(() => ""),
    compoundedApplicable: false,
    compoundedInitials: compoundedAcknowledgments.map(() => ""),

    responsibilitiesAcknowledged: false,
    questionsAcknowledged: false,

    patientPrintedName: "",
    patientSignature: "",
    patientSignatureDate: "",
    providerPrintedName: "",
    providerSignature: "",
    witnessSignature: "",
    witnessSignatureDate: "",
  });

  const [errors, setErrors] = useState([]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleSideEffect = (effect) => {
    setForm((prev) => {
      const exists = prev.reviewedSideEffects.includes(effect);

      return {
        ...prev,
        reviewedSideEffects: exists
          ? prev.reviewedSideEffects.filter((item) => item !== effect)
          : [...prev.reviewedSideEffects, effect],
      };
    });
  };

  const updateThyroidInitial = (index, value) => {
    const next = [...form.thyroidInitials];
    next[index] = value.toUpperCase();

    setForm((prev) => ({
      ...prev,
      thyroidInitials: next,
    }));
  };

  const updateCompoundedInitial = (index, value) => {
    const next = [...form.compoundedInitials];
    next[index] = value.toUpperCase();

    setForm((prev) => ({
      ...prev,
      compoundedInitials: next,
    }));
  };

  const validateForm = () => {
    const nextErrors = [];

    const requiredFields = [
      ["patientName", "Patient name is required."],
      ["dateOfBirth", "Date of birth is required."],
      ["medicationPrescribed", "Medication prescribed is required."],
      ["doseRouteFrequency", "Dose / route / frequency is required."],
      ["pharmacySource", "Pharmacy / source is required."],
      ["prescribingProvider", "Prescribing provider is required."],
      ["dateReviewed", "Date reviewed is required."],
      ["patientPrintedName", "Patient printed name is required."],
      ["patientSignatureDate", "Patient signature date is required."],
    ];

    requiredFields.forEach(([field, message]) => {
      if (!form[field]) nextErrors.push(message);
    });

    form.thyroidInitials.forEach((initial, index) => {
      if (!initial) {
        nextErrors.push(`Initial required for thyroid / MEN 2 statement ${index + 1}.`);
      }
    });

    if (form.compoundedApplicable) {
      form.compoundedInitials.forEach((initial, index) => {
        if (!initial) {
          nextErrors.push(
            `Initial required for compounded medication acknowledgment ${index + 1}.`
          );
        }
      });
    }

    if (!form.responsibilitiesAcknowledged) {
      nextErrors.push("Patient responsibilities acknowledgment is required.");
    }

    if (!form.questionsAcknowledged) {
      nextErrors.push("Questions and voluntary consent acknowledgment is required.");
    }

    if (!form.patientSignature) {
      nextErrors.push("Patient signature is required.");
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload = {
      formType: "GLP1_GIP_GLP1_CONSENT",
      clinic: "Aeviora Wellness",
      completedAt: new Date().toISOString(),
      patient: {
        name: form.patientName,
        dateOfBirth: form.dateOfBirth,
      },
      medication: {
        prescribed: form.medicationPrescribed,
        doseRouteFrequency: form.doseRouteFrequency,
        pharmacySource: form.pharmacySource,
        prescribingProvider: form.prescribingProvider,
        dateReviewed: form.dateReviewed,
      },
      reviewedSideEffects: form.reviewedSideEffects,
      thyroidAttestations: thyroidAttestations.map((statement, index) => ({
        statement,
        initial: form.thyroidInitials[index],
      })),
      compoundedMedication: {
        applicable: form.compoundedApplicable,
        acknowledgments: compoundedAcknowledgments.map((statement, index) => ({
          statement,
          initial: form.compoundedInitials[index],
        })),
      },
      acknowledgments: {
        responsibilitiesAcknowledged: form.responsibilitiesAcknowledged,
        questionsAcknowledged: form.questionsAcknowledged,
      },
      signatures: {
        patientPrintedName: form.patientPrintedName,
        patientSignature: form.patientSignature,
        patientSignatureDate: form.patientSignatureDate,
        providerPrintedName: form.providerPrintedName,
        providerSignature: form.providerSignature,
        witnessSignature: form.witnessSignature,
        witnessSignatureDate: form.witnessSignatureDate,
      },
    };

    console.log("GLP-1 Consent Payload:", payload);

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-lg">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Aeviora Wellness
          </p>
          <h1 className="text-3xl font-bold">
            GLP-1 / GIP-GLP-1 Patient Informed Consent
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            This electronic consent form documents patient review, initials,
            acknowledgments, and signature before initiation of therapy,
            medication dispensing, or administration.
          </p>
        </header>

        {errors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="mb-2 font-semibold">Please complete the following:</p>
            <ul className="list-inside list-disc space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <Section number="1" title="Patient and Medication Information">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Patient name"
              name="patientName"
              value={form.patientName}
              onChange={updateField}
            />
            <TextInput
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={updateField}
            />
            <TextInput
              label="Medication prescribed"
              name="medicationPrescribed"
              value={form.medicationPrescribed}
              onChange={updateField}
            />
            <TextInput
              label="Dose / route / frequency"
              name="doseRouteFrequency"
              value={form.doseRouteFrequency}
              onChange={updateField}
            />
            <TextInput
              label="Pharmacy / source"
              name="pharmacySource"
              value={form.pharmacySource}
              onChange={updateField}
            />
            <TextInput
              label="Prescribing provider"
              name="prescribingProvider"
              value={form.prescribingProvider}
              onChange={updateField}
            />
            <TextInput
              label="Date reviewed"
              name="dateReviewed"
              type="date"
              value={form.dateReviewed}
              onChange={updateField}
            />
          </div>
        </Section>

        <Section number="2" title="Consent to Treatment">
          <p>
            I voluntarily consent to treatment with a GLP-1 receptor agonist,
            GIP/GLP-1 receptor agonist, or related medication prescribed by my
            healthcare provider. I understand that the medication is intended to
            support medical weight management, metabolic health, diabetes-related
            care, or another medically appropriate indication as determined by my
            provider.
          </p>

          <p>
            I understand this treatment should be used with nutrition changes,
            physical activity, hydration, adequate protein intake, behavioral
            support, and medical monitoring. I understand that treatment does not
            guarantee weight loss or improvement in any medical condition.
          </p>
        </Section>

        <Section number="3" title="Expected Benefits">
          <ul className="list-inside list-disc space-y-2">
            <li>Reduced appetite, cravings, or food noise.</li>
            <li>
              Weight loss or improved weight maintenance when used with lifestyle
              therapy.
            </li>
            <li>
              Improvement in blood sugar, insulin resistance, cholesterol, blood
              pressure, sleep apnea-related weight risk, or other metabolic
              markers when clinically achieved.
            </li>
            <li>
              Possible reduction in obesity-related health risk when weight loss
              is achieved and maintained.
            </li>
          </ul>
        </Section>

        <Section number="4" title="Common Side Effects Reviewed">
          <p>
            Please check each common side effect reviewed with the patient.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sideEffects.map((effect) => (
              <label
                key={effect}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.reviewedSideEffects.includes(effect)}
                  onChange={() => toggleSideEffect(effect)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>{effect}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section number="5" title="Serious Risks and Warnings">
          <ul className="list-inside list-disc space-y-2">
            <li>
              Pancreatitis, which may present as severe or persistent abdominal
              pain with or without vomiting.
            </li>
            <li>Gallbladder disease, gallstones, or gallbladder inflammation.</li>
            <li>
              Severe nausea, vomiting, diarrhea, constipation, dehydration, or
              poor oral intake.
            </li>
            <li>Acute kidney injury, especially when dehydration occurs.</li>
            <li>
              Low blood sugar, especially if I use insulin or sulfonylurea
              medications.
            </li>
            <li>
              Worsening diabetic retinopathy in some patients with diabetes.
            </li>
            <li>
              Severe allergic reaction, including anaphylaxis or angioedema.
            </li>
            <li>
              Delayed stomach emptying, which may affect absorption of oral
              medications and may increase aspiration risk during anesthesia or
              deep sedation.
            </li>
            <li>
              Possible thyroid tumor risk based on animal studies; the relevance
              to humans is not known.
            </li>
          </ul>
        </Section>

        <Section number="6" title="Thyroid Cancer / MEN 2 Attestation">
          <div className="space-y-3">
            {thyroidAttestations.map((statement, index) => (
              <InitialRow
                key={statement}
                statement={statement}
                value={form.thyroidInitials[index]}
                onChange={(event) =>
                  updateThyroidInitial(index, event.target.value)
                }
              />
            ))}
          </div>
        </Section>

        <Section number="7" title="Pregnancy and Reproductive Safety">
          <p>
            I understand GLP-1 / GIP-GLP-1 medications should generally not be
            used during pregnancy. I agree to notify my provider immediately if I
            become pregnant, plan pregnancy, or begin breastfeeding.
          </p>
          <p>
            If I use oral contraception, I understand certain incretin therapies
            may require additional or non-oral contraception during initiation or
            dose escalation as directed by my provider.
          </p>
        </Section>

        <Section number="8" title="Surgery, Procedures, and Anesthesia">
          <p>
            I agree to tell all surgeons, dentists, anesthesiologists, and
            procedural clinicians that I am taking a GLP-1 / GIP-GLP-1 medication
            before any procedure requiring anesthesia or sedation.
          </p>
          <p>
            I understand my procedural team may instruct me to hold medication
            before a procedure.
          </p>
        </Section>

        <Section number="9" title="When to Stop Medication and Seek Care">
          <ul className="list-inside list-disc space-y-2">
            <li>
              Severe or persistent abdominal pain, especially pain that radiates
              to the back.
            </li>
            <li>
              Persistent vomiting, inability to keep fluids down, fainting,
              confusion, or very low urine output.
            </li>
            <li>
              Severe constipation, inability to pass stool or gas, severe
              bloating, or severe abdominal swelling.
            </li>
            <li>Yellowing of skin or eyes.</li>
            <li>
              Chest pain, shortness of breath, swelling of face/tongue/throat, or
              severe rash.
            </li>
            <li>
              Symptoms of low blood sugar: shakiness, sweating, confusion,
              weakness, or loss of consciousness.
            </li>
            <li>Pregnancy or suspected pregnancy.</li>
          </ul>
        </Section>

        <Section number="10" title="Alternatives to Treatment">
          <p>
            Alternatives may include nutrition and lifestyle therapy without
            medication, behavioral weight management, other FDA-approved
            weight-loss medications, bariatric surgery evaluation, treatment of
            contributing medical conditions, or no treatment.
          </p>
        </Section>

        <Section number="11" title="No Guarantee and Treatment Discontinuation">
          <p>
            I understand there is no guarantee of weight loss, metabolic
            improvement, symptom improvement, or prevention of disease. I
            understand weight regain may occur after stopping medication.
          </p>
          <p>
            My provider may discontinue or change therapy if risks outweigh
            benefits, if I do not complete required monitoring, or if the
            medication is not clinically appropriate for me.
          </p>
        </Section>

        <Section number="12" title="Compounded Medication Acknowledgment">
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <input
              type="checkbox"
              name="compoundedApplicable"
              checked={form.compoundedApplicable}
              onChange={updateField}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="text-sm text-amber-900">
              This section applies because the patient may receive a compounded
              GLP-1 / GIP-GLP-1 medication.
            </span>
          </label>

          {form.compoundedApplicable && (
            <div className="space-y-3">
              {compoundedAcknowledgments.map((statement, index) => (
                <InitialRow
                  key={statement}
                  statement={statement}
                  value={form.compoundedInitials[index]}
                  onChange={(event) =>
                    updateCompoundedInitial(index, event.target.value)
                  }
                />
              ))}
            </div>
          )}
        </Section>

        <Section number="13" title="Patient Responsibilities">
          <ul className="list-inside list-disc space-y-2">
            <li>
              Use medication exactly as prescribed; do not adjust dose unless
              instructed by my provider.
            </li>
            <li>Attend follow-up visits and complete labs when ordered.</li>
            <li>
              Report side effects, medication changes, pregnancy, surgery,
              emergency care, or hospitalization promptly.
            </li>
            <li>
              Maintain hydration, protein intake, nutrition plan, activity plan,
              and bowel regimen as advised.
            </li>
            <li>
              Store medication and injection supplies safely and dispose of
              sharps appropriately.
            </li>
          </ul>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="responsibilitiesAcknowledged"
              checked={form.responsibilitiesAcknowledged}
              onChange={updateField}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              I acknowledge and agree to follow the patient responsibilities
              listed above.
            </span>
          </label>
        </Section>

        <Section number="14" title="Questions and Voluntary Consent">
          <p>
            I confirm that I have had the opportunity to ask questions. My
            questions were answered to my satisfaction. I understand the risks,
            benefits, and alternatives. I voluntarily consent to GLP-1 /
            GIP-GLP-1 therapy as prescribed by my provider.
          </p>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="questionsAcknowledged"
              checked={form.questionsAcknowledged}
              onChange={updateField}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              I confirm that I understand this consent and voluntarily agree to
              proceed.
            </span>
          </label>
        </Section>

        <Section number="15" title="Patient Acknowledgments and Signatures">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Signature requirement
            </p>
            <p className="mt-1">
              Signed informed consent should be completed before initiation of
              therapy, medication dispensing, or administration. Retain this
              page in the patient record.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Patient printed name"
              name="patientPrintedName"
              value={form.patientPrintedName}
              onChange={updateField}
            />
            <TextInput
              label="Date"
              name="patientSignatureDate"
              type="date"
              value={form.patientSignatureDate}
              onChange={updateField}
            />
          </div>

          <SignaturePad
            label="Patient signature"
            value={form.patientSignature}
            onChange={(signature) =>
              setForm((prev) => ({
                ...prev,
                patientSignature: signature,
              }))
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Provider printed name"
              name="providerPrintedName"
              value={form.providerPrintedName}
              onChange={updateField}
              required={false}
            />
            <TextInput
              label="Witness / staff date"
              name="witnessSignatureDate"
              type="date"
              value={form.witnessSignatureDate}
              onChange={updateField}
              required={false}
            />
          </div>

          <SignaturePad
            label="Provider signature"
            value={form.providerSignature}
            required={false}
            onChange={(signature) =>
              setForm((prev) => ({
                ...prev,
                providerSignature: signature,
              }))
            }
          />

          <SignaturePad
            label="Witness / staff signature"
            value={form.witnessSignature}
            required={false}
            onChange={(signature) =>
              setForm((prev) => ({
                ...prev,
                witnessSignature: signature,
              }))
            }
          />
        </Section>

        <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            This form stores data in React state only. Submit the payload to your
            secure backend. Do not store PHI in localStorage or sessionStorage.
          </p>

          <button
            type="submit"
            className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Submit Signed Consent
          </button>
        </div>
      </form>
    </main>
  );
}