const FinalCTASection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold mb-6">
        Never Miss a Call or Customer
      </h2>
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <a
          href="#pricing"
          className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity"
        >
          Try Vox Free
        </a>
        <a
          href="mailto:customer@voxai.in"
          className="px-8 py-3.5 border border-border text-foreground font-semibold rounded-full hover:bg-secondary transition-colors"
        >
          Contact Us
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        No credit card required. Cancel anytime.
      </p>
    </div>
  </section>
);

export default FinalCTASection;
