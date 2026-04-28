import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';
import Hero from '../../components/home/Hero';
import Features from '../../components/home/Features';
import Stats from '../../components/home/Stats';
import FeaturedListings from '../../components/home/FeaturedListings';
import Process from '../../components/home/Process';
import Pricing from '../../components/home/Pricing';
import Partners from '../../components/home/Partners';
import ContactSection from '../../components/home/ContactSection';
import ProfessionalSection from '../../components/home/ProfessionalSection';
import CollectorSection from '../../components/home/CollectorSection';
import NetworkCTA from '../../components/home/NetworkCTA';
import TrustBadges from '../../components/home/TrustBadges';
import Testimonials from '../../components/home/Testimonials';

const BG = '#F7F6F2';   // Soft Ivory background
const OS = '#0B0B0B';   // Midnight Black

export default function HomePage() {
  useDocumentTitle('Premium Real Estate Platform');
  return (
    <div className="min-h-screen font-body" style={{ background: BG, color: OS }}>
      {/* Visual Overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none z-[100]" />

      {/* Navigation */}
      <PublicNav />

      <main>
        {/* Section 1: Hero */}
        <Hero />

        {/* Section 2: Stats & Marquee */}
        <Stats />

        {/* Section 3: Features & Trust */}
        <Features />

        {/* Section 4: Featured Listings */}
        <FeaturedListings />

        {/* Section 5: Process */}
        <Process />

        {/* Section 6: For Professionals */}
        <ProfessionalSection />

        {/* Section 7: For Collectors */}
        <CollectorSection />

        {/* Section 8: Pricing — updated introductory pricing */}
        <Pricing />

        {/* Section 9: Partner Network */}
        <Partners />

        {/* Section 10: Social Proof & Trust */}
        <TrustBadges />

        {/* Section 11: Testimonials */}
        <Testimonials />

        {/* Section 12: Contact */}
        <ContactSection />

        {/* Section 13: Final CTA */}
        <NetworkCTA />
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
