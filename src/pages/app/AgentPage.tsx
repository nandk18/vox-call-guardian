import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight, X, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// ── Constants ──────────────────────────────────────────

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
  { value: "malayalam", label: "മലయാളം — Malayalam" },
  { value: "marathi", label: "मराठी — Marathi" },
  { value: "bengali", label: "বাংলা — Bengali" },
  { value: "gujarati", label: "ગુજરાতી — Gujarati" },
  { value: "punjabi", label: "ਪੰਜਾਬੀ — Punjabi" },
  { value: "odia", label: "ଓଡ଼ିଆ — Odia" },
];

const voiceOptions = [
  { value: "female_hindi", label: "Professional Female — Hindi" },
  { value: "male_hindi", label: "Professional Male — Hindi" },
  { value: "female_tamil", label: "Professional Female — Tamil" },
  { value: "male_tamil", label: "Professional Male — Tamil" },
  { value: "female_telugu", label: "Professional Female — Telugu" },
  { value: "male_telugu", label: "Professional Male — Telugu" },
  { value: "female_kannada", label: "Professional Female — Kannada" },
  { value: "male_kannada", label: "Professional Male — Kannada" },
  { value: "female_bengali", label: "Professional Female — Bengali" },
  { value: "male_bengali", label: "Professional Male — Bengali" },
  { value: "female_marathi", label: "Professional Female — Marathi" },
  { value: "male_marathi", label: "Professional Male — Marathi" },
  { value: "female_english", label: "Professional Female — English (Indian)" },
  { value: "male_english", label: "Professional Male — English (Indian)" },
];

const speedOptions = [
  { value: "slow", label: "Slow", desc: "Calm and measured pace" },
  { value: "natural", label: "Natural", desc: "Normal conversational speed" },
  { value: "fast", label: "Fast", desc: "Quick and efficient" },
];

// ── Types ──────────────────────────────────────────

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
  status: string | null;
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
  | null;

// ── Component ──────────────────────────────────────────

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: ag } = await supabase
        .from("agents")
        .select("id, business_name, industry, greeting, voice, talk_speed, language_primary, language_auto_detect, owner_whatsapp, phone_number, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ag) {
        setAgent(ag);
        const { data: kn } = await supabase
          .from("knowledge")
          .select("id, address, hours, faq, services, extra_notes, updated_at")
          .eq("agent_id", ag.id)
          .maybeSingle();
        setKnowledge(kn);
      }
      setLoading(false);
    })();
  }, [user]);

  // Open modal
  const openModal = (type: ModalType) => {
    if (!agent) return;
    setActiveModal(type);
    switch (type) {
      case "greeting": setModalValue(agent.greeting || ""); break;
      case "voice": setModalValue(agent.voice || "female_hindi"); break;
      case "speed": setModalValue(agent.talk_speed || "natural"); break;
      case "language":
        setModalValue(agent.language_primary || "hindi");
        setModalToggle(agent.language_auto_detect !== false);
        break;
      case "company": setModalValue(agent.business_name || ""); break;
      case "industry": setModalValue(agent.industry || ""); break;
      case "address": setModalValue(knowledge?.address || ""); break;
      case "whatsapp": setModalValue(agent.owner_whatsapp?.replace("+91", "") || ""); break;
      case "hours": setModalValue(knowledge?.hours || ""); break;
      case "faq": setModalValue(knowledge?.faq || ""); break;
      case "services": setModalValue(knowledge?.services || ""); break;
      case "extra_notes": setModalValue(knowledge?.extra_notes || ""); break;
    }
  };

  // Save modal
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
          const { data } = await supabase
            .from("knowledge")
            .insert({ agent_id: agent.id, ...knowledgeFields })
            .select("id, address, hours, faq, services, extra_notes, updated_at")
            .single();
          if (data) setKnowledge(data);
        }
      }

      toast.success("✅ Saved");
      setActiveModal(null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [agent, knowledge, activeModal, modalValue, modalToggle]);

  // Insert variable chip into greeting textarea
  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setModalValue((v) => v + variable);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = modalValue.substring(0, start) + variable + modalValue.substring(end);
    setModalValue(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Completion meter
  const completionFields = [
    { label: "Business Name", filled: !!agent?.business_name, modal: "company" as ModalType },
    { label: "Industry", filled: !!agent?.industry, modal: "industry" as ModalType },
    { label: "Greeting", filled: !!agent?.greeting, modal: "greeting" as ModalType },
    { label: "Voice", filled: !!agent?.voice, modal: "voice" as ModalType },
    { label: "Address", filled: !!knowledge?.address, modal: "address" as ModalType },
    { label: "Opening Hours", filled: !!knowledge?.hours, modal: "hours" as ModalType },
    { label: "FAQ", filled: !!knowledge?.faq, modal: "faq" as ModalType },
    { label: "Services", filled: !!knowledge?.services, modal: "services" as ModalType },
  ];
  const filledCount = completionFields.filter((f) => f.filled).length;
  const totalCount = completionFields.length;

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Skeleton className="h-16 w-full" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 border-t border-border">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground text-sm">No agent found. Complete onboarding first.</p>
        <button onClick={() => navigate("/app/onboarding")} className="text-primary text-sm font-semibold">
          Go to Onboarding →
        </button>
      </div>
    );
  }

  const isActive = agent.status === "active";
  const voxNumber = agent.phone_number || "+91 98765 43210";

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <div className="max-w-[680px] mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Your Agent</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Customize how your Vox handles calls</p>
          </div>
          <a
            href={`tel:${voxNumber.replace(/\s/g, "")}`}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" /> Test Call
          </a>
        </div>

        {/* Status Banner */}
        {isActive ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-lg">✅</span>
            <p className="text-sm font-semibold text-emerald-400">Your Vox agent is live</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-semibold text-yellow-400">Complete your setup to go live</p>
            </div>
            <button onClick={() => navigate("/app/onboarding")} className="text-xs font-semibold text-yellow-300 hover:text-yellow-200">
              Complete Setup →
            </button>
          </div>
        )}

        {/* Section 1: Preferences */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 bg-blue-500/10 border-b border-border flex items-center gap-3">
            <span className="text-lg">💙</span>
            <div>
              <p className="text-sm font-bold text-foreground">Preferences</p>
              <p className="text-xs text-muted-foreground">Customize how your Vox introduces itself, speaks, and closes each call</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            <SettingRow
              icon="💬" label="Greeting Message"
              value={agent.greeting ? (agent.greeting.length > 40 ? agent.greeting.slice(0, 40) + "..." : agent.greeting) : undefined}
              onClick={() => openModal("greeting")}
            />
            <SettingRow
              icon="🎙️" label="Voice"
              value={voiceOptions.find((v) => v.value === agent.voice)?.label}
              onClick={() => openModal("voice")}
            />
            <SettingRow
              icon="⚡" label="Talk Speed"
              value={speedOptions.find((s) => s.value === agent.talk_speed)?.label}
              onClick={() => openModal("speed")}
            />
            <SettingRow
              icon="🌐" label="Primary Language"
              value={languages.find((l) => l.value === agent.language_primary)?.label}
              onClick={() => openModal("language")}
            />
          </div>
        </div>

        {/* Section 2: Knowledge */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 bg-primary/10 border-b border-border flex items-center gap-3">
            <span className="text-lg">📗</span>
            <div>
              <p className="text-sm font-bold text-foreground">Knowledge</p>
              <p className="text-xs text-muted-foreground">Business information Vox uses to answer calls</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            <SettingRow icon="🏢" label="Company Name" value={agent.business_name} onClick={() => openModal("company")} />
            <SettingRow icon="🏷️" label="Industry" value={industries.find((i) => i.value === agent.industry)?.label} onClick={() => openModal("industry")} />
            <SettingRow icon="📍" label="Address" value={knowledge?.address} onClick={() => openModal("address")} />
            <SettingRow icon="💬" label="WhatsApp for Summaries" value={agent.owner_whatsapp || undefined} onClick={() => openModal("whatsapp")} />
            <SettingRow icon="🕐" label="Opening Hours" value={knowledge?.hours} onClick={() => openModal("hours")} />
            <SettingRow icon="📖" label="FAQ" value={knowledge?.faq ? (knowledge.faq.length > 40 ? knowledge.faq.slice(0, 40) + "..." : knowledge.faq) : undefined} onClick={() => openModal("faq")} />
            <SettingRow icon="🛒" label="Products & Services" value={knowledge?.services ? (knowledge.services.length > 40 ? knowledge.services.slice(0, 40) + "..." : knowledge.services) : undefined} onClick={() => openModal("services")} />
            <SettingRow icon="📝" label="Additional Knowledge" value={knowledge?.extra_notes ? (knowledge.extra_notes.length > 40 ? knowledge.extra_notes.slice(0, 40) + "..." : knowledge.extra_notes) : undefined} onClick={() => openModal("extra_notes")} />
          </div>
          {knowledge?.updated_at && (
            <p className="px-5 py-3 text-[11px] text-muted-foreground border-t border-border">
              Last updated: {timeAgo(knowledge.updated_at)}
            </p>
          )}
        </div>

        {/* Completion Meter */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Agent Setup: {filledCount}/{totalCount} fields complete</p>
            <span className="text-xs text-muted-foreground">{Math.round((filledCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(filledCount / totalCount) * 100}%` }}
            />
          </div>
          {filledCount < totalCount && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Complete your setup to improve Vox's accuracy:</p>
              <div className="flex flex-wrap gap-2">
                {completionFields.filter((f) => !f.filled).map((f) => (
                  <button
                    key={f.label}
                    onClick={() => openModal(f.modal)}
                    className="text-xs text-primary hover:underline"
                  >
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-md md:rounded-2xl rounded-t-2xl bg-card border border-border p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{getModalTitle(activeModal)}</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {activeModal === "greeting" && (
              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Thank you for calling..."
                />
                <div className="flex flex-wrap gap-2">
                  {["{{business_name}}", "{{industry}}", "{{hours}}"].map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeModal === "voice" && (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {voiceOptions.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setModalValue(v.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                      modalValue === v.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="text-muted-foreground text-xs">▶️</span>
                  </button>
                ))}
              </div>
            )}

            {activeModal === "speed" && (
              <div className="flex gap-2">
                {speedOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setModalValue(s.value)}
                    className={`flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl border text-sm transition-colors ${
                      modalValue === s.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-[10px]">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {activeModal === "language" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {languages.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setModalValue(l.value)}
                      className={`px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                        modalValue === l.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                  <div>
                    <p className="text-sm text-foreground">Auto-detect caller's language</p>
                    <p className="text-[11px] text-muted-foreground">Recommended — Vox adapts mid-call</p>
                  </div>
                  <Switch checked={modalToggle} onCheckedChange={setModalToggle} />
                </div>
              </div>
            )}

            {activeModal === "industry" && (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {industries.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setModalValue(i.value)}
                    className={`px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                      modalValue === i.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            )}

            {activeModal === "company" && (
              <input
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Your business name"
              />
            )}

            {activeModal === "address" && (
              <input
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Full address"
              />
            )}

            {activeModal === "whatsapp" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground bg-secondary px-3 py-3 rounded-xl border border-border">+91</span>
                <input
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  className="flex-1 rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="9876543210"
                />
              </div>
            )}

            {activeModal === "hours" && (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={"Mon-Sat: 9am to 7pm\nSunday: Closed"}
              />
            )}

            {activeModal === "faq" && (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                rows={6}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={"Q: What are your charges?\nA: First consultation is ₹500\n\nQ: Do you take insurance?\nA: Yes, we accept..."}
              />
            )}

            {activeModal === "services" && (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                rows={5}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="List your main services and prices"
              />
            )}

            {activeModal === "extra_notes" && (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                rows={5}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Anything else Vox should know — parking info, special instructions, etc."
              />
            )}

            {/* Save button */}
            <button
              onClick={saveModal}
              disabled={saving}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ── Sub-components ──────────────────────────────────────

const SettingRow = ({ icon, label, value, onClick }: { icon: string; label: string; value?: string | null; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/50 transition-colors">
    <span className="text-base">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className={`text-xs truncate mt-0.5 ${value ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}>
        {value || "Not set — tap to add"}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

const getModalTitle = (type: ModalType): string => {
  const titles: Record<string, string> = {
    greeting: "Greeting Message",
    voice: "Voice",
    speed: "Talk Speed",
    language: "Primary Language",
    company: "Company Name",
    industry: "Industry",
    address: "Address",
    whatsapp: "WhatsApp for Summaries",
    hours: "Opening Hours",
    faq: "FAQ",
    services: "Products & Services",
    extra_notes: "Additional Knowledge",
  };
  return titles[type || ""] || "";
};

export default AgentPage;
