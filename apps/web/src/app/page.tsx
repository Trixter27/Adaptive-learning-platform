import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PartnerLogos from "@/components/PartnerLogos";
import Features from "@/components/Features";
import ProductShowcase from "@/components/ProductShowcase";
import Steps from "@/components/Steps";
import Testimonials from "@/components/Testimonials";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PartnerLogos />
        <Features />
        <ProductShowcase />
        <Steps />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
