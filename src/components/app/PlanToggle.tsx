import { useState } from "react";

export const RAZORPAY_LINKS = {
  monthly: "https://rzp.io/rzp/gX8IPIVJ",
  yearly: "https://rzp.io/rzp/rRjmMJ09",
};

export type BillingCycle = "monthly" | "yearly";

interface Props {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}

export const PlanToggle = ({ value, onChange }: Props) => {
  const base =
    "flex-1 relative px-3 py-2 rounded-full text-sm font-semibold transition-colors";
  const active = "text-[#0D0F14]";
  const inactive = "text-muted-foreground hover:text-foreground";
  return (
    <div className="flex gap-1 p-1 rounded-full bg-secondary border border-border">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        style={value === "monthly" ? { backgroundColor: "#00E5A0" } : undefined}
        className={`${base} ${value === "monthly" ? active : inactive}`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        style={value === "yearly" ? { backgroundColor: "#00E5A0" } : undefined}
        className={`${base} ${value === "yearly" ? active : inactive}`}
      >
        Yearly 🔥 Save 40%
        {value === "yearly" && (
          <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0D0F14] text-[#00E5A0] border border-[#00E5A0]">
            BEST VALUE
          </span>
        )}
      </button>
    </div>
  );
};

export const PriceDisplay = ({ cycle }: { cycle: BillingCycle }) => {
  if (cycle === "monthly") {
    return (
      <div className="text-center">
        <p className="text-3xl font-black text-foreground">
          ₹999<span className="text-base font-medium text-muted-foreground">/month</span>
        </p>
      </div>
    );
  }
  return (
    <div className="text-center space-y-1">
      <p className="text-3xl font-black text-foreground">
        ₹599<span className="text-base font-medium text-muted-foreground">/month</span>
      </p>
      <p className="text-xs text-muted-foreground">₹7,148 billed yearly</p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-red-400 line-through">₹11,988/year</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5A0]/15 text-[#00E5A0]">
          Save ₹4,840/year
        </span>
      </div>
    </div>
  );
};

export const SubscribeButton = ({ cycle }: { cycle: BillingCycle }) => {
  const label =
    cycle === "monthly" ? "Subscribe — ₹999/month" : "Subscribe — ₹7,148/year";
  return (
    <button
      onClick={() => window.open(RAZORPAY_LINKS[cycle], "_blank")}
      className="w-full h-12 rounded-full font-bold text-base"
      style={{ backgroundColor: "#00E5A0", color: "#0D0F14" }}
    >
      {label}
    </button>
  );
};

export const useBillingCycle = (initial: BillingCycle = "yearly") =>
  useState<BillingCycle>(initial);
