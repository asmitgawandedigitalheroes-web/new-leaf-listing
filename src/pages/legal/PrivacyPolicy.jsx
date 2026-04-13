import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import Footer from '../../components/shared/Footer';
import {
  HiShieldCheck,
  HiLockClosed,
  HiEye,
  HiGlobeAlt,
  HiUserGroup,
  HiShare,
  HiClock,
  HiExclamationTriangle,
  HiArrowPathRoundedSquare,
  HiHome,
  HiEnvelope,
} from 'react-icons/hi2';

const P = '#D4AF37';
const S = '#1F4D3A';

const Section = ({ number, icon: Icon, title, children }) => (
  <section>
    <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
      {Icon && <Icon style={{ color: P, flexShrink: 0 }} />}
      {number}. {title}
    </h2>
    <div className="text-slate-600 leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

const Bullet = ({ children }) => (
  <li className="flex items-start gap-2">
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
    <span>{children}</span>
  </li>
);

export default function PrivacyPolicy() {
  return (
    <>
    <PublicNav />
    <div className="min-h-screen bg-slate-50 pt-[80px] py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)]" />
          <HiShieldCheck className="mx-auto h-12 w-12 mb-4" style={{ color: P }} />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-base text-slate-400">New Leaf Vision Inc. — NLVListings</p>
          <p className="mt-1 text-sm text-slate-500">Last updated: April 11, 2026</p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-10 prose prose-slate max-w-none">

          <Section number="1" icon={HiGlobeAlt} title="Data Collection">
            <p>
              We collect information that you provide directly to us, including your name, email address, phone number, business details, and professional licensing information where applicable.
            </p>
            <p>
              We also collect data generated through your use of the Platform, including lead activity, interactions, and performance metrics, for purposes of attribution, routing, and improving platform functionality.
            </p>
          </Section>

          <Section number="2" icon={HiEye} title="Data Usage">
            <p>We use your information to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Provide and operate the NLVListings platform</Bullet>
              <Bullet>Manage leads and facilitate connections between users</Bullet>
              <Bullet>Process subscriptions and payments</Bullet>
              <Bullet>Improve platform performance and user experience</Bullet>
              <Bullet>Maintain platform security and prevent misuse</Bullet>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal or professional data to third-party marketing companies.</p>
            <p>Lead data may be routed to relevant users within the platform as part of its core functionality.</p>
          </Section>

          <Section number="3" icon={HiShare} title="Data Sharing & Third Parties">
            <p>We use trusted third-party services to operate the platform, including but not limited to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Payment processors (e.g., Stripe)</Bullet>
              <Bullet>Cloud infrastructure providers (e.g., Supabase)</Bullet>
              <Bullet>Analytics and performance tools</Bullet>
            </ul>
            <p className="mt-2">
              These providers process data only as necessary to deliver their services and are contractually obligated to protect your information.
            </p>
          </Section>

          <Section number="4" icon={HiLockClosed} title="Data Security">
            <p>
              We implement industry-standard security measures, including SSL encryption and secure database infrastructure.
            </p>
            <p>
              Payment information is handled exclusively by third-party providers and is not stored on our servers.
            </p>
          </Section>

          <Section number="5" icon={HiShieldCheck} title="Cookies & Tracking Technologies">
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Maintain user sessions</Bullet>
              <Bullet>Analyze platform usage and performance</Bullet>
              <Bullet>Improve functionality and user experience</Bullet>
            </ul>
            <p className="mt-2">By using the platform, you consent to the use of these technologies.</p>
          </Section>

          <Section number="6" icon={HiUserGroup} title="Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Access the personal data we hold about you</Bullet>
              <Bullet>Request correction or deletion of your data</Bullet>
              <Bullet>Request a copy (export) of your data</Bullet>
            </ul>
            <p className="mt-2">You may exercise these rights by contacting us at our support email.</p>
          </Section>

          <Section number="7" icon={HiClock} title="Data Retention">
            <p>
              We retain data only as long as necessary to provide services, comply with legal obligations, and resolve disputes.
            </p>
          </Section>

          <Section number="8" icon={HiGlobeAlt} title="International Users">
            <p>
              By using the platform, you acknowledge that your information may be processed in jurisdictions outside your country of residence, including the <strong>United States</strong>.
            </p>
          </Section>

          <Section number="9" icon={HiArrowPathRoundedSquare} title="Updates to This Policy">
            <p>We may update this Privacy Policy from time to time.</p>
            <p>Continued use of the platform constitutes acceptance of any updates.</p>
          </Section>

          <Section number="10" icon={HiHome} title="Disclaimer">
            <p>
              NLVListings is a technology platform and does not act as a real estate broker or agent.
            </p>
          </Section>

          <Section number="11" icon={HiEnvelope} title="Contact">
            <p>For any questions regarding this Privacy Policy, please contact:</p>
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm space-y-1">
              <p className="font-bold text-slate-900">New Leaf Vision Inc.</p>
              <p>
                <a href="mailto:support@nlvlistings.com" className="font-medium" style={{ color: P }}>
                  support@nlvlistings.com
                </a>
              </p>
              <p className="text-slate-500">8 The Green St, Dover, DE, 19901</p>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Also review our{' '}
            <Link to="/terms-of-service" className="font-semibold no-underline" style={{ color: P }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/platform-rules" className="font-semibold no-underline" style={{ color: S }}>Platform Rules</Link>.
          </p>
          <p className="text-xs text-slate-400 mt-2">© 2026 New Leaf Vision Inc. — NLVListings. All rights reserved.</p>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
