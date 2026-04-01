import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import IndustriesSection from "@/components/landing/IndustriesSection";
import AudioDemoSection from "@/components/landing/AudioDemoSection";
import PricingSection from "@/components/landing/PricingSection";
import ReviewsSection from "@/components/landing/ReviewsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

const Index = () => {
  usePageTitle();
  return (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <ComparisonSection />
    <HowItWorksSection />
    <IndustriesSection />
    <AudioDemoSection />
    <PricingSection />
    <ReviewsSection />
    <FAQSection />
    <FinalCTASection />
    <Footer />
  </div>
);

export default Index;
