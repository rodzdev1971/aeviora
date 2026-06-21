import { CheckCircle2 } from "lucide-react";
export default function TrustPoint({ label }) {
    return (
      <div className="flex items-center gap-2 text-sm text-aeviora-slate">
        <CheckCircle2 size={17} className="text-aeviora-gold" />
        {label}
      </div>
    );
}