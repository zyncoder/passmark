import { Header } from "@/components/marketing/Header"
import { Hero } from "@/components/marketing/Hero"
import { FeatureStrip } from "@/components/marketing/FeatureStrip"
import { Features } from "@/components/marketing/Features"
import { HowItWorks } from "@/components/marketing/HowItWorks"
import { Footer } from "@/components/marketing/Footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Header />
      <main>
        <Hero />
        <FeatureStrip />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
