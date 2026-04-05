import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Phone, ArrowLeft, ChevronRight, Copy, Trash2, MessageCircle, RotateCcw, Clock, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhoneDisplay } from "@/utils/phoneUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Call = Tables<"calls">;

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const formatDuration = (secs: number | null) => {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const outcomeConfig: Record<string, { label: string; className: string }> = {
  answered: { label: "Answered", className: "bg-emerald-500/20 text-emerald-400" },
  missed: { label: "Missed", className: "bg-red-500/20 text-red-400" },
  no_response: { label: "No Response", className: "bg-gray-500/20 text-gray-400" },
  spam: { label: "Spam", className: "bg-orange-500/20 text-orange-400" },
};

const OutcomeBadge = ({ outcome }: { outcome: string | null }) => {
  const config = outcomeConfig[outcome || "no_response"] || outcomeConfig.no_response;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.className}`}>{config.label}</span>;
};

const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="bg-yellow-500/30 text-foreground rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
};

const SkeletonCard = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
    <div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-48" /></div>
    <Skeleton className="h-5 w-16 rounded-full" />
  </div>
);

const InboxPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: agent } = useQuery({
    queryKey: ["inbox-agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, phone_number, vox_number, trial_ends_at, business_name, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["inbox-calls", agent?.id],
    queryFn: async () => {
      const { data } = await supabase.from("calls").select("*").eq("agent_id", agent!.id).order("created_at", { ascending: false });
      return (data || []) as Call[];
    },
    enabled: !!agent?.id,
  });

  useEffect(() => {
    if (!agent?.id) return;
    const channel = supabase.channel("calls-realtime").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `agent_id=eq.${agent.id}` },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ["inbox-calls"] });
        queryClient.invalidateQueries({ queryKey: ["unread-calls"] });
        const newCall = payload.new as Call;
        toast("📞 New call from " + formatPhoneDisplay(newCall.caller_number), {
          duration: 8000,
          action: { label: "View →", onClick: () => { setSelectedCallId(newCall.id); setMobileDetailOpen(true); } },
        });
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent?.id, queryClient]);

  const markRead = useCallback(async (call: Call) => {
    if (call.is_read) return;
    await supabase.from("calls").update({ is_read: true }).eq("id", call.id);
    queryClient.invalidateQueries({ queryKey: ["inbox-calls"] });
    queryClient.invalidateQueries({ queryKey: ["unread-calls"] });
  }, [queryClient]);

  const handleSelectCall = (call: Call) => { setSelectedCallId(call.id); setMobileDetailOpen(true); markRead(call); };

  const handleDelete = async (callId: string) => {
    await supabase.from("calls").delete().eq("id", callId);
    queryClient.invalidateQueries({ queryKey: ["inbox-calls"] });
    if (selectedCallId === callId) { setSelectedCallId(null); setMobileDetailOpen(false); }
    toast.success("Call deleted");
  };

  const selectedCall = calls.find((c) => c.id === selectedCallId);
  const filteredCalls = calls.filter((c) => {
    if (!debouncedQuery) return true;
    const q = debouncedQuery.toLowerCase();
    return c.caller_number?.toLowerCase().includes(q) || c.caller_name?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q) || c.caller_need?.toLowerCase().includes(q);
  });

  const trialEndsAt = agent?.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : null;
  const voxNumber = agent?.vox_number || "";
  const businessName = agent?.business_name || "your business";
  const transcript = selectedCall?.transcript as Array<{ speaker?: string; role?: string; text: string; time?: string; timestamp?: string }> | null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 md:-m-6">
      {/* LEFT */}
      <div className={`w-full md:w-[340px] md:min-w-[340px] border-r border-border flex flex-col bg-card ${mobileDetailOpen ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 space-y-3 border-b border-border sticky top-0 bg-card z-10">
          <h1 className="text-xl font-bold text-foreground">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search calls..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-9 py-2 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary min-h-[44px]" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        <div className="px-4 pt-3 space-y-2">
          {daysLeft !== null && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-sm">⏳</div>
              <div className="flex-1"><p className="text-xs font-semibold text-teal-300">Free Trial</p><p className="text-[11px] text-teal-400/70">Expires {trialEndsAt!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-0">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>
          ) : filteredCalls.length === 0 && debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
              <div className="text-4xl">🔍</div>
              <p className="font-semibold text-foreground">No calls found for "{debouncedQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="text-xs text-primary hover:underline">Clear search</button>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
              <div className="text-4xl">📞</div>
              <p className="font-semibold text-foreground">No calls yet</p>
              <p className="text-xs text-muted-foreground">Share your Vox number to get started:</p>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-sm font-mono">{formatPhoneDisplay(voxNumber)}</span>
                <button onClick={() => { navigator.clipboard.writeText(voxNumber); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Recent Calls</p>
                {debouncedQuery && <p className="text-[10px] text-muted-foreground">{filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""} found</p>}
              </div>
              {filteredCalls.map((call) => (
                <button key={call.id} onClick={() => handleSelectCall(call)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 border-l-[3px] min-h-[72px] ${!call.is_read ? "border-l-primary" : "border-l-transparent"} ${selectedCallId === call.id ? "bg-secondary/70" : ""}`}>
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground text-sm font-semibold shrink-0">
                    {call.caller_name ? call.caller_name.charAt(0).toUpperCase() : "📞"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-foreground truncate">
                        {debouncedQuery ? highlightMatch(formatPhoneDisplay(call.caller_number), debouncedQuery) : formatPhoneDisplay(call.caller_number)}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{call.created_at ? timeAgo(call.created_at) : ""}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {debouncedQuery ? highlightMatch(call.summary || "No summary", debouncedQuery) : (call.summary || "No summary")}
                    </p>
                  </div>
                  <OutcomeBadge outcome={call.outcome} />
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className={`flex-1 flex flex-col bg-background overflow-y-auto ${mobileDetailOpen ? "flex" : "hidden md:flex"}`}>
        {!selectedCall ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <div className="text-4xl">📋</div>
            <p className="text-sm text-muted-foreground">Select a call to see details</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full">
            <button onClick={() => setMobileDetailOpen(false)} className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 min-h-[44px]">
              <ArrowLeft className="w-4 h-4" /> Back to inbox
            </button>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-foreground text-xl font-bold">
                  {selectedCall.caller_name ? selectedCall.caller_name.charAt(0).toUpperCase() : "📞"}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatPhoneDisplay(selectedCall.caller_number)}</p>
                  <p className="text-xs text-muted-foreground">{selectedCall.created_at ? new Date(selectedCall.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(selectedCall.duration_secs)}</span>
                <OutcomeBadge outcome={selectedCall.outcome} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 border-l-4 border-l-primary space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">✨ AI Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedCall.summary || "No summary available."}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <InfoRow icon="👤" label="Caller Name" value={selectedCall.caller_name} />
                <InfoRow icon="🔧" label="Service Needed" value={selectedCall.caller_need} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <button onClick={() => setTranscriptOpen(!transcriptOpen)} className="w-full flex items-center justify-between text-sm font-bold text-foreground">
                <span className="flex items-center gap-2">📝 Full Transcript</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${transcriptOpen ? "rotate-90" : ""}`} />
              </button>
              {transcriptOpen && (
                <div className="space-y-2 pt-2">
                  {transcript && Array.isArray(transcript) && transcript.length > 0 ? transcript.map((line, i) => {
                    const speaker = line.speaker || line.role || "caller";
                    const isVox = speaker === "vox" || speaker === "agent";
                    return (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className={`text-[10px] font-bold uppercase shrink-0 w-14 pt-0.5 ${isVox ? "text-primary" : "text-blue-400"}`}>{isVox ? "VOX" : "CALLER"}</span>
                        <div className="flex-1">
                          <p className="text-muted-foreground">{line.text}</p>
                          {(line.time || line.timestamp) && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{line.time || line.timestamp}</p>}
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-muted-foreground">No transcript available.</p>}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${selectedCall.caller_number}`} className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 min-h-[48px]">
                  <Phone className="w-4 h-4" /> Call Back
                </a>
                <a href={`https://wa.me/${(selectedCall.caller_number || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, calling back re your call to ${businessName}. How can I help?`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-xl text-sm font-semibold hover:bg-secondary/80 min-h-[48px]">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-border text-muted-foreground rounded-xl text-sm hover:bg-secondary min-h-[48px]"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('resend-summary', {
                        body: { call_id: selectedCall.id }
                      });
                      if (!error && data?.success) {
                        toast.success('Summary resent ✅');
                      } else {
                        toast.error('Failed to resend summary');
                      }
                    } catch {
                      toast.error('Failed to resend summary');
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4" /> Resend
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-destructive/30 text-destructive rounded-xl text-sm hover:bg-destructive/10 min-h-[48px]">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this call?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove the call record, transcript, and summary.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selectedCall.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string | null }) => (
  <div className="flex items-start gap-2 bg-secondary/50 rounded-lg px-3 py-2">
    <span className="text-sm mt-0.5">{icon}</span>
    <div className="min-w-0"><p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p><p className="text-sm text-foreground truncate">{value || "—"}</p></div>
  </div>
);

export default InboxPage;
