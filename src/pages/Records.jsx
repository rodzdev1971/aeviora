import { Download, FileText, Lock } from "lucide-react";

const records = [
  {
    name: "Initial Wellness Consultation",
    type: "Clinical Note",
    date: "May 20, 2026",
  },
  {
    name: "Baseline Longevity Assessment",
    type: "Assessment",
    date: "May 21, 2026",
  },
  {
    name: "Lab Review Summary",
    type: "Lab Summary",
    date: "May 25, 2026",
  },
];

export default function Records() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-aeviora-gold">
          Secure Records
        </p>
        <h1 className="mt-2 font-display text-4xl">Patient Health Records</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          View physician-approved summaries and wellness documents. Production
          document access should require secure authorization and audit logging.
        </p>
      </div>

      <div className="grid gap-4">
        {records.map((record) => (
          <div
            key={record.name}
            className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
                <FileText />
              </div>

              <div>
                <h3 className="font-display text-xl">{record.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {record.type} • {record.date}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Lock size={14} />
                  Access should be encrypted and logged.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-aeviora-gold px-4 py-3 text-sm font-semibold text-aeviora-black hover:bg-aeviora-gold">
              <Download size={17} />
              View Record
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}