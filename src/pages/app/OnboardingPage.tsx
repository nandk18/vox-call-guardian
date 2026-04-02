import { useState, useEffect, useRef, useCallback } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Phone, ChevronRight, ChevronLeft, Check, Search, X, Plus, MapPin, Building } from "lucide-react";
import { loadGoogleMaps } from "@/utils/loadGoogleMaps";
import { cleanIndianPhone, formatIndianPhone, generateVoxNumber } from "@/utils/phoneUtils";
import { getMixedLanguageInfo } from "@/utils/languageUtils";
import { compileAgentKnowledge } from "@/utils/agentKnowledge";
import { toast } from "sonner";
import ForwardingCodes from "@/components/app/ForwardingCodes";
import OnboardingSuccess from "@/components/app/OnboardingSuccess";

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

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  opening_hours?: { weekday_text?: string[] };
}

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [voxNumber, setVoxNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [hinglish, setHinglish] = useState(true);

  // Google Places
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [placesAvailable, setPlacesAvailable] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const placesDiv = useRef<HTMLDivElement>(null);

  // Step 2
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [faq, setFaq] = useState("");
  const [services, setServices] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // Step 3
  const [whatsapp, setWhatsapp] = useState("");

  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => { setMapsLoaded(true); setPlacesAvailable(true); })
      .catch(() => { setMapsLoaded(false); setManualEntry(true); });
  }, []);

  useEffect(() => {
    if (!mapsLoaded) return;
    const w = window as any;
    if (w.google?.maps?.places) {
      autocompleteService.current = new w.google.maps.places.AutocompleteService();
      if (placesDiv.current) {
        placesService.current = new w.google.maps.places.PlacesService(placesDiv.current);
      }
    }
  }, [mapsLoaded]);

  useEffect(() => {
    if (user?.user_metadata?.business_name) setBusinessName(user.user_metadata.business_name);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: agent } = await supabase
        .from("agents")
        .select("id, business_name, industry, language_primary, language_auto_detect, phone_number, owner_whatsapp, vox_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (agent) {
        setAgentId(agent.id);
        if (agent.business_name) setBusinessName(agent.business_name);
        if (agent.industry) setIndustry(agent.industry);
        if (agent.language_primary) setLanguage(agent.language_primary);
        if (agent.language_auto_detect !== null) setHinglish(agent.language_auto_detect);
        if (agent.phone_number) setPhoneNumber(cleanIndianPhone(agent.phone_number));
        if (agent.owner_whatsapp) setWhatsapp(cleanIndianPhone(agent.owner_whatsapp));
        if (agent.vox_number) setVoxNumber(agent.vox_number);
      }
    })();
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length < 3 || !autocompleteService.current) { setPredictions([]); setShowDropdown(false); return; }
    autocompleteService.current.getPlacePredictions(
      { input: query, componentRestrictions: { country: "in" }, types: ["establishment"] },
      (results: PlacePrediction[] | null) => { setPredictions(results?.slice(0, 5) || []); setShowDropdown(true); setHighlightedIndex(-1); }
    );
  }, []);

  const selectPlace = (placeId: string) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId, fields: ["name", "formatted_address", "formatted_phone_number", "opening_hours"] },
      (place: PlaceDetails | null) => {
        if (place) {
          setSelectedPlace(place);
          setBusinessName(place.name || "");
          setAddress(place.formatted_address || "");
          setPhoneNumber(cleanIndianPhone(place.formatted_phone_number || ""));
          setHours(place.opening_hours?.weekday_text?.join("\n") || "");
          setShowDropdown(false);
          setSearchQuery("");
        }
      }
    );
  };

  const clearSelection = () => {
    setSelectedPlace(null); setBusinessName(""); setAddress(""); setPhoneNumber(""); setHours(""); setSearchQuery(""); setManualEntry(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = predictions.length + 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex((p) => Math.min(p + 1, totalItems - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      if (highlightedIndex < predictions.length) selectPlace(predictions[highlightedIndex].place_id);
      else { setManualEntry(true); setShowDropdown(false); }
    } else if (e.key === "Escape") setShowDropdown(false);
  };

  const mixedInfo = getMixedLanguageInfo(language);

  const handleStep1Next = async () => {
    if (!businessName.trim()) { toast.error("Please enter your business name"); return; }
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("agents").select("id, vox_number").eq("user_id", user!.id).maybeSingle();
      const agentData: any = {
        business_name: businessName.trim(),
        phone_number: phoneNumber.trim() ? `+91${phoneNumber.replace(/\D/g, "")}` : null,
        industry,
        language_primary: language,
        language_auto_detect: hinglish,
      };
      if (existing) {
        await supabase.from("agents").update(agentData).eq("id", existing.id);
        setAgentId(existing.id);
        if (existing.vox_number) setVoxNumber(existing.vox_number);
        else {
          const vn = generateVoxNumber();
          await supabase.from("agents").update({ vox_number: vn }).eq("id", existing.id);
          setVoxNumber(vn);
        }
      } else {
        const vn = generateVoxNumber();
        const { data: newAgent } = await supabase
          .from("agents")
          .insert({ user_id: user!.id, ...agentData, vox_number: vn })
          .select("id")
          .single();
        if (newAgent) { setAgentId(newAgent.id); setVoxNumber(vn); }
      }
      setStep(2);
    } catch { toast.error("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const handleStep2Next = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await supabase.from("agents").update({
        business_name: businessName.trim(),
        phone_number: phoneNumber.trim() ? `+91${phoneNumber.replace(/\D/g, "")}` : null,
        industry, language_primary: language,
      }).eq("id", agentId);

      const { data: existing } = await supabase.from("knowledge").select("id").eq("agent_id", agentId).maybeSingle();
      const knowledgeData = { agent_id: agentId, address: address.trim(), hours: hours.trim(), faq: faq.trim(), services: services.trim(), extra_notes: extraNotes.trim() };
      if (existing) await supabase.from("knowledge").update(knowledgeData).eq("id", existing.id);
      else await supabase.from("knowledge").insert(knowledgeData);
      setStep(3);
    } catch { toast.error("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const handleFinish = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      // Compile knowledge
      const prompt = compileAgentKnowledge(
        { business_name: businessName, industry, language_primary: language, language_auto_detect: hinglish, greeting: null },
        { address, hours, services, faq, extra_notes: extraNotes }
      );
      const defaultGreeting = `Thank you for calling ${businessName.trim()}, how can I help you today?`;
      await supabase.from("agents").update({
        owner_whatsapp: whatsapp.trim() ? `+91${whatsapp.replace(/\D/g, "")}` : null,
        compiled_prompt: prompt,
        greeting: defaultGreeting,
      }).eq("id", agentId);
      setShowSuccess(true);
    } catch { toast.error("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const handleSkip = async () => {
    if (!agentId && user) {
      const { data: existing } = await supabase.from("agents").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) await supabase.from("agents").update({ onboarding_complete: true }).eq("id", existing.id);
      else await supabase.from("agents").insert({ user_id: user.id, business_name: businessName.trim() || "My Business", onboarding_complete: true, vox_number: generateVoxNumber() });
    } else if (agentId) {
      await supabase.from("agents").update({ onboarding_complete: true }).eq("id", agentId);
    }
    navigate("/app/inbox");
  };

  const goToStep = (targetStep: number) => { if (targetStep < step) setStep(targetStep); };

  if (showSuccess && agentId) {
    return <OnboardingSuccess agentId={agentId} voxNumber={voxNumber} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div ref={placesDiv} className="hidden" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-4">
          {step === 1 && <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>}
          {step > 1 && <button onClick={() => setStep(step - 1)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>}
          <span className="text-sm text-muted-foreground font-medium">Step {step} of 3</span>
        </div>
        <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground">Skip for now →</button>
      </div>

      <div className="px-4 md:px-6 flex items-center gap-3">
        <Progress value={(step / 3) * 100} className="h-1.5 flex-1" />
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => goToStep(s)} disabled={s > step}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step ? "bg-primary text-primary-foreground cursor-pointer" : s === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}>
              {s < step ? <Check className="w-3 h-3" /> : s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-8 pb-16 px-4">
        <div className="w-full max-w-[520px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Let's set up your Vox</h1>
                <p className="text-muted-foreground mt-1">Takes less than 5 minutes</p>
              </div>

              <div className="space-y-4">
                {!selectedPlace && !manualEntry && placesAvailable ? (
                  <div className="space-y-2 relative" ref={searchRef}>
                    <Label>Search your business</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Type your business name or address..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleSearchKeyDown} onFocus={() => predictions.length > 0 && setShowDropdown(true)} className="pl-10" />
                    </div>
                    {showDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {predictions.map((p, i) => (
                          <button key={p.place_id} onClick={() => selectPlace(p.place_id)} className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary transition-colors border-b border-border last:border-0 min-h-[52px] ${highlightedIndex === i ? "bg-secondary" : ""}`}>
                            <Building className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.structured_formatting.main_text}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.structured_formatting.secondary_text}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          </button>
                        ))}
                        <button onClick={() => { setManualEntry(true); setShowDropdown(false); }} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary min-h-[52px] ${highlightedIndex === predictions.length ? "bg-secondary" : ""}`}>
                          <Plus className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm text-primary font-medium">My business isn't listed — enter manually</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedPlace ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center"><Check className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedPlace.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedPlace.formatted_address}</p>
                    </div>
                    <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Change</button>
                  </div>
                ) : (
                  <>
                    {!placesAvailable && !manualEntry && (
                      <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" /> Enter details manually
                      </div>
                    )}
                    <div className="space-y-2"><Label htmlFor="biz-name">Business Name</Label><Input id="biz-name" placeholder="e.g. Sharma Dental Clinic" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Address</Label><Input placeholder="Full business address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">+91</span>
                        <Input placeholder="98765 43210" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Opening Hours</Label><Textarea placeholder="Mon-Sat: 9 AM - 8 PM" value={hours} onChange={(e) => setHours(e.target.value)} rows={2} /></div>
                    {manualEntry && <button onClick={() => { setManualEntry(false); clearSelection(); }} className="text-xs text-primary hover:underline">← Try searching again</button>}
                  </>
                )}

                {selectedPlace && <div className="space-y-2"><Label>Business Name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>}

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger><SelectContent>{industries.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <p className="text-xs text-muted-foreground -mt-1">Vox will speak in this language</p>
                  <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{languages.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
                </div>

                {mixedInfo.mixed && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Also understand {mixedInfo.mixed} speech</p>
                      <p className="text-xs text-muted-foreground">Handles {mixedInfo.name} + English code-switching mid-call</p>
                    </div>
                    <Switch checked={hinglish} onCheckedChange={setHinglish} />
                  </div>
                )}
              </div>

              <Button onClick={handleStep1Next} disabled={saving} className="w-full h-12 rounded-full text-base font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">We found your business!</h1>
                <p className="text-muted-foreground mt-1">Confirm your details below</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                <span className="text-xs font-medium bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                  ✅ {selectedPlace ? "Auto-filled from Google Maps" : "Your business details"}
                </span>
                <div className="space-y-2 mt-3">
                  <p className="text-sm"><span className="mr-2">🏢</span><span className="font-semibold text-foreground">{businessName || "—"}</span></p>
                  <p className="text-sm text-muted-foreground"><span className="mr-2">📍</span>{address || "Not set"}</p>
                  <p className="text-sm text-muted-foreground"><span className="mr-2">📞</span>{phoneNumber ? formatIndianPhone(phoneNumber) : "Not set"}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line"><span className="mr-2">🕐</span>{hours || "Not set"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2"><Label>Business Name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">+91</span>
                    <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2"><Label>Opening Hours</Label><Textarea value={hours} onChange={(e) => setHours(e.target.value)} rows={3} /></div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{industries.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{languages.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <div className="space-y-2"><Label>FAQ</Label><p className="text-xs text-muted-foreground -mt-1">What are your most common customer questions?</p><Textarea placeholder="e.g. Do you take walk-ins?" value={faq} onChange={(e) => setFaq(e.target.value)} rows={3} /></div>
                <div className="space-y-2"><Label>Services</Label><Textarea placeholder="e.g. Root canal, teeth whitening" value={services} onChange={(e) => setServices(e.target.value)} rows={3} /></div>
                <div className="space-y-2"><Label>Additional Notes</Label><Textarea placeholder="Anything else Vox should know" value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={3} /></div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={handleStep2Next} disabled={saving} className="flex-1 rounded-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Looks good! <ChevronRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Your Vox is live! 🎉</h1>
                <p className="text-muted-foreground mt-1">Here's your dedicated Vox number</p>
              </div>

              <div className="rounded-2xl bg-primary/10 border border-primary/30 p-8 text-center space-y-1">
                <p className="text-3xl font-bold text-primary tracking-wide">{formatIndianPhone(voxNumber)}</p>
                <p className="text-sm text-primary/70">(Your Vox number)</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">Share this number with customers OR forward your existing number to it</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">USSD codes for call forwarding:</p>
                <ForwardingCodes voxNumber={voxNumber} />
              </div>

              <Button variant="outline" className="w-full h-12 rounded-full text-base" onClick={() => window.open(`tel:${voxNumber.replace(/\s/g, "")}`, "_self")}>
                <Phone className="w-4 h-4" /> Call Vox now to test
              </Button>

              <div className="space-y-2">
                <Label>📱 Where should we send call summaries?</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md border border-input">+91</span>
                  <Input placeholder="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1 h-14 rounded-full text-lg font-semibold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Go to my Inbox <ChevronRight className="w-5 h-5" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
