import React from 'react';
import { Link } from 'react-router-dom';
import { HiScale, HiShieldCheck, HiLockClosed, HiDocumentText, HiArrowRight, HiHome, HiUserGroup, HiCurrencyDollar, HiMap, HiBanknotes, HiXCircle, HiExclamationTriangle, HiStar, HiEye, HiPencilSquare, HiGlobeAlt, HiEnvelope } from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import Footer from '../../components/shared/Footer';

const P = '#D4AF37';
const S = '#1F4D3A';

const Section = ({ number, icon: Icon, title, children }) => (
  <section className="mb-10">
    <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
      {Icon && <Icon className="text-[#D4AF37] flex-shrink-0" />}
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

export default function TermsOfService() {
  return (
    <>
    <PublicNav />
    <div className="min-h-screen bg-slate-50 pt-[80px] py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)]" />
          <HiDocumentText className="mx-auto h-12 w-12 text-[#D4AF37] mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-base text-slate-400">New Leaf Vision Inc. — NLVListings</p>
          <p className="mt-1 text-sm text-slate-500">Last updated: April 11, 2026</p>
        </div>

        {/* Intro */}
        <div className="px-8 pt-10 pb-2">
          <p className="text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-5 border border-slate-100 text-sm">
            Welcome to <strong>NLVListings</strong>, a real estate platform operated by <strong>New Leaf Vision Inc.</strong> ("Company," "we," "us," or "our"). By accessing or using the platform, you agree to be bound by these Terms of Service ("Terms").
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 prose prose-slate max-w-none">

          <Section number="1" icon={HiHome} title="Platform Overview">
            <p>
              NLVListings is an online platform designed to connect buyers, sellers, and real estate professionals through listings, lead generation, and related services within the New Leaf Vision ecosystem.
            </p>
            <p>
              NLVListings is a <strong>technology platform only</strong> and is not a licensed real estate brokerage. The Company does not act as a buyer's or seller's agent and does not participate in negotiations or transactions unless explicitly stated.
            </p>
          </Section>

          <Section number="2" icon={HiUserGroup} title="Eligibility and Accounts">
            <p>By using the platform, you represent that:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>You are legally capable of entering into a binding agreement</Bullet>
              <Bullet>All information provided is accurate and up to date</Bullet>
              <Bullet>You will maintain the confidentiality of your account credentials</Bullet>
            </ul>
            <p className="mt-3">Users are solely responsible for maintaining their account security.</p>
            <p>Accounts are non-transferable. The Company reserves the right to suspend or terminate accounts at its discretion.</p>
          </Section>

          <Section number="3" icon={HiScale} title="Platform Usage">
            <p>Users agree to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Comply with all applicable laws and regulations, including licensing requirements</Bullet>
              <Bullet>Provide accurate and truthful property and professional information</Bullet>
              <Bullet>Maintain professional conduct when interacting with other users</Bullet>
            </ul>
            <p className="mt-3">The Company reserves the right to remove or reject listings or content that do not meet platform standards.</p>
          </Section>

          <Section number="4" icon={HiDocumentText} title="Platform Leads">
            <p>Any lead generated through NLVListings shall be considered a <strong>"Platform Lead."</strong></p>
            <p>This includes, but is not limited to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Inquiries submitted through listings</Bullet>
              <Bullet>Messages or contact requests</Bullet>
              <Bullet>Form submissions</Bullet>
              <Bullet>Referrals made through the platform</Bullet>
              <Bullet>Leads generated through platform marketing</Bullet>
            </ul>
            <p className="mt-3">If a transaction occurs with a Platform Lead, it shall be considered a <strong>"Platform Transaction."</strong></p>
          </Section>

          <Section number="5" icon={HiShieldCheck} title="Lead Attribution and CRM Authority">
            <p>All Platform Leads are recorded within the Company's systems, including CRM and communication tools.</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>The Company's records shall serve as the primary reference for lead attribution</Bullet>
              <Bullet>Lead attribution remains valid for a period of <strong>180 days</strong> from first contact</Bullet>
              <Bullet>In the event of a dispute, the Company retains sole discretion in determining attribution based on its records</Bullet>
            </ul>
            <p className="mt-3">Any transaction involving a Platform Lead within this period may be subject to platform fees.</p>
          </Section>

          <Section number="6" icon={HiLockClosed} title="Non-Circumvention">
            <p>Users agree not to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Bypass the platform to avoid fees or commissions</Bullet>
              <Bullet>Redirect Platform Leads outside of the platform</Bullet>
              <Bullet>Complete transactions privately with Platform Leads to avoid platform obligations</Bullet>
            </ul>
            <p className="mt-3">
              Any attempt to circumvent the platform may result in enforcement of applicable fees, account suspension, or termination.
            </p>
          </Section>

          <Section number="7" icon={HiExclamationTriangle} title="Listing Removal and Transaction Protection">
            <p>
              Users may not remove listings or alter activity for the purpose of completing transactions outside of the platform.
            </p>
            <p>
              If a buyer or seller was introduced through NLVListings, the transaction shall still be considered a <strong>Platform Transaction</strong> regardless of where it is completed.
            </p>
          </Section>

          <Section number="8" icon={HiCurrencyDollar} title="Fees and Payments">
            <p>The platform may charge:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Subscription fees</Bullet>
              <Bullet>Upgrade fees</Bullet>
              <Bullet>Platform referral commissions</Bullet>
              <Bullet>Other service-related fees</Bullet>
            </ul>
            <p className="mt-3">All fees are exclusive of applicable taxes unless otherwise stated.</p>
            <p>Subscriptions are billed on a recurring basis.</p>
            <p>Fees are non-refundable unless otherwise stated.</p>
            <p>Users may cancel their subscription at any time. Access will remain active until the end of the current billing period.</p>
            <p>The Company reserves the right to modify pricing with reasonable notice.</p>
          </Section>

          <Section number="9" icon={HiMap} title="Territory and Access">
            <p>
              Certain features of the platform, including lead routing priority, territory access, and visibility, may depend on the user's subscription level and availability.
            </p>
            <p>
              Exclusive or priority access rights are subject to separate agreements and availability within each market.
            </p>
          </Section>

          <Section number="10" icon={HiBanknotes} title="Taxes">
            <p>Users are responsible for any applicable taxes related to their use of the platform or transactions conducted.</p>
            <p>The Company may collect and remit taxes where required by law.</p>
          </Section>

          <Section number="11" icon={HiXCircle} title="Suspension and Termination">
            <p>The Company reserves the right to:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Suspend or terminate accounts</Bullet>
              <Bullet>Remove listings or content</Bullet>
              <Bullet>Withhold or adjust commissions</Bullet>
            </ul>
            <p className="mt-3">In cases of:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Violation of these Terms</Bullet>
              <Bullet>Fraudulent or misleading activity</Bullet>
              <Bullet>Misuse of the platform</Bullet>
            </ul>
          </Section>

          <Section number="12" icon={HiScale} title="Limitation of Liability">
            <p>The platform is provided <strong>"as is"</strong> without warranties of any kind.</p>
            <p>The Company shall not be liable for:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>Transactions between users</Bullet>
              <Bullet>Inaccuracies in listings or information</Bullet>
              <Bullet>Loss of business, revenue, or opportunities</Bullet>
            </ul>
            <p className="mt-3">Users are solely responsible for their actions and compliance with applicable laws.</p>
          </Section>

          <Section number="13" icon={HiStar} title="No Guarantee of Results">
            <p>The Company does not guarantee:</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>The quantity or quality of leads</Bullet>
              <Bullet>Conversion rates or transaction outcomes</Bullet>
              <Bullet>Financial results from use of the platform</Bullet>
            </ul>
          </Section>

          <Section number="14" icon={HiEye} title="Privacy">
            <p>
              Use of the platform is also subject to our{' '}
              <Link to="/privacy-policy" className="font-semibold" style={{ color: P }}>Privacy Policy</Link>.
            </p>
          </Section>

          <Section number="15" icon={HiHome} title="Platform Disclaimer">
            <p>NLVListings is a technology platform designed to facilitate connections between users.</p>
            <ul className="list-none space-y-2 mt-2">
              <Bullet>The Company does not act as a real estate broker, agent, or intermediary in transactions</Bullet>
              <Bullet>The Company does not participate in negotiations, contracts, or closings between users</Bullet>
              <Bullet>Users are solely responsible for their actions, listings, and compliance with applicable laws, including licensing requirements</Bullet>
            </ul>
          </Section>

          <Section number="16" icon={HiPencilSquare} title="Modifications to Terms">
            <p>The Company may update these Terms at any time.</p>
            <p>Continued use of the platform constitutes acceptance of any updated Terms.</p>
          </Section>

          <Section number="17" icon={HiGlobeAlt} title="Governing Law">
            <p>
              These Terms shall be governed by the laws of the <strong>State of Delaware</strong>, unless otherwise required by applicable jurisdiction.
            </p>
          </Section>

          <Section number="18" icon={HiEnvelope} title="Contact Information">
            <p>For questions regarding these Terms, please contact:</p>
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

          {/* Link to Platform Rules */}
          <div className="mt-10 p-5 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-slate-900">Operational Platform Rules</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed rules covering lead attribution, non-circumvention, listing standards, commission mechanics, and territory rules.
              </p>
            </div>
            <Link
              to="/platform-rules"
              className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline flex-shrink-0"
              style={{ color: P }}
            >
              Platform Rules <HiArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              © 2026 New Leaf Vision Inc. — NLVListings. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
