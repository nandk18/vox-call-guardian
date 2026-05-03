const features = [
  "Unlimited call minutes",
  "Unlimited simultaneous calls",
  "11 Indian languages + auto-detection",
  "WhatsApp + SMS + email summary after every call",
  "Lead qualification & spam filtering",
  "Google Maps auto-setup",
  "Works 24/7 — no breaks, no sick days",
  "Cancel anytime, keep your number",
  "IT Act & DPDP compliant",
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            One Simple Plan. No Surprises.
          </h2>
          <p className="text-muted-foreground">
            Start with a free 14-day trial. No credit card needed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Monthly Card */}
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Monthly</h3>
            <div className="mb-6">
              <span className="text-4xl font-black">₹999</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <a
              href="/signup"
              className="block w-full text-center py-3.5 bg-secondary text-foreground font-semibold rounded-full hover:bg-secondary/80 transition-colors mb-2"
            >
              Start Free Trial
            </a>
            <p className="text-center text-xs text-muted-foreground mb-6">
              No credit card needed
            </p>
            <ul className="space-y-3 mt-auto">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Yearly Card */}
          <div
            className="bg-card rounded-2xl p-8 flex flex-col relative"
            style={{ border: "2px solid #00E5A0" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ backgroundColor: "#00E5A0", color: "#0D0F14" }}>
              🔥 Most Popular — Save 40%
            </div>
            <h3 className="text-xl font-bold mb-2">Yearly</h3>
            <div className="mb-2">
              <span className="text-4xl font-black">₹599</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">₹7,148 billed yearly</p>
            <p className="text-xs text-red-400 line-through mb-6">₹11,988/year</p>
            <a
              href="/signup"
              className="block w-full text-center py-3.5 font-semibold rounded-full hover:opacity-90 transition-opacity mb-2"
              style={{ backgroundColor: "#00E5A0", color: "#0D0F14" }}
            >
              Start Free Trial
            </a>
            <p className="text-center text-xs text-muted-foreground mb-6">
              No credit card needed
            </p>
            <ul className="space-y-3 mt-auto">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Cancel anytime. No contracts. Keep your number.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
