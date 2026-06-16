import { Stethoscope } from "lucide-react"
export default function Services(){
    return(
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-7xl">
            <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
              Wellness Services
            </p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Designed for a modern longevity practice.
            </h2>
            <p className="mt-5 text-gray-600">
              The patient portal can support multiple service lines while keeping
              the patient experience consistent, elegant, and easy to navigate.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Hormone Optimization",
              "Medical Weight Loss",
              "GLP-1 Programs",
              "Peptide Therapy",
              "Functional Medicine",
              "NAD+ and IV Therapy",
              "Longevity Assessment",
              "Metabolic Health",
              "Preventive Wellness",
            ].map((service) => (
              <div
                key={service}
                className="group rounded-3xl border border-gray-200 bg-aeviora-cream p-6 transition hover:-translate-y-1 hover:border-aeviora-gold hover:shadow-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
                  <Stethoscope />
                </div>
                <h3 className="font-display text-2xl">{service}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Support documentation, intake, care summaries, and secure
                  patient communication for this service category.
                </p>
              </div>
            ))}
          </div>
        </div>
    )
}