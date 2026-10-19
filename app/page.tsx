import { AiInsight } from '@/components/monee/ai-insight'
import { CrossBorder } from '@/components/monee/cross-border'
import { Footer } from '@/components/monee/footer'
import { FutureLab } from '@/components/monee/future-lab'
import { Hero } from '@/components/monee/hero'
import { HowItWorks } from '@/components/monee/how-it-works'
import { Navbar } from '@/components/monee/navbar'
import { Overview } from '@/components/monee/overview'
import { ScenarioProvider } from '@/components/monee/scenario-provider'
import { ScrollReveal } from '@/components/monee/motion'
import { CurrencyClimate, CurrencyClimateProvider, CurrencyGlobe } from '@/components/monee/currency-climate'
import { HomeFeatures, HomeFinalCallToAction } from '@/components/monee/home-features'

export default function Page() {
  return (
    <ScenarioProvider>
      <CurrencyClimateProvider>
      <Navbar />
      <main className="pb-24 md:pb-0">
        <Hero />
        <ScrollReveal><CurrencyGlobe /></ScrollReveal>
        <ScrollReveal><CurrencyClimate /></ScrollReveal>
        <ScrollReveal><Overview /></ScrollReveal>
        <ScrollReveal><HowItWorks /></ScrollReveal>
        <ScrollReveal><FutureLab /></ScrollReveal>
        <HomeFeatures />
        <ScrollReveal delayMs={40}><AiInsight /></ScrollReveal>
        <ScrollReveal><CrossBorder /></ScrollReveal>
        <HomeFinalCallToAction />
      </main>
      <Footer />
      </CurrencyClimateProvider>
    </ScenarioProvider>
  )
}
