import { useState } from "react";

const industries = [
  { emoji: "🏥", name: "Clinics", desc: "Appointment booking in any language" },
  { emoji: "💇", name: "Salons & Spas", desc: "Never miss a booking call" },
  { emoji: "🏗️", name: "Real Estate", desc: "Qualify leads 24/7" },
  { emoji: "🔧", name: "AC & Appliance Repair", desc: "Capture every job request" },
  { emoji: "📚", name: "Coaching Centers", desc: "Handle admission enquiries" },
  { emoji: "🍽️", name: "Restaurants", desc: "Table reservations on autopilot" },
  { emoji: "🚗", name: "Car Service", desc: "Service booking while you work" },
  { emoji: "⚖️", name: "CA & Tax Consultants", desc: "Handle ITR season call surge" },
  { emoji: "💊", name: "Pharmacies", desc: "Prescription and availability queries" },
  { emoji: "🏠", name: "Home Services", desc: "Plumbing, electrical, cleaning" },
  { emoji: "🏋️", name: "Gyms & Fitness", desc: "Membership enquiries 24/7" },
  { emoji: "🐾", name: "Veterinary Clinics", desc: "Pet care appointment booking" },
];

const IndustriesSection = () => {
  const [search, setSearch] = useState("");
  const filtered = industries.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Built for Indian Businesses
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            From clinics in Chennai to salons in Chandigarh
          </p>
          <input
            type="text"
            placeholder="Search your industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-5 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ind) => (
            <div
              key={ind.name}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <div className="text-3xl mb-3">{ind.emoji}</div>
              <h3 className="font-semibold text-sm mb-1">{ind.name}</h3>
              <p className="text-xs text-muted-foreground">{ind.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button className="text-primary text-sm font-medium hover:underline">
            Show all industries →
          </button>
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;
