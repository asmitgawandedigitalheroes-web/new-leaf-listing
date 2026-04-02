import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiDocumentText,
  HiShieldCheck,
  HiLockClosed,
  HiMap,
  HiArrowLeft,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const P    = '#D4AF37';
const S    = '#1F4D3A';
const OS   = '#111111';
const OSV  = '#4B5563';

// Only director and admin roles may view full contracts
const ALLOWED_ROLES = ['director', 'admin'];

export default function FullContracts() {
  useDocumentTitle('Full Contracts');
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  // Access Restricted for unauthenticated users and realtors
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
          <HiLockClosed className="mx-auto h-12 w-12 mb-4" style={{ color: P }} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-6">
            Full Contracts are only accessible to <strong>Regional Directors</strong> and <strong>Administrators</strong>.
            Please contact your Administrator if you need access.
          </p>
          <Link
            to="/terms-of-service"
            className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline"
            style={{ color: S }}
          >
            <HiArrowLeft size={14} /> Back to Terms of Service
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent" />
          </div>
          <HiDocumentText className="mx-auto h-12 w-12 mb-4" style={{ color: P }} />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Full Contracts</h1>
          <p className="mt-3 text-slate-400 text-sm">Layer 3 Legal Documents — Restricted Access</p>
          <div
            className="inline-block mt-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{ background: 'rgba(212,175,55,0.2)', color: P }}
          >
            {role === 'admin' ? 'Administrator Access' : 'Director Access'}
          </div>
        </div>

        {/* Back link */}
        <div className="px-8 pt-6">
          <Link to="/platform-rules" className="inline-flex items-center gap-1.5 text-sm font-medium no-underline" style={{ color: S }}>
            <HiArrowLeft size={14} /> Back to Platform Rules
          </Link>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-10 prose prose-slate max-w-none">

          {/* 1. Regional Director Agreement */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiMap style={{ color: P }} /> 1. Regional Director Agreement
            </h2>
            <p className="text-slate-600 leading-relaxed">
              This Regional Director Agreement ("Agreement") is entered into between New Leaf Listings LLC ("Company") and the undersigned Regional Director ("Director").
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">1.1 Appointment & Territory</h3>
            <p className="text-slate-600">
              The Company hereby appoints the Director as the exclusive Regional Director for the designated territory specified in their account profile. The Director accepts this appointment subject to the terms herein.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">1.2 Director Obligations</h3>
            <ul className="text-slate-600 space-y-1">
              <li>Actively recruit and onboard qualified Realtors within the assigned territory.</li>
              <li>Review and approve or reject Realtor listing submissions within 3 business days.</li>
              <li>Maintain a minimum of 3 active Realtors in the territory at all times after the first 90 days.</li>
              <li>Participate in quarterly performance reviews with Platform Administration.</li>
            </ul>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">1.3 Commission Structure</h3>
            <p className="text-slate-600">
              Directors receive a commission share on all subscription and listing upgrade revenue generated within their territory, as defined in the Commission Contract below and the current Platform Rules.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">1.4 Term & Termination</h3>
            <p className="text-slate-600">
              This Agreement commences upon account activation and continues for an initial term of 12 months, thereafter renewing automatically on a month-to-month basis. Either party may terminate with 30 days' written notice. Termination for cause (including non-circumvention violations) may be immediate.
            </p>
          </section>

          {/* 2. Commission Contract */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiShieldCheck style={{ color: P }} /> 2. Commission Contract
            </h2>
            <p className="text-slate-600">
              This Commission Contract governs the calculation, recording, and payment of all commissions within the NLV Listings Platform.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">2.1 Commission Recording</h3>
            <p className="text-slate-600">
              All commissions are recorded in the Platform database at the time of qualifying payment. Commission records are immutable once created and serve as the authoritative source of truth for payout calculations.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">2.2 Payout Schedule</h3>
            <ul className="text-slate-600 space-y-1">
              <li>Commissions with status 'approved' or 'payable' are processed on a Net-30 basis.</li>
              <li>Minimum payout threshold is $50.00. Balances below this threshold roll forward to the next cycle.</li>
              <li>Payments are made via ACH transfer to the verified bank account on file.</li>
            </ul>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">2.3 Dispute Window</h3>
            <p className="text-slate-600">
              Commission disputes must be raised within 30 days of the payout date. Disputes raised after this window will not be eligible for adjustment.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">2.4 Clawback Provisions</h3>
            <p className="text-slate-600">
              The Company reserves the right to claw back paid commissions in cases of fraud, chargebacks, subscription cancellations within the first 30 days, or confirmed non-circumvention violations.
            </p>
          </section>

          {/* 3. Territory Exclusivity Agreement */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              <HiDocumentText style={{ color: P }} /> 3. Territory Exclusivity Agreement
            </h2>
            <p className="text-slate-600">
              The Territory Exclusivity Agreement grants Regional Directors the exclusive right to operate within, recruit for, and earn commissions from their designated geographic territory on the Platform.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">3.1 Grant of Exclusivity</h3>
            <p className="text-slate-600">
              Subject to the Director's continued compliance with all Platform agreements, no other Director shall be assigned to the same territory. Exclusivity is defined at the city/state level as specified in the Director's account profile.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">3.2 Exclusivity Conditions</h3>
            <ul className="text-slate-600 space-y-1">
              <li>Exclusivity requires maintaining at least 3 active Realtors in the territory after the initial 90-day ramp period.</li>
              <li>Failure to meet the minimum Realtor count for more than 60 consecutive days may result in territory reassignment at the Company's discretion.</li>
              <li>Exclusivity does not restrict Realtors within the territory from listing properties in adjacent territories with appropriate approvals.</li>
            </ul>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">3.3 Territory Transfer</h3>
            <p className="text-slate-600">
              Territory assignments are non-transferable between Directors without explicit written approval from Platform Administration. Transfer requests require 30 days' notice and are subject to performance review.
            </p>

            <h3 className="font-bold text-slate-800 mt-5 mb-2">3.4 Post-Termination</h3>
            <p className="text-slate-600">
              Upon termination of the Regional Director Agreement, exclusivity rights lapse immediately. Commissions on transactions already in progress at the time of termination remain payable per the Commission Contract.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            For contract execution or amendments, contact{' '}
            <Link to="/contact" className="font-semibold no-underline" style={{ color: P }}>Platform Administration</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
