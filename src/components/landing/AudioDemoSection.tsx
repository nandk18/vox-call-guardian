const demos = [
  { emoji: "🏥", industry: "Clinic", lang: "Hindi", duration: "1:02" },
  { emoji: "💇", industry: "Salon", lang: "Tamil", duration: "0:48" },
  { emoji: "🔧", industry: "HVAC", lang: "Telugu", duration: "0:54" },
  { emoji: "📚", industry: "Coaching", lang: "English", duration: "0:51" },
];

const WaveformBars = () => (
  <div className="flex items-center gap-0.5 h-8 flex-1">
    {Array.from({ length: 30 }).map((_, i) => (
      <div
        key={i}
        className="w-1 bg-primary/40 rounded-full"
        style={{
          height: `${Math.random() * 100}%`,
          minHeight: 4,
        }}
      />
    ))}
  </div>
);

const AudioDemoSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Hear Vox in Action
        </h2>
        <p className="text-muted-foreground text-lg">
          Real calls. Real conversations.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {demos.map((d) => (
          <div
            key={d.industry}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{d.emoji}</span>
              <span className="font-semibold text-sm">{d.industry}</span>
              <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {d.lang}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity">
                ▶
              </button>
              <WaveformBars />
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {d.duration}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AudioDemoSection;
