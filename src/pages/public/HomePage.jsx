import React from 'react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import Hero from '../../components/home/Hero';
import Features from '../../components/home/Features';
import Stats from '../../components/home/Stats';
import FeaturedListings from '../../components/home/FeaturedListings';
import Process from '../../components/home/Process';
import Pricing from '../../components/home/Pricing';
import ProfessionalSection from '../../components/home/ProfessionalSection';
import CollectorSection from '../../components/home/CollectorSection';
import NetworkCTA from '../../components/home/NetworkCTA';
import TrustBadges from '../../components/home/TrustBadges';

const BG = '#F7F6F2';   // Soft Ivory background
const OS = '#0B0B0B';   // Midnight Black

export default function HomePage() {
  return (
    <div className="min-h-screen font-body" style={{ background: BG, color: OS }}>
      {/* Visual Overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none z-[100]" />

      {/* Navigation */}
      <Navbar />

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



        {/* Section 7: For Professionals */}
        <ProfessionalSection />

        {/* Section 8: For Collectors */}
        <CollectorSection />

        {/* Section 6: Pricing */}
        <Pricing />

        {/* Section 9: Social Proof & Trust */}
        <TrustBadges />

        {/* Section 10: Final CTA */}
        <NetworkCTA />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
