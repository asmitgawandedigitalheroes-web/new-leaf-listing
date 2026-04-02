import React from 'react';
import { HiScale, HiShieldCheck, HiLockClosed, HiDocumentText } from 'react-icons/hi2';

const P = '#D4AF37';
const S = '#1F4D3A';
const OS = '#111111';
const LGRAY = '#6B7280';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent"></div>
          </div>
          <HiDocumentText className="mx-auto h-12 w-12 text-[#D4AF37] mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-lg text-slate-400">Last updated: March 30, 2026</p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 prose prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiScale className="text-[#D4AF37]" /> 1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using the NLV Listings platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Platform. Our services are intended for real estate professionals licensed in their respective jurisdictions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiShieldCheck className="text-[#D4AF37]" /> 2. Lead Protection (180-Day Rule)
            </h2>
            <p className="text-slate-600 leading-relaxed font-semibold text-slate-900">
              IMPORTANT: THE PLATFORM ENFORCES A STRICT 180-DAY LEAD ATTRIBUTION POLICY.
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              Any lead generated through or assigned within the Platform is property of the assigned Realtor for a period of 180 calendar days from the date of first contact. During this period, no other user of the Platform may solicit, contact, or represent the lead regarding any transaction without express written consent from the assigned Realtor or Platform Administration.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiLockClosed className="text-[#D4AF37]" /> 3. Non-Circumvention
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Users shall not circumvent the Platform's tracking systems to bypass commission structures or lead routing logic. Any attempt to contact Platform-sourced leads externally without recording such interaction within the Platform, or any attempt to reassign leads outside of established Platform procedures, is a material breach of these terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              4. Payment & Subscriptions
            </h2>
            <p className="text-slate-600 leading-relaxed">
              All subscription fees are non-refundable. Subscriptions automatically renew unless cancelled at least 24 hours prior to the next billing date. The Platform uses Stripe for secure payment processing. By subscribing, you agree to Stripe's Services Agreement.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              5. Liability Limits
            </h2>
            <p className="text-slate-600 leading-relaxed">
              NLV Listings is provided "as is" without warranty of any kind. We are not responsible for the accuracy of listing data, the quality of leads, or the performance of any professional user. In no event shall NLV Listings be liable for any indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              6. Data Compliance
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We process data in accordance with our Privacy Policy and applicable laws, including basic GDPR compliance standards. Users are responsible for maintaining the confidentiality of their account credentials and lead data.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              © 2026 NLV Listings. All rights reserved. Professional real estate networking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
