import { useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface ForwardingCodesProps {
  voxNumber: string; // raw number like +919876543210
}

const carriers = [
  { name: "Airtel", id: "airtel" },
  { name: "Jio", id: "jio" },
  { name: "Vi", id: "vi" },
  { name: "BSNL", id: "bsnl" },
];

const ForwardingCodes = ({ voxNumber }: ForwardingCodesProps) => {
  const [activeCarrier, setActiveCarrier] = useState("airtel");
  const [copied, setCopied] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const raw = voxNumber.replace(/\D/g, "");
  const num = raw.startsWith("91") ? raw : `91${raw}`;

  const codes: Record<string, { label: string; code: string; recommended?: boolean }[]> = {
    airtel: [
      { label: "When busy or unanswered (Recommended)", code: `**67*+${num}#`, recommended: true },
      { label: "When not answered", code: `**61*+${num}#` },
      { label: "Always forward", code: `**21*+${num}#` },
    ],
    jio: [
      { label: "When busy or unanswered (Recommended)", code: `**67*+${num}#`, recommended: true },
      { label: "When not answered", code: `**61*+${num}#` },
      { label: "Always forward", code: `**21*+${num}#` },
    ],
    vi: [
      { label: "When busy or unanswered (Recommended)", code: `**67*+${num}#`, recommended: true },
      { label: "When not answered", code: `**61*+${num}#` },
      { label: "Always forward", code: `**21*+${num}#` },
    ],
    bsnl: [
      { label: "When busy or unanswered (Recommended)", code: `**67*+${num}#`, recommended: true },
      { label: "When not answered", code: `**61*+${num}#` },
    ],
  };

  const cancelCodes = [
    { label: "Cancel busy forward", code: "##67#" },
    { label: "Cancel no-answer forward", code: "##61#" },
    { label: "Cancel always forward", code: "##21#" },
  ];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Carrier tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {carriers.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCarrier(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCarrier === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Codes for active carrier */}
      <div className="space-y-2">
        {codes[activeCarrier]?.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-lg px-4 py-3 ${
              item.recommended
                ? "bg-primary/10 border border-primary/30"
                : "bg-secondary"
            }`}
          >
            <div>
              <p className={`text-xs ${item.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {item.label}
              </p>
              <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{item.code}</p>
            </div>
            <button
              onClick={() => handleCopy(item.code, `${activeCarrier}-${i}`)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
            >
              {copied === `${activeCarrier}-${i}` ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Cancel forwarding */}
      <button
        onClick={() => setShowCancel(!showCancel)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        To cancel forwarding <ChevronDown className={`w-3 h-3 transition-transform ${showCancel ? "rotate-180" : ""}`} />
      </button>
      {showCancel && (
        <div className="space-y-1.5">
          {cancelCodes.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
              <div>
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
                <p className="text-xs font-mono text-foreground">{c.code}</p>
              </div>
              <button onClick={() => handleCopy(c.code, `cancel-${i}`)} className="p-1">
                {copied === `cancel-${i}` ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForwardingCodes;
