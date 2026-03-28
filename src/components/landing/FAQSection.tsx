import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What happens after Vox takes a call?",
    a: "After each call, you instantly receive a WhatsApp message, SMS, and email with the caller's name, what they need, their contact number, and a full transcript. You can call them back to confirm.",
  },
  {
    q: "Is Vox really ready in 5 minutes?",
    a: "Yes. Enter your phone number, we auto-fill your business details from Google Maps, you pick your language, and Vox is live. No code, no setup calls needed.",
  },
  {
    q: "Do I need to change my business number?",
    a: "No. Your customers keep calling your existing number. You simply set up call forwarding to Vox when you're busy or after hours. One USSD code does it.",
  },
  {
    q: "Which Indian languages does Vox support?",
    a: "Vox supports Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, and English — 11 languages total. Vox also auto-detects the language mid-call, so your callers never need to select anything.",
  },
  {
    q: "How does WhatsApp summary work?",
    a: "After every call, Vox sends a structured summary to your WhatsApp number with: caller number, what they need, urgency level, and the full conversation transcript.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days free, no credit card required. You get full access to all features during the trial.",
  },
];

const FAQSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-6 max-w-2xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Let's Clear Things Up
        </h2>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-primary/30"
          >
            <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
