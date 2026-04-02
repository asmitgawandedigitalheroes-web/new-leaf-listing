import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiClipboardDocumentList,
  HiClock,
  HiShieldCheck,
  HiHomeModern,
  HiBanknotes,
  HiMap,
  HiArrowLeft,
} from 'react-icons/hi2';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const P    = '#D4AF37';
const S    = '#1F4D3A';
const OS   = '#111111';
const OSV  = '#4B5563';

const SECTION_ICON_COLOR = P;

export default function PlatformRules() {
  useDocumentTitle('Platform Rules');

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
          </div>
          <HiClipboardDocumentList className="mx-auto h-12 w-12 mb-4" style={{ color: P }} />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Platform Rules</h1>
          <p className="mt-3 text-slate-400 text-sm">Layer 2 Operational Standards — Effective April 2026</p>
        </div>

        {/* Back link */}
        <div className="px-8 pt-6">
          <Link to="/terms-of-service" className="inline-flex items-center gap-1.5 text-sm font-medium no-underline" style={{ color: S }}>
            <HiArrowLeft size={14} /> Back to Terms of Service
          </Link>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-10 prose prose-slate max-w-none">

          {/* 1. Lead Attribution */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiClock style={{ color: SECTION_ICON_COLOR }} /> 1. Lead Attribution — 180-Day Rule
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Every lead generated through or assigned within NLV Listings is attributed to the receiving Realtor for a strict <strong>180-calendar-day window</strong> from the date of first documented contact.
            </p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>No other platform user may solicit, re-contact, or represent the attributed lead during this period without express written consent from the original Realtor or Platform Administration.</li>
              <li>If a Realtor's account is suspended or cancelled, attributed leads revert to the Platform lead pool after 30 days and may be reassigned by a Director.</li>
              <li>Dispute resolution for attribution conflicts must be initiated within 14 days of the contested event via the platform support channel.</li>
            </ul>
          </section>

          {/* 2. Non-Circumvention */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiShieldCheck style={{ color: SECTION_ICON_COLOR }} /> 2. Non-Circumvention Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              All parties—Realtors, Directors, and any affiliated individuals—agree not to circumvent, avoid, bypass, or obviate the Platform or its fee structure in connection with any transaction, opportunity, or relationship first introduced through the Platform.
            </p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>Circumvention includes (but is not limited to): contacting leads outside the platform to avoid commission tracking, conducting transactions off-platform for leads sourced via NLV Listings, and inducing third parties to engage in the foregoing.</li>
              <li>Confirmed violations result in immediate account suspension and recovery of any commissions owed plus a 25% penalty fee.</li>
              <li>Non-circumvention obligations survive account termination for a period of 24 months.</li>
            </ul>
          </section>

          {/* 3. Listing Standards */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiHomeModern style={{ color: SECTION_ICON_COLOR }} /> 3. Listing Standards
            </h2>
            <p className="text-slate-600 leading-relaxed">
              All listings published on the Platform must meet the following minimum standards to be approved for active visibility:
            </p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li><strong>Accuracy:</strong> Price, location, property type, and listing status must reflect the true current status of the property.</li>
              <li><strong>Completeness:</strong> Listings must include at least one high-quality image, a title of 10+ characters, and a valid city/state location.</li>
              <li><strong>No duplicate listings:</strong> Each physical property may appear only once in active status per Realtor. Duplicates will be merged or removed by Administrators.</li>
              <li><strong>Status updates:</strong> Realtors must update listing status (e.g., to <em>under_contract</em> or <em>sold</em>) within 5 business days of a change occurring.</li>
              <li><strong>Standard tier expiry:</strong> Standard-tier listings automatically expire after 180 days. Featured and Top listings remain active beyond this window.</li>
            </ul>
          </section>

          {/* 4. Commission Mechanics */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiBanknotes style={{ color: SECTION_ICON_COLOR }} /> 4. Commission Mechanics
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Commissions are calculated and recorded on the Platform according to the following structure:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th className="text-left px-4 py-2.5 border border-slate-200 font-semibold text-slate-700">Type</th>
                    <th className="text-left px-4 py-2.5 border border-slate-200 font-semibold text-slate-700">Rate</th>
                    <th className="text-left px-4 py-2.5 border border-slate-200 font-semibold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr>
                    <td className="px-4 py-2.5 border border-slate-200">Subscription (Platform)</td>
                    <td className="px-4 py-2.5 border border-slate-200">15%</td>
                    <td className="px-4 py-2.5 border border-slate-200">Of monthly subscription revenue</td>
                  </tr>
                  <tr style={{ background: '#FAFAFA' }}>
                    <td className="px-4 py-2.5 border border-slate-200">Listing Upgrade</td>
                    <td className="px-4 py-2.5 border border-slate-200">10%</td>
                    <td className="px-4 py-2.5 border border-slate-200">Director share on listing upgrade payment</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 border border-slate-200">Deal Commission</td>
                    <td className="px-4 py-2.5 border border-slate-200">Varies</td>
                    <td className="px-4 py-2.5 border border-slate-200">Set per deal by Administrator</td>
                  </tr>
                  <tr style={{ background: '#FAFAFA' }}>
                    <td className="px-4 py-2.5 border border-slate-200">NLV Product Referral</td>
                    <td className="px-4 py-2.5 border border-slate-200">0.5%</td>
                    <td className="px-4 py-2.5 border border-slate-200">Of referred project value (Pro Agent+ only)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-slate-600">Payouts are processed on a Net-30 basis and require a verified payment method on file.</p>
          </section>

          {/* 5. Territory Rules */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiMap style={{ color: SECTION_ICON_COLOR }} /> 5. Territory Rules
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The Platform operates on a territory-based model. Each Regional Director is assigned exclusive oversight of a defined geographic territory (city/state combination).
            </p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>Realtors are assigned to exactly one territory. Multi-territory listings must be approved by an Administrator.</li>
              <li>Directors may only view and manage leads, listings, and commissions within their assigned territory. Cross-territory access requires escalation to an Administrator.</li>
              <li>Territory assignments may be changed by Administrators only. Requests to transfer territories must be submitted in writing with 30 days' notice.</li>
              <li>Exclusive territory rights do not prevent a Realtor from submitting listings in an adjacent territory with Director approval.</li>
            </ul>
          </section>

        </div>

        {/* Footer CTA */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Questions about these rules?{' '}
            <Link to="/contact" className="font-semibold no-underline" style={{ color: P }}>Contact us</Link>
            {' '}or review the{' '}
            <Link to="/terms-of-service" className="font-semibold no-underline" style={{ color: S }}>Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
