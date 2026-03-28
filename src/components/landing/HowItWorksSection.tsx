const steps = [
  {
    title: "Enter your business phone number",
    sub: "We look you up on Google Maps and learn your business automatically",
  },
  {
    title: "Choose your language",
    sub: "Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia, or English. Vox auto-detects mid-call too.",
  },
  {
    title: "Hear Vox in action",
    sub: "Call the demo number and listen for yourself. It sounds like a real person.",
  },
  {
    title: "Forward your calls to Vox",
    sub: "No need to change your number. Just forward calls when you're busy.",
  },
  {
    title: "Get instant summaries",
    sub: "Vox sends you WhatsApp + SMS + email after every call with full details.",
  },
];

const HowItWorksSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Get Started in 5 Minutes
        </h2>
        <p className="text-muted-foreground text-lg">No code required</p>
      </div>

      <div className="max-w-2xl mx-auto relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-10">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-6 relative">
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                {i + 1}
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
