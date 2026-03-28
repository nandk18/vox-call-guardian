import { useState } from "react";

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
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            One Simple Plan. No Surprises.
          </h2>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 mt-4 mb-8">
            <span
              className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                yearly ? "bg-primary" : "bg-border"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform ${
                  yearly ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              Yearly{" "}
              <span className="text-primary text-xs font-semibold">
                Save 40%
              </span>
            </span>
          </div>
        </div>

        {/* Scarcity banner */}
        <div className="max-w-lg mx-auto mb-6 text-center">
          <div className="inline-block px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            🎉 Limited offer: First 100 businesses get 50% off — applied
            automatically at checkout
          </div>
        </div>

        {/* Plan card */}
        <div className="max-w-md mx-auto bg-card border-2 border-primary rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-2">Unlimited Plan</h3>
          <div className="mb-6">
            <span className="text-4xl font-black">
              ₹{yearly ? "599" : "999"}
            </span>
            <span className="text-muted-foreground">/month</span>
            {yearly && (
              <p className="text-sm text-muted-foreground mt-1">
                Billed ₹7,188/year
              </p>
            )}
          </div>

          <a
            href="#"
            className="block w-full text-center py-3.5 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity mb-2"
          >
            Start Free 14-Day Trial
          </a>
          <p className="text-center text-xs text-muted-foreground mb-6">
            No credit card needed
          </p>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Cancel anytime. No contracts. Keep your number.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
