import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

const TestPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: agent } = useQuery({
    queryKey: ["test-panel-agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, status, phone_number, trial_ends_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const simulateCall = async (type: "answered" | "missed" | "spam") => {
    if (!agent?.id) { toast.error("No agent found"); return; }

    const calls: Record<string, any> = {
      answered: {
        agent_id: agent.id,
        caller_number: "+919876543210",
        duration_secs: 127,
        outcome: "answered",
        caller_name: "Rahul Sharma",
        caller_need: "AC servicing appointment",
        summary: "Customer Rahul Sharma called asking for AC servicing. Preferred time is Saturday morning between 10am-12pm. He has a 1.5 ton Voltas AC. Callback number same as caller.",
        transcript: [
          { speaker: "vox", text: "Thank you for calling. How can I help you today?", timestamp: "0:00" },
          { speaker: "caller", text: "Hi, I need to get my AC serviced. Is Saturday morning available?", timestamp: "0:04" },
          { speaker: "vox", text: "Of course! Saturday morning between 10am and 12pm works. May I have your name?", timestamp: "0:08" },
          { speaker: "caller", text: "Rahul Sharma. My number is this one only.", timestamp: "0:14" },
          { speaker: "vox", text: "Perfect Rahul. I have noted your appointment request for Saturday 10am-12pm. The team will confirm shortly. Thank you!", timestamp: "0:19" },
        ],
        is_read: false,
        created_at: new Date().toISOString(),
      },
      missed: {
        agent_id: agent.id,
        caller_number: "+918765432109",
        duration_secs: 0,
        outcome: "missed",
        caller_name: null,
        caller_need: null,
        summary: "Missed call — no conversation recorded",
        transcript: [],
        is_read: false,
        created_at: new Date().toISOString(),
      },
      spam: {
        agent_id: agent.id,
        caller_number: "+910000000000",
        duration_secs: 0,
        outcome: "spam",
        caller_name: null,
        caller_need: null,
        summary: "Detected as spam — call blocked",
        transcript: [],
        is_read: false,
        created_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from("calls").insert(calls[type]);
    if (error) toast.error("Failed: " + error.message);
    else toast.success(`Simulated ${type} call`);
    queryClient.invalidateQueries({ queryKey: ["inbox-calls"] });
    queryClient.invalidateQueries({ queryKey: ["unread-calls"] });
  };

  const updateTrial = async (interval: string) => {
    if (!agent?.id) return;
    const map: Record<string, Date> = {
      "2days": new Date(Date.now() + 2 * 86400000),
      expired: new Date(Date.now() - 86400000),
      reset: new Date(Date.now() + 14 * 86400000),
    };
    await supabase.from("agents").update({ trial_ends_at: map[interval].toISOString() }).eq("id", agent.id);
    toast.success("Trial updated");
    queryClient.invalidateQueries({ queryKey: ["agent"] });
    queryClient.invalidateQueries({ queryKey: ["settings-agent"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-agent"] });
    queryClient.invalidateQueries({ queryKey: ["test-panel-agent"] });
  };

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-lg text-xs font-semibold backdrop-blur-sm"
      >
        🧪 Test Panel {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 bg-card border border-border rounded-xl p-4 space-y-3 shadow-xl text-xs max-h-[70vh] overflow-y-auto">
          <p className="font-bold text-foreground text-sm">🧪 Test Panel</p>

          <div className="space-y-1 text-muted-foreground">
            <p>User: <span className="text-foreground font-mono">{user?.id?.slice(0, 8)}...</span></p>
            <p>Agent: <span className="text-foreground font-mono">{agent?.id?.slice(0, 8) || "none"}...</span></p>
            <p>Status: <span className="text-foreground">{agent?.status || "unknown"}</span></p>
            <p>Phone: <span className="text-foreground">{agent?.phone_number ? "connected" : "not set"}</span></p>
            <p>Trial: <span className="text-foreground">{agent?.trial_ends_at ? new Date(agent.trial_ends_at).toLocaleDateString() : "none"}</span></p>
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Simulate Calls</p>
            <button onClick={() => simulateCall("answered")} className="w-full px-3 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors">
              📞 Answered Call
            </button>
            <button onClick={() => simulateCall("missed")} className="w-full px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors">
              📵 Missed Call
            </button>
            <button onClick={() => simulateCall("spam")} className="w-full px-3 py-2 bg-orange-500/15 text-orange-400 rounded-lg hover:bg-orange-500/25 transition-colors">
              🚫 Spam Call
            </button>
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Trial Controls</p>
            <button onClick={() => updateTrial("2days")} className="w-full px-3 py-2 bg-orange-500/15 text-orange-400 rounded-lg hover:bg-orange-500/25 transition-colors">
              ⏰ Expiring (2 days)
            </button>
            <button onClick={() => updateTrial("expired")} className="w-full px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors">
              ❌ Expired
            </button>
            <button onClick={() => updateTrial("reset")} className="w-full px-3 py-2 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors">
              🔄 Reset (14 days)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPanel;
