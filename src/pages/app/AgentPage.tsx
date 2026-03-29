import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

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

const voices = [
  { value: "female_hindi", label: "Female (Hindi)" },
  { value: "male_hindi", label: "Male (Hindi)" },
  { value: "female_english", label: "Female (English)" },
  { value: "male_english", label: "Male (English)" },
];

const speeds = [
  { value: "slow", label: "Slow" },
  { value: "natural", label: "Natural" },
  { value: "fast", label: "Fast" },
];

const AgentPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [knowledgeId, setKnowledgeId] = useState<string | null>(null);

  // Agent fields
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [greeting, setGreeting] = useState("");
  const [voice, setVoice] = useState("female_hindi");
  const [talkSpeed, setTalkSpeed] = useState("natural");
  const [languagePrimary, setLanguagePrimary] = useState("hindi");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");

  // Knowledge fields
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [faq, setFaq] = useState("");
  const [services, setServices] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (agent) {
        setAgentId(agent.id);
        setBusinessName(agent.business_name || "");
        setIndustry(agent.industry || "");
        setGreeting(agent.greeting || "");
        setVoice(agent.voice || "female_hindi");
        setTalkSpeed(agent.talk_speed || "natural");
        setLanguagePrimary(agent.language_primary || "hindi");
        setOwnerWhatsapp(agent.owner_whatsapp?.replace("+91", "") || "");

        // Load knowledge
        const { data: knowledge } = await supabase
          .from("knowledge")
          .select("*")
          .eq("agent_id", agent.id)
          .maybeSingle();

        if (knowledge) {
          setKnowledgeId(knowledge.id);
          setAddress(knowledge.address || "");
          setHours(knowledge.hours || "");
          setFaq(knowledge.faq || "");
          setServices(knowledge.services || "");
          setExtraNotes(knowledge.extra_notes || "");
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await supabase
        .from("agents")
        .update({
          business_name: businessName.trim() || null,
          industry: industry || null,
          greeting: greeting.trim() || null,
          voice,
          talk_speed: talkSpeed,
          language_primary: languagePrimary,
          owner_whatsapp: ownerWhatsapp.trim() ? `+91${ownerWhatsapp.replace(/\D/g, "")}` : null,
        })
        .eq("id", agentId);

      const knowledgeData = {
        agent_id: agentId,
        address: address.trim() || null,
        hours: hours.trim() || null,
        faq: faq.trim() || null,
        services: services.trim() || null,
        extra_notes: extraNotes.trim() || null,
      };

      if (knowledgeId) {
        await supabase.from("knowledge").update(knowledgeData).eq("id", knowledgeId);
      } else {
        const { data } = await supabase.from("knowledge").insert(knowledgeData).select("id").single();
        if (data) setKnowledgeId(data.id);
      }

      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const Field = ({ label, value, empty }: { label: string; value: string; empty?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${value ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
        {value || empty || "Not set — tap to add"}
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Your Agent</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure your AI receptionist</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
        </Button>
      </div>

      {/* Quick overview */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-0">
        <Field label="Company Name" value={businessName} />
        <Field label="Industry" value={industries.find(i => i.value === industry)?.label || industry} />
        <Field label="Language" value={languages.find(l => l.value === languagePrimary)?.label || languagePrimary} />
        <Field label="Voice" value={voices.find(v => v.value === voice)?.label || voice} />
        <Field label="Talk Speed" value={speeds.find(s => s.value === talkSpeed)?.label || talkSpeed} />
        <Field label="WhatsApp" value={ownerWhatsapp ? `+91 ${ownerWhatsapp}` : ""} />
        <Field label="Address" value={address} />
        <Field label="Opening Hours" value={hours} />
      </div>

      {/* Edit sections */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Voice & Language</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Greeting</Label>
            <Textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={3} placeholder="Thank you for calling..." />
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {voices.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Talk Speed</Label>
            <Select value={talkSpeed} onValueChange={setTalkSpeed}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {speeds.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Primary Language</Label>
            <Select value={languagePrimary} onValueChange={setLanguagePrimary}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Business Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {industries.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Number</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">+91</span>
              <Input value={ownerWhatsapp} onChange={e => setOwnerWhatsapp(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Knowledge Base</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Opening Hours</Label>
            <Textarea value={hours} onChange={e => setHours(e.target.value)} rows={2} placeholder="Mon-Sat: 9 AM - 8 PM" />
          </div>
          <div className="space-y-2">
            <Label>FAQ</Label>
            <Textarea value={faq} onChange={e => setFaq(e.target.value)} rows={3} placeholder="Common customer questions..." />
          </div>
          <div className="space-y-2">
            <Label>Services</Label>
            <Textarea value={services} onChange={e => setServices(e.target.value)} rows={3} placeholder="What services do you offer?" />
          </div>
          <div className="space-y-2">
            <Label>Extra Notes</Label>
            <Textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)} rows={3} placeholder="Anything else Vox should know" />
          </div>
        </div>
      </div>

      <div className="pb-8">
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
};

export default AgentPage;
