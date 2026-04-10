import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Table2, Zap, ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const IntegrationsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [fetchingEvents, setFetchingEvents] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Get agent
  const { data: agent } = useQuery({
    queryKey: ["integrations-agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get Cal.com integration
  const { data: calIntegration } = useQuery({
    queryKey: ["calcom-integration", agent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("agent_id", agent!.id)
        .eq("type", "calcom")
        .maybeSingle();
      return data;
    },
    enabled: !!agent?.id,
  });

  const isCalConnected = !!calIntegration?.api_key;

  const handleFetchEvents = async () => {
    setFetchError("");
    setFetchingEvents(true);
    try {
      const res = await fetch("https://api.cal.com/v1/event-types", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Invalid API key");
      const json = await res.json();
      const types = json.event_types || json.data || [];
      if (!types.length) throw new Error("No event types found");
      setEventTypes(types);
      setStep(2);
    } catch (e: any) {
      setFetchError(e.message || "Invalid API key. Please check and try again.");
    } finally {
      setFetchingEvents(false);
    }
  };

  const handleSave = async () => {
    if (!agent?.id || !selectedEventId) return;
    setSaving(true);
    const selectedEvent = eventTypes.find(
      (e: any) => String(e.id) === selectedEventId
    );
    const { error } = await supabase.from("integrations").upsert(
      {
        agent_id: agent.id,
        type: "calcom",
        api_key: apiKey,
        event_type_id: selectedEventId,
        event_type_name: selectedEvent?.title || selectedEvent?.slug || "Event",
        timezone: "Asia/Kolkata",
        is_active: false,
      },
      { onConflict: "agent_id,type", ignoreDuplicates: false }
    );
    setSaving(false);
    if (error) {
      // fallback: delete + insert
      await supabase
        .from("integrations")
        .delete()
        .eq("agent_id", agent.id)
        .eq("type", "calcom");
      const { error: err2 } = await supabase.from("integrations").insert({
        agent_id: agent.id,
        type: "calcom",
        api_key: apiKey,
        event_type_id: selectedEventId,
        event_type_name: selectedEvent?.title || selectedEvent?.slug || "Event",
        timezone: "Asia/Kolkata",
        is_active: false,
      });
      if (err2) {
        toast.error("Failed to save integration");
        return;
      }
    }
    toast.success("✅ Cal.com connected! Rebuild your agent to activate booking.");
    setConnectOpen(false);
    resetModal();
    queryClient.invalidateQueries({ queryKey: ["calcom-integration"] });
  };

  const handleDisconnect = async () => {
    if (!agent?.id) return;
    await supabase
      .from("integrations")
      .delete()
      .eq("agent_id", agent.id)
      .eq("type", "calcom");
    toast.success("Cal.com disconnected");
    toast("Rebuild your agent to deactivate booking.", { icon: "⚠️" });
    setDisconnectOpen(false);
    queryClient.invalidateQueries({ queryKey: ["calcom-integration"] });
  };

  const resetModal = () => {
    setApiKey("");
    setFetchError("");
    setEventTypes([]);
    setSelectedEventId("");
    setStep(1);
  };

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your tools to supercharge Vox
        </p>
      </div>

      <div className="space-y-4">
        {/* Cal.com Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Cal.com</span>
                    {isCalConnected ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Let Vox check availability and book appointments live during
                    calls. Callers never need to call back.
                  </p>

                  {isCalConnected && (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>📅 Event: {calIntegration.event_type_name}</p>
                      <p>🕐 Timezone: Asia/Kolkata</p>
                      {!calIntegration.is_active && (
                        <div className="mt-2 flex items-start gap-2 bg-amber-500/10 text-amber-400 rounded-lg p-3 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Rebuild your agent to activate Cal.com booking on
                            calls.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {isCalConnected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDisconnectOpen(true)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      resetModal();
                      setConnectOpen(true);
                    }}
                  >
                    Connect Cal.com
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets — Coming Soon */}
        <Card className="opacity-60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Table2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Google Sheets</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Auto-log every call to a Google Sheet. Track caller history,
                    needs, and outcomes automatically.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zapier — Coming Soon */}
        <Card className="opacity-60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Zapier</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect Vox to 6000+ apps. Trigger workflows when calls end,
                    leads come in, or bookings are made.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connect Cal.com Modal */}
      <Dialog
        open={connectOpen}
        onOpenChange={(v) => {
          setConnectOpen(v);
          if (!v) resetModal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Cal.com</DialogTitle>
            <DialogDescription>
              Enter your Cal.com details to enable live appointment booking
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Cal.com API Key
                </label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="cal_live_XXXXXXXXXX"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Get your API key from{" "}
                  <a
                    href="https://cal.com/settings/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Cal.com → Settings → Developer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
              {fetchError && (
                <p className="text-sm text-destructive">{fetchError}</p>
              )}
              <Button
                className="w-full"
                onClick={handleFetchEvents}
                disabled={!apiKey.trim() || fetchingEvents}
              >
                {fetchingEvents ? "Fetching…" : "Fetch My Events →"}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Select Event Type
                </label>
                <Select
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((et: any) => (
                      <SelectItem key={et.id} value={String(et.id)}>
                        {et.title || et.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Timezone
                </label>
                <Input value="Asia/Kolkata (IST)" disabled />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={!selectedEventId || saving}
              >
                {saving ? "Saving…" : "Save Integration"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirm */}
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Cal.com?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking will stop working on your next rebuild.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IntegrationsPage;
