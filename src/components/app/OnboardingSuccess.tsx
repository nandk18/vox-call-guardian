import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatIndianPhone } from "@/utils/phoneUtils";
import { Loader2 } from "lucide-react";

interface OnboardingSuccessProps {
  agentId: string;
  voxNumber: string;
}

const OnboardingSuccess = ({ agentId, voxNumber }: OnboardingSuccessProps) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleGoToInbox = async () => {
    setSaving(true);
    try {
      await supabase
        .from("agents")
        .update({ onboarding_complete: true, status: "active" })
        .eq("id", agentId);
      navigate("/app/inbox");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="text-6xl">🎉</div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">I'm ready for my first call!</h1>
          <p className="text-muted-foreground mt-2">Here's what will happen when a customer calls your Vox number:</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4">
          {[
            "A customer calls your Vox number",
            "I pick up instantly for you",
            "You get a WhatsApp + SMS summary immediately after",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-foreground pt-1">{text}</p>
            </div>
          ))}
        </div>

        {/* SMS mockup */}
        <div className="rounded-2xl border border-border bg-card p-4 max-w-[340px] mx-auto">
          <p className="text-[10px] text-muted-foreground mb-2">Just now</p>
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-left">
            <p className="text-xs font-semibold text-foreground">New call from +91 98765 43210</p>
            <p className="text-xs text-muted-foreground mt-1">Summary: Customer enquired about appointment booking</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-6">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">📵 No credit card</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">📅 14 days free</span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoToInbox}
            disabled={saving}
            className="w-full h-14 rounded-full text-lg font-semibold"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Go to my Inbox →"}
          </Button>
          <button
            onClick={() => navigate("/app/settings")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Set up call forwarding →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
