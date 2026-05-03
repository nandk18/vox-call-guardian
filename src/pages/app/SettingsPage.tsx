import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CreditCard, Smartphone, Bell, Phone, MessageCircle, Mail,
  ChevronRight, ArrowLeft, Copy, Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatPhoneDisplay } from "@/utils/phoneUtils";
import ForwardingCodes from "@/components/app/ForwardingCodes";
import { PlanToggle, PriceDisplay, RAZORPAY_LINKS, type BillingCycle } from "@/components/app/PlanToggle";

type Agent = {
  id: string;
  phone_number: string | null;
  vox_number: string | null;
  owner_mobile: string | null;
  owner_whatsapp: string | null;
  trial_ends_at: string | null;
  status: string | null;
  business_name: string | null;
  bolna_agent_id: string | null;
  plan: string | null;
};

const RAZORPAY_LINK = "https://rzp.io/rzp/gX8IPIVJ";

type ModalType = "plan" | "phone" | "notifications" | "owner_mobile" | "owner_whatsapp" | null;

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [phoneScreen, setPhoneScreen] = useState(false);
  const [showForwarding, setShowForwarding] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<{ vox_number?: string } | null>(null);
  const [fixingWebhook, setFixingWebhook] = useState(false);
  const [webhookDebug, setWebhookDebug] = useState<any>(null);

  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  const { data: agent, refetch } = useQuery({
    queryKey: ["settings-agent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, phone_number, vox_number, owner_mobile, owner_whatsapp, trial_ends_at, status, business_name, bolna_agent_id, plan, notification_email, notification_whatsapp, notification_sms")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setEmailNotif(data.notification_email ?? true);
        setWhatsappNotif(data.notification_whatsapp ?? true);
        setSmsNotif(data.notification_sms ?? false);
      }
      return data as Agent | null;
    },
    enabled: !!user,
  });

  const voxNumber = agent?.vox_number || "";
  const trialEndsAt = agent?.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : null;
  const isOnTrial = daysLeft !== null && daysLeft > 0;
  const phoneConnected = !!agent?.phone_number;

  const updateAgent = async (field: string, value: string) => {
    if (!agent) return;
    setSaving(true);
    const { error } = await supabase.from("agents").update({ [field]: value } as any).eq("id", agent.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("✅ Saved"); refetch(); queryClient.invalidateQueries({ queryKey: ["agent"] }); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const settingRows = [
    { key: "plan", icon: <CreditCard className="w-5 h-5 text-primary" />, label: "Manage Plan", desc: "Change plan & manage billing", onClick: () => setActiveModal("plan") },
    { key: "phone", icon: <Smartphone className="w-5 h-5 text-blue-400" />, label: "Phone Number", desc: "Configure call forwarding", onClick: () => setPhoneScreen(true) },
    { key: "notifications", icon: <Bell className="w-5 h-5 text-yellow-400" />, label: "Notifications", desc: "Choose how you receive summaries", onClick: () => setActiveModal("notifications") },
    { key: "owner_mobile", icon: <Phone className="w-5 h-5 text-emerald-400" />, label: "Owner Mobile", desc: formatPhoneDisplay(agent?.owner_mobile), onClick: () => { setEditValue(agent?.owner_mobile?.replace(/\D/g, "").replace(/^91/, "").slice(-10) || ""); setActiveModal("owner_mobile"); } },
    { key: "owner_whatsapp", icon: <MessageCircle className="w-5 h-5 text-green-400" />, label: "Owner WhatsApp", desc: formatPhoneDisplay(agent?.owner_whatsapp), onClick: () => { setEditValue(agent?.owner_whatsapp?.replace(/\D/g, "").replace(/^91/, "").slice(-10) || ""); setActiveModal("owner_whatsapp"); } },
  ];

  if (phoneScreen) {
    return (
      <div className="max-w-[600px] mx-auto">
        <button onClick={() => { setPhoneScreen(false); setShowForwarding(false); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Back to Settings</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Phone Number</h2>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${phoneConnected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            <span className={`w-2 h-2 rounded-full ${phoneConnected ? "bg-primary" : "bg-muted-foreground"}`} />
            {phoneConnected ? "CONNECTED" : "NOT CONNECTED"}
          </span>
        </div>

        {/* Setup Retry Card */}
        {!agent?.vox_number && !setupSuccess && (
          <Card className="mb-4 border border-[rgba(245,166,35,0.4)] bg-[rgba(245,166,35,0.1)]" style={{ borderRadius: 12 }}>
            <CardContent className="p-5">
              <p className="text-sm font-semibold mb-1">⚠️ Your Vox agent needs setup</p>
              <p className="text-sm text-muted-foreground mb-4">Your AI agent and phone number haven't been configured yet.</p>
              {setupError && (
                <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/40 text-sm">
                  <p className="font-medium text-destructive">❌ Setup failed: {setupError}</p>
                  <p className="text-xs text-muted-foreground mt-1">Please try again or contact support</p>
                </div>
              )}
              <Button
                onClick={async () => {
                  if (!agent?.id) return;
                  setSetupLoading(true);
                  setSetupError(null);
                  try {
                    const { data, error } = await supabase.functions.invoke('create-bolna-agent', {
                      body: { agent_id: agent.id }
                    });
                    if (error || !data?.success) {
                      setSetupError(error?.message || data?.error || 'Unknown error');
                    } else {
                      setSetupSuccess({ vox_number: data.vox_number });
                      toast.success('✅ Agent created!');
                      setTimeout(() => {
                        refetch();
                        queryClient.invalidateQueries({ queryKey: ["agent"] });
                        setSetupSuccess(null);
                      }, 2000);
                    }
                  } catch (e: any) {
                    setSetupError(e.message || 'Network error');
                  } finally {
                    setSetupLoading(false);
                  }
                }}
                disabled={setupLoading}
                className="w-full min-h-[48px] font-bold text-black"
                style={{ backgroundColor: '#F5A623', borderRadius: 10 }}
              >
                {setupLoading ? '⏳ Creating your AI agent...' : setupError ? 'Retry' : 'Fix Now — Create Agent'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Setup Success Card */}
        {setupSuccess && (
          <Card className="mb-4 border border-[rgba(0,229,160,0.4)] bg-[rgba(0,229,160,0.1)]" style={{ borderRadius: 12 }}>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-primary mb-2">✅ Your Vox agent is live!</p>
              {setupSuccess.vox_number && (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold font-mono text-primary">{formatPhoneDisplay(setupSuccess.vox_number)}</p>
                  <button onClick={() => handleCopy(setupSuccess.vox_number!)} className="p-1.5 rounded hover:bg-secondary">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vox Number */}
        <Card className="mb-4 border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Your Vox number</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><Phone className="w-5 h-5 text-primary" /></div>
              <div className="flex-1">
                {voxNumber ? (
                  <>
                    <p className="text-lg font-bold">{formatPhoneDisplay(voxNumber)}</p>
                    <p className="text-xs text-muted-foreground">(Vox answers calls on this number)</p>
                  </>
                ) : (
                  <p className="text-sm font-medium" style={{ color: '#F5A623' }}>
                    {setupLoading ? '⏳ Setting up...' : 'Not set — use Fix Now above'}
                  </p>
                )}
              </div>
              {voxNumber && (
                <button onClick={() => handleCopy(voxNumber)} className="p-2 rounded-lg hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fix Webhook */}
        {agent?.bolna_agent_id && (
          <div className="mb-4">
            <button
              onClick={async () => {
                if (!agent?.id) return;
                setFixingWebhook(true);
                setWebhookDebug(null);
                const { data, error } = await supabase.functions.invoke('update-webhook', {
                  body: { agent_id: agent.id }
                });
                setWebhookDebug(data);
                if (!error && data?.success) {
                  toast.success('✅ Webhook updated!');
                } else {
                  toast.error('Failed: ' + (data?.error || error?.message));
                }
                setFixingWebhook(false);
              }}
              disabled={fixingWebhook}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[36px]"
            >
              {fixingWebhook ? '⏳ Fixing...' : '⚙️ Fix call summary delivery →'}
            </button>
            {webhookDebug && (
              <pre className="mt-3 text-[11px] p-3 rounded-lg overflow-auto max-h-[200px]" style={{ background: '#111', color: '#0f0' }}>
                {JSON.stringify(webhookDebug, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Business Number */}
        {agent?.phone_number && (
          <Card className="mb-4 border-border bg-card">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Your business number</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><Phone className="w-5 h-5 text-muted-foreground" /></div>
                <div className="flex-1">
                  <p className="text-lg font-bold">{formatPhoneDisplay(agent.phone_number)}</p>
                  <p className="text-xs text-muted-foreground">(Forward calls from this to your Vox number)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connect Card */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            {!showForwarding ? (
              <>
                <p className="text-sm font-semibold mb-2">✨ What you can do:</p>
                <p className="text-sm text-muted-foreground mb-5">Connect your number so customers call YOU directly. Vox answers automatically.</p>

                <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                  {[
                    { icon: <Phone className="w-4 h-4" />, label: "Customer calls you", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                    { icon: <span className="text-sm font-bold text-primary">V</span>, label: "Vox answers", color: "bg-primary/15 text-primary border-primary/30" },
                    { icon: <MessageCircle className="w-4 h-4" />, label: "You get summary", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${step.color}`}>
                        {step.icon}
                        <span className="text-[10px] font-medium text-center leading-tight max-w-[80px]">{step.label}</span>
                      </div>
                      {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>

                <Button onClick={() => setShowForwarding(true)} variant="outline" className="w-full font-semibold min-h-[48px] border-border hover:border-primary">
                  Connect My Number
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mb-1">Dial this code on your phone to forward calls to Vox:</p>
                <p className="text-xs text-muted-foreground mb-4">Choose your carrier below:</p>

                <ForwardingCodes voxNumber={voxNumber} />

                <p className="text-xs text-muted-foreground my-4 text-center">Once done, tap the button below to verify</p>

                <Button
                  onClick={async () => {
                    if (!agent) return;
                    setSaving(true);
                    await supabase.from("agents").update({ status: "active" }).eq("id", agent.id);
                    setSaving(false);
                    toast.success("Call forwarding connected!");
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["agent"] });
                  }}
                  disabled={saving}
                  className="w-full min-h-[48px]"
                >
                  {saving ? "Verifying..." : "✅ I've set up call forwarding"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">Subscription</p>
      <Card className="mb-8 border-border bg-card overflow-hidden">
        <CardContent className="p-5">
          {agent?.plan === "unlimited" ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
              <p className="text-sm font-bold text-primary mb-1">✅ Active Subscription</p>
              <p className="text-sm text-foreground mb-2">Your Vox subscription is active.</p>
              <p className="text-xs text-muted-foreground">To manage your subscription, contact support@voxai.in</p>
            </div>
          ) : trialEndsAt && trialEndsAt.getTime() < Date.now() ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <p className="text-sm font-bold text-destructive mb-3">⚠️ Trial Expired</p>
              <Button
                onClick={() => window.open(RAZORPAY_LINK, "_blank")}
                className="w-full font-semibold min-h-[44px]"
              >
                Subscribe Now — ₹999/mo
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
              <p className="text-sm font-bold text-primary mb-1">🎉 Free Trial Active</p>
              {trialEndsAt && (
                <p className="text-xs text-muted-foreground mb-3">Expires {trialEndsAt.toLocaleDateString()}</p>
              )}
              <Button
                onClick={() => window.open(RAZORPAY_LINK, "_blank")}
                className="w-full font-semibold min-h-[44px]"
              >
                Upgrade Now — ₹999/mo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">Your Account</p>
      <Card className="mb-8 border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {settingRows.map((row, i) => (
            <button key={row.key} onClick={row.onClick} className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/50 transition-colors min-h-[56px] ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">{row.icon}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium">{row.label}</p><p className="text-xs text-muted-foreground truncate">{row.desc}</p></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">Account</p>
      <Card className="mb-6 border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium">Email / Phone</p><p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone || "Not set"}</p></div>
          </div>
        </CardContent>
      </Card>

      <button onClick={() => setSignOutConfirm(true)} className="text-destructive text-sm font-medium hover:underline min-h-[44px]">→ Sign out</button>

      {/* Modals */}
      <Dialog open={activeModal === "plan"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Manage Plan</DialogTitle><DialogDescription>Your current subscription details</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3"><span className="text-sm font-medium">Current Plan</span><span className="text-sm font-bold text-primary">{isOnTrial ? "Free Trial" : "Unlimited"}</span></div>
            {isOnTrial && trialEndsAt && <div className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3"><span className="text-sm font-medium">Trial Ends</span><span className="text-sm text-muted-foreground">{trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
            <Button className="w-full font-semibold min-h-[48px]" onClick={async () => {
              if (!isOnTrial) return;
              if (!(window as any).Razorpay) {
                await new Promise<void>((resolve) => {
                  const script = document.createElement('script');
                  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                  script.onload = () => resolve();
                  document.body.appendChild(script);
                });
              }
              const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXX',
                amount: '99900',
                currency: 'INR',
                name: 'Vox AI',
                description: 'Unlimited Plan — ₹999/month',
                notes: { agent_id: agent?.id },
                prefill: { contact: agent?.owner_mobile || '', email: user?.email || '' },
                theme: { color: '#00e5a0' },
                handler: function() {
                  toast.success('Payment successful! 🎉 Your plan is being activated...');
                  setTimeout(() => window.location.reload(), 3000);
                }
              };
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            }}>{isOnTrial ? "Subscribe — ₹999/month" : "Manage via Razorpay →"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "notifications"} onOpenChange={(o) => {
        if (!o) setActiveModal(null);
        else setActiveModal("notifications");
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Notification Preferences</DialogTitle><DialogDescription>Choose how you receive call summaries</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            {[
              { icon: "📧", label: "Email summary", field: "notification_email", checked: emailNotif },
              { icon: "💬", label: "WhatsApp summary", field: "notification_whatsapp", checked: whatsappNotif },
              { icon: "📱", label: "SMS summary", field: "notification_sms", checked: smsNotif },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between min-h-[44px]">
                <Label className="flex items-center gap-3 text-sm cursor-pointer">
                  <span className="text-lg">{n.icon}</span>{n.label}
                  {savingField === n.field && <span className="text-[11px] text-muted-foreground ml-2">Saving...</span>}
                </Label>
                <Switch checked={n.checked} onCheckedChange={async (val) => {
                  if (n.field === "notification_email") setEmailNotif(val);
                  else if (n.field === "notification_whatsapp") setWhatsappNotif(val);
                  else if (n.field === "notification_sms") setSmsNotif(val);
                  setSavingField(n.field);
                  const { error } = await supabase.from("agents").update({ [n.field]: val } as any).eq("user_id", user!.id);
                  if (error) {
                    console.error("Failed to save preference:", error);
                    toast.error("Failed to save preference");
                    if (n.field === "notification_email") setEmailNotif(!val);
                    else if (n.field === "notification_whatsapp") setWhatsappNotif(!val);
                    else if (n.field === "notification_sms") setSmsNotif(!val);
                  }
                  setTimeout(() => setSavingField(null), 1000);
                }} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "owner_mobile"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Owner Mobile</DialogTitle><DialogDescription>We send SMS summaries here</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground px-3 py-2 bg-secondary rounded-lg">+91</span>
            <Input placeholder="9876543210" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/\D/g, "").slice(0, 10))} className="bg-secondary border-border" />
          </div>
          <DialogFooter>
            <Button onClick={async () => { await updateAgent("owner_mobile", `+91${editValue}`); setActiveModal(null); }} disabled={saving || editValue.length < 10} className="min-h-[44px]">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "owner_whatsapp"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Owner WhatsApp</DialogTitle><DialogDescription>We send WhatsApp summaries here</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground px-3 py-2 bg-secondary rounded-lg">+91</span>
            <Input placeholder="9876543210" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/\D/g, "").slice(0, 10))} className="bg-secondary border-border" />
          </div>
          <DialogFooter>
            <Button onClick={async () => { await updateAgent("owner_whatsapp", `+91${editValue}`); setActiveModal(null); }} disabled={saving || editValue.length < 10} className="min-h-[44px]">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={signOutConfirm} onOpenChange={setSignOutConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle><AlertDialogDescription>You'll need to sign in again to access your Vox dashboard.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
