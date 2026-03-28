const reviews = [
  {
    name: "Rajesh Kumar",
    role: "HVAC Business, Delhi",
    stars: 5,
    text: "Mujhe pehle bohot calls miss hoti thi. Ab Vox sab handle kar leta hai aur WhatsApp pe bhej deta hai. Best investment.",
  },
  {
    name: "Priya Nair",
    role: "Salon Owner, Kochi",
    stars: 5,
    text: "My customers call in Malayalam and Vox understands perfectly. Bookings have increased 40% since I started using it.",
  },
  {
    name: "Suresh Patel",
    role: "Coaching Center, Ahmedabad",
    stars: 5,
    text: "Admission season mein thousands of calls aate the. Ab Vox sab handle karta hai. Life saver.",
  },
  {
    name: "Dr. Anita Sharma",
    role: "Clinic, Bangalore",
    stars: 5,
    text: "Patients call in Kannada and Hindi both. Vox handles both without any issues. My receptionist now only handles in-person patients.",
  },
];

const ReviewsSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          What Business Owners Are Saying
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {reviews.map((r) => (
          <div
            key={r.name}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-1 mb-3 text-primary">
              {Array.from({ length: r.stars }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            <p className="text-sm text-foreground/90 mb-4 leading-relaxed italic">
              "{r.text}"
            </p>
            <div>
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ReviewsSection;
