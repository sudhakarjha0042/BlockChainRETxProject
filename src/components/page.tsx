import Header from './header'
import Hero from './hero'
import Features from './features'
import HowItWorks from './how-it-works'
import CTA from './cta'
import Footer from './footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

