import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const TestPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [retryingAgent, setRetryingAgent] = useState(false);
  const [retryingNumber, setRetryingNumber] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; detail?: string }>>({});

  const { data: agent, refetch: refetchAgent } = useQuery({
    queryKey: ["test-panel-agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, status, phone_number, trial_ends_at, bolna_agent_id, vox_number, owner_whatsapp, owner_mobile")
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
        agent_id: agent.id, caller_number: "+919876543210", duration_secs: 127, outcome: "answered",
        caller_name: "Rahul Sharma", caller_need: "AC servicing appointment",
        summary: "Customer Rahul Sharma called asking for AC servicing. Preferred time is Saturday morning between 10am-12pm.",
        transcript: [
          { speaker: "vox", text: "Thank you for calling. How can I help you today?", timestamp: "0:00" },
          { speaker: "caller", text: "Hi, I need to get my AC serviced.", timestamp: "0:04" },
        ],
        is_read: false, created_at: new Date().toISOString(),
      },
      missed: {
        agent_id: agent.id, caller_number: "+918765432109", duration_secs: 0, outcome: "missed",
        summary: "Missed call", transcript: [], is_read: false, created_at: new Date().toISOString(),
      },
      spam: {
        agent_id: agent.id, caller_number: "+910000000000", duration_secs: 0, outcome: "spam",
        summary: "Spam", transcript: [], is_read: false, created_at: new Date().toISOString(),
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
    queryClient.invalidateQueries({ queryKey: ["test-panel-agent"] });
  };

  const retryAgentCreation = useCallback(async () => {
    if (!agent?.id) return;
    setRetryingAgent(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bolna-agent', {
        body: { agent_id: agent.id }
      });
      if (error) {
        toast.error("Agent creation failed: " + error.message);
      } else if (data?.success) {
        toast.success("✅ Bolna agent created! ID: " + data.bolna_agent_id);
      } else {
        toast.error("Failed: " + (data?.error || "Unknown error"));
      }
      await refetchAgent();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setRetryingAgent(false);
    }
  }, [agent?.id, refetchAgent]);

  const retryNumberProvisioning = useCallback(async () => {
    if (!agent?.id || !agent?.bolna_agent_id) return;
    setRetryingNumber(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-vox-number', {
        body: { agent_id: agent.id, bolna_agent_id: agent.bolna_agent_id }
      });
      if (error) {
        toast.error("Number provisioning failed: " + error.message);
      } else if (data?.success) {
        toast.success("✅ Number assigned: " + data.vox_number);
      } else {
        toast.error("Failed: " + (data?.error || "Unknown error"));
      }
      await refetchAgent();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setRetryingNumber(false);
    }
  }, [agent?.id, agent?.bolna_agent_id, refetchAgent]);

  const testChannel = useCallback(async (channel: 'sms' | 'email' | 'whatsapp') => {
    if (!agent?.id) return;
    setTestingChannel(channel);
    setTestResults(prev => ({ ...prev, [channel]: { status: 'sending' } }));
    try {
      const { data, error } = await supabase.functions.invoke('send-call-summary', {
        body: { call_id: 'test', agent_id: agent.id, test_mode: true, test_channel: channel }
      });
      if (error) {
        setTestResults(prev => ({ ...prev, [channel]: { status: 'error', detail: error.message } }));
      } else {
        const sent = channel === 'sms' ? data?.smsSent : channel === 'email' ? data?.emailSent : data?.whatsappSent;
        const debugInfo = data?.debug?.[channel] ? JSON.stringify(data.debug[channel], null, 2) : '';
        setTestResults(prev => ({
          ...prev,
          [channel]: {
            status: sent ? 'success' : 'error',
            detail: sent ? `Sent! Check your ${channel}. ${debugInfo}` : `Failed. ${debugInfo}`
          }
        }));
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [channel]: { status: 'error', detail: e.message } }));
    } finally {
      setTestingChannel(null);
    }
  }, [agent?.id]);

  return (
    <div className="fixed bottom-20 left-4 z-[100] max-w-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-lg text-xs font-semibold backdrop-blur-sm"
      >
        🧪 Test Panel {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 bg-card border border-border rounded-xl p-4 space-y-3 shadow-xl text-xs max-h-[60vh] overflow-y-auto">
          <p className="font-bold text-foreground text-sm">🧪 Test Panel</p>

          <div className="space-y-1 text-muted-foreground">
            <p>User: <span className="text-foreground font-mono">{user?.id?.slice(0, 8)}...</span></p>
            <p>Agent: <span className="text-foreground font-mono">{agent?.id?.slice(0, 8) || "none"}...</span></p>
            <p>Status: <span className="text-foreground">{agent?.status || "unknown"}</span></p>
            <p>Bolna ID: <span className="text-foreground font-mono">{agent?.bolna_agent_id?.slice(0, 12) || "❌ not created"}</span></p>
            <p>Vox #: <span className="text-foreground">{agent?.vox_number || "❌ not assigned"}</span></p>
            <p>Phone: <span className="text-foreground">{agent?.phone_number ? "connected" : "not set"}</span></p>
            <p>Trial: <span className="text-foreground">{agent?.trial_ends_at ? new Date(agent.trial_ends_at).toLocaleDateString() : "none"}</span></p>
          </div>

          {/* Bolna Retry */}
          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Agent & Number</p>
            {!agent?.bolna_agent_id && (
              <button onClick={retryAgentCreation} disabled={retryingAgent} className="w-full px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors flex items-center justify-center gap-2">
                {retryingAgent ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {retryingAgent ? "Creating..." : "❌ Retry Agent Creation →"}
              </button>
            )}
            {agent?.bolna_agent_id && !agent?.vox_number && (
              <button onClick={retryNumberProvisioning} disabled={retryingNumber} className="w-full px-3 py-2 bg-orange-500/15 text-orange-400 rounded-lg hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2">
                {retryingNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {retryingNumber ? "Provisioning..." : "❌ Retry Number Provisioning →"}
              </button>
            )}
            {agent?.bolna_agent_id && agent?.vox_number && (
              <p className="text-emerald-400 text-xs">✅ Agent & number ready</p>
            )}
          </div>

          {/* Test Notifications */}
          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Test Notifications</p>
            {(['sms', 'email', 'whatsapp'] as const).map(ch => (
              <div key={ch} className="space-y-1">
                <button
                  onClick={() => testChannel(ch)}
                  disabled={testingChannel === ch}
                  className="w-full px-3 py-2 bg-blue-500/15 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  {testingChannel === ch ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {ch === 'sms' ? '📱' : ch === 'email' ? '📧' : '💬'} Test {ch.toUpperCase()}
                </button>
                {testResults[ch] && (
                  <p className={`text-[10px] px-2 ${testResults[ch].status === 'success' ? 'text-emerald-400' : testResults[ch].status === 'error' ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {testResults[ch].status === 'success' ? '✅' : testResults[ch].status === 'error' ? '❌' : '⏳'} {testResults[ch].detail}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Simulate Calls */}
          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Simulate Calls</p>
            <button onClick={() => simulateCall("answered")} className="w-full px-3 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors">📞 Answered</button>
            <button onClick={() => simulateCall("missed")} className="w-full px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors">📵 Missed</button>
          </div>

          {/* Trial Controls */}
          <div className="border-t border-border pt-2 space-y-2">
            <p className="font-semibold text-foreground">Trial</p>
            <button onClick={() => updateTrial("2days")} className="w-full px-3 py-2 bg-orange-500/15 text-orange-400 rounded-lg hover:bg-orange-500/25 transition-colors">⏰ 2 days left</button>
            <button onClick={() => updateTrial("expired")} className="w-full px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors">❌ Expired</button>
            <button onClick={() => updateTrial("reset")} className="w-full px-3 py-2 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors">🔄 Reset</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPanel;
