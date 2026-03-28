import heroPhone from "@/assets/hero-phone.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden">
      {/* Green glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full glow-green opacity-40 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm text-secondary-foreground mb-6">
              🇮🇳 Made for Indian Businesses
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              Never Miss a Customer Call.{" "}
              <span className="text-gradient-green">Ever.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Vox answers your phone 24/7 in Hindi, Tamil, Telugu, Kannada,
              Bengali, Marathi and 6 more Indian languages — then sends you the
              summary instantly on WhatsApp.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <a
                href="#pricing"
                className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity text-base"
              >
                Try Free for 14 Days
              </a>
              <a
                href="tel:+919876543210"
                className="px-8 py-3.5 border border-border text-foreground font-semibold rounded-full hover:bg-secondary transition-colors text-base"
              >
                📞 Call Vox Live → +91 98765 43210
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>✓ No credit card needed</span>
              <span>✓ Setup in 5 minutes</span>
              <span>✓ Cancel anytime</span>
              <span>✓ IT Act & DPDP Compliant</span>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <img
              src={heroPhone}
              alt="Vox AI receptionist app showing call summary"
              width={500}
              height={640}
              className="w-full max-w-md drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
