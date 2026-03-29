import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Phone, ChevronRight, Pencil, Check } from "lucide-react";
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

const MOCK_BUSINESS = {
  address: "42 MG Road, Indiranagar, Bangalore 560038",
  phone: "+91 80 2345 6789",
  hours: "Mon–Sat: 9:00 AM – 8:00 PM\nSun: 10:00 AM – 2:00 PM",
};

const VOX_NUMBER = "+91 98765 43210";

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [hinglish, setHinglish] = useState(true);

  // Step 2
  const [loading2, setLoading2] = useState(true);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(MOCK_BUSINESS.address);
  const [hours, setHours] = useState(MOCK_BUSINESS.hours);
  const [faq, setFaq] = useState("");
  const [services, setServices] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // Step 3
  const [whatsapp, setWhatsapp] = useState("");

  // Pre-fill business name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.business_name) {
      setBusinessName(user.user_metadata.business_name);
    }
  }, [user]);

  // Simulate Google Maps lookup on step 2
  useEffect(() => {
    if (step === 2) {
      setLoading2(true);
      const t = setTimeout(() => setLoading2(false), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleStep1Next = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    setSaving(true);
    try {
      // Upsert agent row
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("agents")
          .update({
            business_name: businessName.trim(),
            phone_number: phoneNumber.trim() ? `+91${phoneNumber.replace(/\D/g, "")}` : null,
            industry,
            language_primary: language,
            language_auto_detect: hinglish,
          })
          .eq("id", existing.id);
        setAgentId(existing.id);
      } else {
        const { data: newAgent } = await supabase
          .from("agents")
          .insert({
            user_id: user!.id,
            business_name: businessName.trim(),
            phone_number: phoneNumber.trim() ? `+91${phoneNumber.replace(/\D/g, "")}` : null,
            industry,
            language_primary: language,
            language_auto_detect: hinglish,
          })
          .select("id")
          .single();
        if (newAgent) setAgentId(newAgent.id);
      }
      setStep(2);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      // Upsert knowledge
      const { data: existing } = await supabase
        .from("knowledge")
        .select("id")
        .eq("agent_id", agentId)
        .maybeSingle();

      const knowledgeData = {
        agent_id: agentId,
        address: address.trim(),
        hours: hours.trim(),
        faq: faq.trim(),
        services: services.trim(),
        extra_notes: extraNotes.trim(),
      };

      if (existing) {
        await supabase.from("knowledge").update(knowledgeData).eq("id", existing.id);
      } else {
        await supabase.from("knowledge").insert(knowledgeData);
      }
      setStep(3);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await supabase
        .from("agents")
        .update({
          owner_whatsapp: whatsapp.trim() ? `+91${whatsapp.replace(/\D/g, "")}` : null,
          onboarding_complete: true,
          status: "active",
        })
        .eq("id", agentId);
      navigate("/app/inbox");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Create agent if not exists, mark onboarding complete
    if (!agentId && user) {
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("agents").update({ onboarding_complete: true }).eq("id", existing.id);
      } else {
        await supabase.from("agents").insert({
          user_id: user.id,
          business_name: businessName.trim() || user.user_metadata?.business_name || "My Business",
          onboarding_complete: true,
        });
      }
    } else if (agentId) {
      await supabase.from("agents").update({ onboarding_complete: true }).eq("id", agentId);
    }
    navigate("/app/inbox");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm text-muted-foreground font-medium">
          Step {step} of 3
        </span>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now →
        </button>
      </div>

      {/* Progress */}
      <div className="px-6">
        <Progress value={(step / 3) * 100} className="h-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-8 pb-16 px-4">
        <div className="w-full max-w-[520px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Let's set up your Vox</h1>
                <p className="text-muted-foreground mt-1">Takes less than 5 minutes</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="biz-name">Business Name</Label>
                  <Input
                    id="biz-name"
                    placeholder="e.g. Sharma Dental Clinic"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biz-phone">Business Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">
                      +91
                    </span>
                    <Input
                      id="biz-phone"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Vox will speak in this language
                  </p>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Also understand mixed/Hinglish speech
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Handles code-switching between Hindi and English
                    </p>
                  </div>
                  <Switch checked={hinglish} onCheckedChange={setHinglish} />
                </div>
              </div>

              <Button
                onClick={handleStep1Next}
                disabled={saving}
                className="w-full h-12 rounded-full text-base font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">We found your business!</h1>
                <p className="text-muted-foreground mt-1">Vox learned this from Google Maps</p>
              </div>

              {loading2 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Searching Google Maps…</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Auto-filled card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                        ✅ Auto-filled from Google Maps
                      </span>
                    </div>

                    {editing ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Business Name</Label>
                          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Address</Label>
                          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone</Label>
                          <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Opening Hours</Label>
                          <Textarea value={hours} onChange={(e) => setHours(e.target.value)} rows={3} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground">{businessName}</p>
                        <p className="text-sm text-muted-foreground">{address}</p>
                        <p className="text-sm text-muted-foreground">{phoneNumber ? `+91 ${phoneNumber}` : MOCK_BUSINESS.phone}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{hours}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setEditing(!editing)}
                      className="flex-1"
                    >
                      {editing ? <><Check className="w-4 h-4" /> Done editing</> : <><Pencil className="w-4 h-4" /> Edit details</>}
                    </Button>
                    <Button
                      onClick={handleStep2Next}
                      disabled={saving}
                      className="flex-1 rounded-full"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Looks good! <ChevronRight className="w-4 h-4" /></>}
                    </Button>
                  </div>

                  {/* Knowledge fields */}
                  <div className="space-y-4 border-t border-border pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="faq">FAQ</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        What are your most common customer questions?
                      </p>
                      <Textarea
                        id="faq"
                        placeholder="e.g. Do you take walk-ins? What are your consultation fees?"
                        value={faq}
                        onChange={(e) => setFaq(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="services">Services</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        What services do you offer?
                      </p>
                      <Textarea
                        id="services"
                        placeholder="e.g. Root canal, teeth whitening, dental implants"
                        value={services}
                        onChange={(e) => setServices(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Anything else Vox should know about your business"
                        value={extraNotes}
                        onChange={(e) => setExtraNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Your Vox is live! 🎉</h1>
                <p className="text-muted-foreground mt-1">Here's your dedicated Vox number</p>
              </div>

              {/* Big number card */}
              <div className="rounded-2xl bg-primary/10 border border-primary/30 p-8 text-center space-y-1">
                <p className="text-3xl font-bold text-primary tracking-wide">{VOX_NUMBER}</p>
                <p className="text-sm text-primary/70">(Your Vox number)</p>
              </div>

              {/* Forwarding instructions */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Share this number with customers OR forward your existing number to it
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground text-xs uppercase tracking-wider">USSD codes for call forwarding:</p>
                  <div className="grid gap-1.5 text-xs font-mono bg-secondary/50 rounded-lg p-3">
                    <p><span className="text-foreground">Airtel:</span> *67*+9198765XXXXX#</p>
                    <p><span className="text-foreground">Jio:</span> **67*+9198765XXXXX#</p>
                    <p><span className="text-foreground">BSNL:</span> **61*+9198765XXXXX#</p>
                  </div>
                </div>
              </div>

              {/* Test call */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-full text-base"
                onClick={() => window.open(`tel:${VOX_NUMBER.replace(/\s/g, "")}`, "_self")}
              >
                <Phone className="w-4 h-4" /> Call Vox now to test
              </Button>

              {/* WhatsApp field */}
              <div className="space-y-2">
                <Label>📱 Where should we send call summaries?</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">
                    +91
                  </span>
                  <Input
                    placeholder="WhatsApp number"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Finish CTA */}
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="w-full h-14 rounded-full text-lg font-semibold"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Go to my Inbox <ChevronRight className="w-5 h-5" /></>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
