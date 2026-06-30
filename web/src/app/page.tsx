import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ApiShowcase } from "@/components/landing/api-showcase";
import { Pricing } from "@/components/landing/pricing";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="noise-overlay relative min-h-dvh overflow-x-hidden">
      <LandingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <ApiShowcase />
      <Pricing />
      <Cta />
      <Footer />
    </main>
  );
}
