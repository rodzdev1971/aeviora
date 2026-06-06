import { ShieldCheck } from "lucide-react";

export default function SecurityNotice() {
  return (
    <div className="rounded-3xl border border-aeviora-gold/40 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aeviora-black text-aeviora-gold">
          <ShieldCheck />
        </div>

        <div>
          <h3 className="font-display text-2xl">
            HIPAA-oriented privacy notice
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            This patient portal interface is designed to support secure workflows.
            In production, protected health information should only be stored,
            transmitted, and accessed through encrypted HIPAA-compliant backend
            systems with audit logging, access control, secure authentication,
            and signed Business Associate Agreements with applicable vendors.
          </p>
        </div>
      </div>
    </div>
  );
}