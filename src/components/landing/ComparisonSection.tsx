const rows = [
  { feature: "Available 24/7", vox: true, receptionist: false },
  { feature: "Speaks all Indian languages", vox: true, receptionist: false },
  { feature: "Ready in 5 minutes", vox: true, receptionist: false },
  { feature: "Instant WhatsApp + SMS summary", vox: true, receptionist: false },
  { feature: "Handles multiple calls simultaneously", vox: true, receptionist: false },
  { feature: "No training needed", vox: true, receptionist: false },
  { feature: "No sick days or holidays", vox: true, receptionist: false },
];

const ComparisonSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Why pay ₹25,000/month for a receptionist?
        </h2>
        <p className="text-muted-foreground text-lg">
          Vox does the same job. Costs 60x less.
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 text-center font-semibold text-sm border-b border-border">
          <div className="p-4" />
          <div className="p-4 text-primary">Vox 🟢</div>
          <div className="p-4 text-destructive">Receptionist ❌</div>
        </div>
        {/* Price row */}
        <div className="grid grid-cols-3 text-center border-b border-border">
          <div className="p-4 text-left text-sm font-medium">Price</div>
          <div className="p-4 text-primary font-bold">₹999/mo</div>
          <div className="p-4 text-muted-foreground">₹25,000/mo</div>
        </div>
        {/* Feature rows */}
        {rows.map((r) => (
          <div
            key={r.feature}
            className="grid grid-cols-3 text-center border-b border-border last:border-0"
          >
            <div className="p-4 text-left text-sm">{r.feature}</div>
            <div className="p-4 text-primary">✓</div>
            <div className="p-4 text-destructive">✗</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ComparisonSection;
