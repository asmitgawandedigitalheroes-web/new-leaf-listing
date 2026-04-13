import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../../components/layout/PublicNav';
import Footer from '../../components/shared/Footer';
import {
  HiClipboardDocumentList,
  HiUserGroup,
  HiHomeModern,
  HiChatBubbleLeftRight,
  HiLockClosed,
  HiNoSymbol,
  HiScale,
  HiIdentification,
  HiShieldCheck,
  HiExclamationTriangle,
  HiArrowPathRoundedSquare,
  HiArrowLeft,
} from 'react-icons/hi2';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

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

export default function PlatformRules() {
  useDocumentTitle('Platform Rules');

  return (
    <>
    <PublicNav />
    <div className="min-h-screen bg-slate-50 pt-[80px] py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)]" />
          <HiClipboardDocumentList className="mx-auto h-12 w-12 mb-4" style={{ color: P }} />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Platform Rules</h1>
          <p className="mt-3 text-slate-400 text-sm">NLVListings — Effective April 2026</p>
        </div>

        {/* Back link */}
        <div className="px-8 pt-6">
          <Link to="/terms-of-service" className="inline-flex items-center gap-1.5 text-sm font-medium no-underline" style={{ color: S }}>
            <HiArrowLeft size={14} /> Back to Terms of Service
          </Link>
        </div>

        {/* Intro */}
        <div className="px-8 pt-6 pb-2">
          <p className="text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-5 border border-slate-100 text-sm">
            NLVListings is built to create a professional, high-quality environment for Realtors, buyers, and partners. By using the platform, you agree to follow these rules.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-10 prose prose-slate max-w-none">

          <Section number="1" icon={HiUserGroup} title="Professional Conduct">
            <p>All users must:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Act professionally and respectfully</Bullet>
              <Bullet>Communicate honestly with buyers, sellers, and other users</Bullet>
              <Bullet>Represent themselves and their services accurately</Bullet>
            </ul>
            <p className="mt-2">Misleading claims or misrepresentation will not be tolerated.</p>
          </Section>

          <Section number="2" icon={HiHomeModern} title="Listings & Information Accuracy">
            <p>Users are responsible for all content they post. You must:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Provide accurate property information</Bullet>
              <Bullet>Only post listings you are authorized to represent</Bullet>
              <Bullet>Keep listings up to date</Bullet>
            </ul>
            <p className="mt-2">The platform may remove any listing that is inaccurate, misleading, or unauthorized.</p>
          </Section>

          <Section number="3" icon={HiChatBubbleLeftRight} title="Lead Handling">
            <p>Leads generated through NLVListings are part of the platform ecosystem. Users must:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Respond to leads in a timely manner</Bullet>
              <Bullet>Handle all inquiries professionally</Bullet>
              <Bullet>Use the platform tools for communication when possible</Bullet>
            </ul>
            <p className="mt-2">Leads should not be ignored, abused, or mishandled.</p>
          </Section>

          <Section number="4" icon={HiLockClosed} title="No Circumvention">
            <p>Users may not:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Attempt to bypass the platform to avoid fees or commissions</Bullet>
              <Bullet>Redirect leads outside the system to avoid platform obligations</Bullet>
              <Bullet>Complete transactions privately with platform-generated leads</Bullet>
            </ul>
            <p className="mt-2">All platform leads must be handled in accordance with the Terms of Service.</p>
          </Section>

          <Section number="5" icon={HiNoSymbol} title="No Spam or Abuse">
            <p>The following is strictly prohibited:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Spamming users or leads</Bullet>
              <Bullet>Sending unsolicited or irrelevant messages</Bullet>
              <Bullet>Harassing or pressuring clients or other users</Bullet>
            </ul>
            <p className="mt-2">Violation may result in account suspension or removal.</p>
          </Section>

          <Section number="6" icon={HiScale} title="Compliance with Laws">
            <p>Users must comply with all applicable laws, including:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Real estate licensing requirements</Bullet>
              <Bullet>Advertising regulations</Bullet>
              <Bullet>Consumer protection laws</Bullet>
            </ul>
            <p className="mt-2">NLVListings does not verify licensing and is not responsible for user compliance.</p>
          </Section>

          <Section number="7" icon={HiIdentification} title="Account Use">
            <p>Users are responsible for their account activity. You may not:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Share or transfer your account</Bullet>
              <Bullet>Allow unauthorized access</Bullet>
              <Bullet>Use the platform for fraudulent purposes</Bullet>
            </ul>
          </Section>

          <Section number="8" icon={HiShieldCheck} title="Platform Integrity">
            <p>To maintain a high-quality network:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Only serious professionals should use the platform</Bullet>
              <Bullet>Abuse of leads or listings may result in removal</Bullet>
              <Bullet>The Company may monitor activity to ensure compliance</Bullet>
            </ul>
          </Section>

          <Section number="9" icon={HiExclamationTriangle} title="Enforcement">
            <p>Violation of these rules may result in:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Listing removal</Bullet>
              <Bullet>Lead restrictions</Bullet>
              <Bullet>Account suspension</Bullet>
              <Bullet>Account termination</Bullet>
            </ul>
            <p className="mt-2">Enforcement decisions are made at the Company's discretion.</p>
          </Section>

          <Section number="10" icon={HiArrowPathRoundedSquare} title="Updates">
            <p>These Platform Rules may be updated from time to time.</p>
            <p>Continued use of the platform constitutes acceptance of any updates.</p>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Questions about these rules?{' '}
            <Link to="/contact" className="font-semibold no-underline" style={{ color: P }}>Contact us</Link>
            {' '}or review the{' '}
            <Link to="/terms-of-service" className="font-semibold no-underline" style={{ color: S }}>Terms of Service</Link>.
          </p>
          <p className="text-xs text-slate-400 mt-2">© 2026 New Leaf Vision Inc. — NLVListings. All rights reserved.</p>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
