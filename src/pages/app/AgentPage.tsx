import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight, X, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getMixedLanguageInfo } from "@/utils/languageUtils";
import { formatIndianPhone } from "@/utils/phoneUtils";
import { compileAgentKnowledge } from "@/utils/agentKnowledge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const industries = [
  { value: "clinic", label: "🏥 Clinic / Hospital" },
  { value: "salon", label: "💇 Salon & Spa" },
  { value: "real_estate", label: "🏗️ Real Estate" },
  { value: "repair", label: "🔧 AC & Appliance Repair" },
  { value: "coaching", label: "📚 Coaching / Tuition Center" },
  { value: "restaurant", label: "🍽️ Restaurant / Cafe" },
  { value: "garage", label: "🚗 Car Service / Garage" },
  { value: "ca", label: "⚖️ CA / Tax Consultant" },
  { value: "pharmacy", label: "💊 Pharmacy" },
  { value: "home_services", label: "🏠 Home Services" },
  { value: "gym", label: "🏋️ Gym & Fitness" },
  { value: "vet", label: "🐾 Veterinary Clinic" },
  { value: "retail", label: "🏪 Retail Shop" },
  { value: "hotel", label: "🏨 Hotel / Guesthouse" },
  { value: "other", label: "📱 Other" },
];

const languages = [
  { value: "hindi", label: "हिंदी — Hindi" },
  { value: "english", label: "English" },
  { value: "tamil", label: "தமிழ் — Tamil" },
  { value: "telugu", label: "తెలుగు — Telugu" },
  { value: "kannada", label: "ಕನ್ನಡ — Kannada" },
  { value: "malayalam", label: "മലയാളം — Malayalam" },
  { value: "marathi", label: "मराठी — Marathi" },
  { value: "bengali", label: "বাংলা — Bengali" },
  { value: "gujarati", label: "ગુજરાતી — Gujarati" },
  { value: "punjabi", label: "ਪੰਜਾਬੀ — Punjabi" },
  { value: "odia", label: "ଓଡ଼ିଆ — Odia" },
];

const speedOptions = [
  { value: "slow", label: "Slow", desc: "Calm and measured pace" },
  { value: "natural", label: "Natural", desc: "Normal conversational speed" },
  { value: "fast", label: "Fast", desc: "Quick and efficient" },
];

interface AgentData {
  id: string;
  business_name: string | null;
  industry: string | null;
  greeting: string | null;
  voice: string | null;
  talk_speed: string | null;
  language_primary: string | null;
  language_auto_detect: boolean | null;
  owner_whatsapp: string | null;
  phone_number: string | null;
  vox_number: string | null;
  status: string | null;
  compiled_prompt: string | null;
}

interface KnowledgeData {
  id: string;
  address: string | null;
  hours: string | null;
  faq: string | null;
  services: string | null;
  extra_notes: string | null;
  updated_at: string | null;
}

type ModalType =
  | "greeting" | "voice" | "speed" | "language"
  | "company" | "industry" | "address" | "whatsapp"
  | "hours" | "faq" | "services" | "extra_notes"
  | "test_call"
  | null;

const AgentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalValue, setModalValue] = useState<string>("");
  const [modalToggle, setModalToggle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: ag } = await supabase
        .from("agents")
        .select("id, business_name, industry, greeting, voice, talk_speed, language_primary, language_auto_detect, owner_whatsapp, phone_number, vox_number, status, compiled_prompt")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ag) {
        setAgent(ag);
        const { data: kn } = await supabase.from("knowledge").select("id, address, hours, faq, services, extra_notes, updated_at").eq("agent_id", ag.id).maybeSingle();
        setKnowledge(kn);
      }
      setLoading(false);
    })();
  }, [user]);

  const openModal = (type: ModalType) => {
    if (!agent) return;
    setActiveModal(type);
    switch (type) {
      case "greeting": setModalValue(agent.greeting || ""); break;
      case "voice": setModalValue(agent.voice || "female"); break;
      case "speed": setModalValue(agent.talk_speed || "natural"); break;
      case "language":
        setModalValue(agent.language_primary || "hindi");
        setModalToggle(agent.language_auto_detect !== false);
        break;
      case "company": setModalValue(agent.business_name || ""); break;
      case "industry": setModalValue(agent.industry || ""); break;
      case "address": setModalValue(knowledge?.address || ""); break;
      case "whatsapp": setModalValue(agent.owner_whatsapp?.replace("+91", "").replace(/\D/g, "") || ""); break;
      case "hours": setModalValue(knowledge?.hours || ""); break;
      case "faq": setModalValue(knowledge?.faq || ""); break;
      case "services": setModalValue(knowledge?.services || ""); break;
      case "extra_notes": setModalValue(knowledge?.extra_notes || ""); break;
      case "test_call": setTestMessage(""); break;
    }
  };

  const recompileKnowledge = async (agentUpdate?: Partial<AgentData>, knowledgeUpdate?: Partial<KnowledgeData>) => {
    const a = { ...agent, ...agentUpdate };
    const k = { ...knowledge, ...knowledgeUpdate };
    const prompt = compileAgentKnowledge(
      { business_name: a.business_name || null, industry: a.industry || null, language_primary: a.language_primary || null, language_auto_detect: a.language_auto_detect ?? null, greeting: a.greeting || null },
      { address: k?.address || null, hours: k?.hours || null, services: k?.services || null, faq: k?.faq || null, extra_notes: k?.extra_notes || null }
    );
    if (agent?.id) {
      await supabase.from("agents").update({ compiled_prompt: prompt }).eq("id", agent.id);
      setAgent((prev) => prev ? { ...prev, compiled_prompt: prompt } : prev);
    }
  };

  const saveModal = useCallback(async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const agentFields: Record<string, string | boolean | null> = {};
      const knowledgeFields: Record<string, string | null> = {};
      const val = modalValue.trim() || null;

      switch (activeModal) {
        case "greeting": agentFields.greeting = val; break;
        case "voice": agentFields.voice = modalValue; break;
        case "speed": agentFields.talk_speed = modalValue; break;
        case "language":
          agentFields.language_primary = modalValue;
          agentFields.language_auto_detect = modalToggle;
          break;
        case "company": agentFields.business_name = val; break;
        case "industry": agentFields.industry = modalValue || null; break;
        case "address": knowledgeFields.address = val; break;
        case "whatsapp":
          agentFields.owner_whatsapp = modalValue.trim() ? `+91${modalValue.replace(/\D/g, "")}` : null;
          break;
        case "hours": knowledgeFields.hours = val; break;
        case "faq": knowledgeFields.faq = val; break;
        case "services": knowledgeFields.services = val; break;
        case "extra_notes": knowledgeFields.extra_notes = val; break;
      }

      if (Object.keys(agentFields).length > 0) {
        await supabase.from("agents").update(agentFields).eq("id", agent.id);
        setAgent((prev) => prev ? { ...prev, ...agentFields } as AgentData : prev);
      }

      if (Object.keys(knowledgeFields).length > 0) {
        if (knowledge?.id) {
          await supabase.from("knowledge").update({ ...knowledgeFields, updated_at: new Date().toISOString() }).eq("id", knowledge.id);
          setKnowledge((prev) => prev ? { ...prev, ...knowledgeFields, updated_at: new Date().toISOString() } : prev);
        } else {
          const { data } = await supabase.from("knowledge").insert({ agent_id: agent.id, ...knowledgeFields }).select("id, address, hours, faq, services, extra_notes, updated_at").single();
          if (data) setKnowledge(data);
        }
      }

      // Recompile knowledge
      await recompileKnowledge(agentFields as any, knowledgeFields as any);

      toast.success("✅ Saved");
      setActiveModal(null);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }, [agent, knowledge, activeModal, modalValue, modalToggle]);

  const handleTestCall = async () => {
    if (!agent?.id) return;
    setTestLoading(true);
    // Simulate 3s delay
    await new Promise((r) => setTimeout(r, 3000));
    const summary = `Test call: Customer asked "${testMessage || "general inquiry"}". Vox provided information about ${agent.business_name || "the business"} services and operating hours.`;
    const transcript = [
      { speaker: "vox", text: agent.greeting?.replace("{{business_name}}", agent.business_name || "your business") || "Thank you for calling. How can I help?", timestamp: "0:00" },
      { speaker: "caller", text: testMessage || "I have a general inquiry", timestamp: "0:04" },
      { speaker: "vox", text: `Of course! Let me help you with that. We offer various services at ${agent.business_name || "our business"}.`, timestamp: "0:08" },
      { speaker: "caller", text: "That sounds great, thank you.", timestamp: "0:14" },
      { speaker: "vox", text: "You're welcome! I'll pass your message to the team. They'll get back to you shortly. Thank you for calling!", timestamp: "0:18" },
    ];
    await supabase.from("calls").insert({
      agent_id: agent.id,
      caller_number: "+919999999999",
      caller_name: "Test Customer",
      duration_secs: 45,
      outcome: "answered",
      summary,
      transcript,
      caller_need: testMessage || "General inquiry",
      is_read: false,
      created_at: new Date().toISOString(),
    });
    setTestLoading(false);
    setActiveModal(null);
    toast.success("✅ Test complete! Check your inbox.");
  };

  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) { setModalValue((v) => v + variable); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = modalValue.substring(0, start) + variable + modalValue.substring(end);
    setModalValue(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  const completionFields = [
    { label: "Business Name", filled: !!agent?.business_name, modal: "company" as ModalType },
    { label: "Industry", filled: !!agent?.industry, modal: "industry" as ModalType },
    { label: "Greeting", filled: !!agent?.greeting && agent.greeting !== "Thank you for calling {{business_name}}, how can I help you today?", modal: "greeting" as ModalType },
    { label: "Voice", filled: !!agent?.voice, modal: "voice" as ModalType },
    { label: "Language", filled: !!agent?.language_primary, modal: "language" as ModalType },
    { label: "Opening Hours", filled: !!knowledge?.hours, modal: "hours" as ModalType },
    { label: "FAQ", filled: !!knowledge?.faq, modal: "faq" as ModalType },
    { label: "Services", filled: !!knowledge?.services, modal: "services" as ModalType },
  ];
  const filledCount = completionFields.filter((f) => f.filled).length;
  const totalCount = completionFields.length;

  const previewGreeting = agent?.greeting
    ?.replace("{{business_name}}", agent.business_name || "your business")
    ?.replace("{{industry}}", agent.industry || "")
    ?.replace("{{hours}}", knowledge?.hours || "our business hours");

  const voiceLabel = agent?.voice === "male" ? "👨 Professional Male" : "👩 Professional Female";
  const langMixedInfo = getMixedLanguageInfo(agent?.language_primary || "hindi");

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-56" /></div><Skeleton className="h-10 w-28 rounded-full" /></div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="rounded-2xl border border-border bg-card overflow-hidden"><Skeleton className="h-16 w-full" />{[1, 2, 3, 4].map((i) => <div key={i} className="flex items-center gap-3 px-5 py-4 border-t border-border"><Skeleton className="w-5 h-5 rounded" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div>)}</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-4xl">🤖</p>
        <p className="font-semibold text-foreground">Your agent isn't live yet</p>
        <button onClick={() => navigate("/app/onboarding")} className="text-primary text-sm font-semibold">Go to setup →</button>
      </div>
    );
  }

  const isActive = agent.status === "active";
  const voxNumber = agent.vox_number || "+91 98765 43210";

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      <div className="max-w-[680px] mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Your Agent</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Customize how your Vox handles calls</p>
          </div>
          <button onClick={() => openModal("test_call")} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]">
            <Phone className="w-4 h-4" /> Test Call
          </button>
        </div>

        {isActive ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-lg">✅</span>
            <p className="text-sm font-semibold text-emerald-400">Your Vox agent is live</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3"><span className="text-lg">⚠️</span><p className="text-sm font-semibold text-yellow-400">Complete your setup to go live</p></div>
            <button onClick={() => navigate("/app/onboarding")} className="text-xs font-semibold text-yellow-300">Complete Setup →</button>
          </div>
        )}

        {/* Preferences */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 bg-blue-500/10 border-b border-border flex items-center gap-3">
            <span className="text-lg">💙</span>
            <div><p className="text-sm font-bold text-foreground">Preferences</p><p className="text-xs text-muted-foreground">Customize how your Vox introduces itself, speaks, and closes each call</p></div>
          </div>
          <div className="divide-y divide-border">
            <SettingRow icon="💬" label="Greeting Message" value={previewGreeting ? (previewGreeting.length > 50 ? previewGreeting.slice(0, 50) + "..." : previewGreeting) : undefined} onClick={() => openModal("greeting")} />
            <SettingRow icon="🎙️" label="Voice" value={voiceLabel} onClick={() => openModal("voice")} />
            <SettingRow icon="⚡" label="Talk Speed" value={speedOptions.find((s) => s.value === agent.talk_speed)?.label} onClick={() => openModal("speed")} />
            <SettingRow icon="🌐" label="Primary Language" value={languages.find((l) => l.value === agent.language_primary)?.label} onClick={() => openModal("language")} />
          </div>
        </div>

        {/* Knowledge */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 bg-primary/10 border-b border-border flex items-center gap-3">
            <span className="text-lg">📗</span>
            <div><p className="text-sm font-bold text-foreground">Knowledge</p><p className="text-xs text-muted-foreground">Business information Vox uses to answer calls</p></div>
          </div>
          <div className="divide-y divide-border">
            <SettingRow icon="🏢" label="Company Name" value={agent.business_name} onClick={() => openModal("company")} />
            <SettingRow icon="🏷️" label="Industry" value={industries.find((i) => i.value === agent.industry)?.label} onClick={() => openModal("industry")} />
            <SettingRow icon="📍" label="Address" value={knowledge?.address} onClick={() => openModal("address")} />
            <SettingRow icon="💬" label="WhatsApp for Summaries" value={agent.owner_whatsapp ? formatIndianPhone(agent.owner_whatsapp) : undefined} onClick={() => openModal("whatsapp")} />
            <SettingRow icon="🕐" label="Opening Hours" value={knowledge?.hours} onClick={() => openModal("hours")} />
            <SettingRow icon="📖" label="FAQ" value={knowledge?.faq ? (knowledge.faq.length > 40 ? knowledge.faq.slice(0, 40) + "..." : knowledge.faq) : undefined} onClick={() => openModal("faq")} />
            <SettingRow icon="🛒" label="Products & Services" value={knowledge?.services ? (knowledge.services.length > 40 ? knowledge.services.slice(0, 40) + "..." : knowledge.services) : undefined} onClick={() => openModal("services")} />
            <SettingRow icon="📝" label="Additional Knowledge" value={knowledge?.extra_notes ? (knowledge.extra_notes.length > 40 ? knowledge.extra_notes.slice(0, 40) + "..." : knowledge.extra_notes) : undefined} onClick={() => openModal("extra_notes")} />
          </div>
          {knowledge?.updated_at && <p className="px-5 py-3 text-[11px] text-muted-foreground border-t border-border">Last updated: {timeAgo(knowledge.updated_at)}</p>}
        </div>

        {/* Completion Meter */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Agent Setup: {filledCount}/{totalCount} fields complete</p>
            <span className="text-xs text-muted-foreground">{Math.round((filledCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(filledCount / totalCount) * 100}%` }} />
          </div>
          {filledCount === totalCount ? (
            <p className="text-sm text-primary font-semibold">✅ Your agent is fully configured</p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Complete your setup to improve Vox's accuracy:</p>
              <div className="flex flex-wrap gap-2">
                {completionFields.filter((f) => !f.filled).map((f) => (
                  <button key={f.label} onClick={() => openModal(f.modal)} className="text-xs text-primary hover:underline px-2 py-1 rounded-full bg-primary/10">+ {f.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Knowledge Preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button onClick={() => setShowKnowledge(!showKnowledge)} className="w-full px-5 py-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-2"><span>🧠</span><span className="text-sm font-bold text-foreground">Agent Knowledge Preview</span></div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showKnowledge ? "rotate-90" : ""}`} />
          </button>
          {showKnowledge && (
            <div className="px-5 pb-5">
              <p className="text-xs text-muted-foreground mb-2">This is what Vox knows about your business</p>
              <pre className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                {agent.compiled_prompt || "No knowledge compiled yet. Complete your setup to generate."}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {activeModal && activeModal !== "test_call" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-md md:rounded-2xl rounded-t-2xl bg-card border border-border p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-200">
            <div className="w-8 h-1 bg-border rounded-full mx-auto md:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{getModalTitle(activeModal)}</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {activeModal === "greeting" && (
              <div className="space-y-3">
                <textarea ref={textareaRef} value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={4} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Thank you for calling..." />
                <p className="text-[11px] text-muted-foreground">{"{{business_name}}"} will be replaced with your actual business name</p>
                <div className="flex flex-wrap gap-2">
                  {["{{business_name}}", "{{industry}}", "{{hours}}"].map((v) => (
                    <button key={v} onClick={() => insertVariable(v)} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">{v}</button>
                  ))}
                </div>
              </div>
            )}

            {activeModal === "voice" && (
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: "female", icon: "👩", label: "Professional Female", desc: "Warm, clear, professional tone" },
                  { value: "male", icon: "👨", label: "Professional Male", desc: "Deep, clear, professional tone" },
                ].map((v) => (
                  <button key={v.value} onClick={() => setModalValue(v.value)} className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-colors ${modalValue === v.value ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:bg-secondary"}`}>
                    <span className="text-2xl">{v.icon}</span>
                    <div><p className="text-sm font-semibold text-foreground">{v.label}</p><p className="text-xs text-muted-foreground">{v.desc}</p></div>
                  </button>
                ))}
              </div>
            )}

            {activeModal === "speed" && (
              <div className="flex gap-2">
                {speedOptions.map((s) => (
                  <button key={s.value} onClick={() => setModalValue(s.value)} className={`flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl border text-sm transition-colors ${modalValue === s.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
                    <span className="font-semibold">{s.label}</span><span className="text-[10px]">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {activeModal === "language" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {languages.map((l) => (
                    <button key={l.value} onClick={() => setModalValue(l.value)} className={`px-4 py-3 rounded-xl border text-sm text-left transition-colors ${modalValue === l.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>{l.label}</button>
                  ))}
                </div>
                {getMixedLanguageInfo(modalValue).mixed && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                    <div>
                      <p className="text-sm text-foreground">Also understand {getMixedLanguageInfo(modalValue).mixed} speech</p>
                      <p className="text-[11px] text-muted-foreground">Handles {getMixedLanguageInfo(modalValue).name} + English code-switching mid-call</p>
                    </div>
                    <Switch checked={modalToggle} onCheckedChange={setModalToggle} />
                  </div>
                )}
              </div>
            )}

            {activeModal === "industry" && (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {industries.map((i) => (
                  <button key={i.value} onClick={() => setModalValue(i.value)} className={`px-4 py-3 rounded-xl border text-sm text-left transition-colors min-h-[44px] ${modalValue === i.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>{i.label}</button>
                ))}
              </div>
            )}

            {activeModal === "company" && <input value={modalValue} onChange={(e) => setModalValue(e.target.value)} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Your business name" />}
            {activeModal === "address" && <input value={modalValue} onChange={(e) => setModalValue(e.target.value)} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Full address" />}
            {activeModal === "whatsapp" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground bg-secondary px-3 py-3 rounded-xl border border-border">+91</span>
                <input value={modalValue} onChange={(e) => setModalValue(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1 rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="9876543210" />
              </div>
            )}
            {activeModal === "hours" && <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={4} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Mon-Sat: 9am to 7pm&#10;Sunday: Closed" />}
            {activeModal === "faq" && <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={6} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Q: What are your charges?&#10;A: First consultation is ₹500" />}
            {activeModal === "services" && <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={5} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="List your main services" />}
            {activeModal === "extra_notes" && <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={5} className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Anything else Vox should know" />}

            <button onClick={saveModal} disabled={saving} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Test Call Modal */}
      <Dialog open={activeModal === "test_call"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Test your Vox agent</DialogTitle>
            <DialogDescription>Try out your agent to see how it handles calls</DialogDescription>
          </DialogHeader>

          {testLoading ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Vox is handling the call...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Option 1 */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">📞 Call Vox directly</p>
                <a href={`tel:${voxNumber.replace(/\s/g, "")}`} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 min-h-[48px]">
                  <Phone className="w-4 h-4" /> Call {formatIndianPhone(voxNumber)}
                </a>
                <p className="text-xs text-muted-foreground text-center">Call this number from any phone to hear your agent</p>
              </div>

              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-border" /></div>

              {/* Option 2 */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">🤖 Simulate a test call</p>
                <p className="text-xs text-muted-foreground">We'll simulate a call and send you a summary</p>
                <Textarea placeholder="e.g. I need to book an appointment for Saturday" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={3} />
                <Button onClick={handleTestCall} className="w-full min-h-[48px]">Run Test →</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const SettingRow = ({ icon, label, value, onClick }: { icon: string; label: string; value?: string | null; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/50 transition-colors min-h-[56px]">
    <span className="text-base">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className={`text-xs truncate mt-0.5 ${value ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}>{value || "Not set — tap to add"}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

const getModalTitle = (type: ModalType): string => {
  const titles: Record<string, string> = {
    greeting: "Greeting Message", voice: "Voice", speed: "Talk Speed", language: "Primary Language",
    company: "Company Name", industry: "Industry", address: "Address", whatsapp: "WhatsApp for Summaries",
    hours: "Opening Hours", faq: "FAQ", services: "Products & Services", extra_notes: "Additional Knowledge",
  };
  return titles[type || ""] || "";
};

export default AgentPage;
