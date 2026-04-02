import React from 'react';
import { HiShieldCheck, HiLockClosed, HiEye, HiGlobeAlt } from 'react-icons/hi2';

const P = '#D4AF37';
const S = '#1F4D3A';
const OS = '#111111';
const LGRAY = '#6B7280';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
          </div>
          <HiShieldCheck className="mx-auto h-12 w-12 text-[#D4AF37] mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-slate-400">Last updated: March 30, 2026</p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 prose prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiGlobeAlt className="text-[#D4AF37]" /> 1. Data Collection
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We collect information that you provide to us directly, such as your name, email, phone number, and professional license details during signup. We also collect lead data generated through your interaction with the Platform for purposes of attribution and routing.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiEye className="text-[#D4AF37]" /> 2. Data Usage
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use your data to provide our services, including lead management, subscription processing, and platform security. We do NOT sell your professional or lead data to third-party marketing companies. Data is used solely for the internal operation of the NLV Listings professional network.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              <HiLockClosed className="text-[#D4AF37]" /> 3. Data Security
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We implement robust security measures to protect your information, including SSL encryption and secure database storage via Supabase. Payment information is processed exclusively by Stripe and is not stored on our servers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              4. Cookies & Tracking
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use functional cookies to maintain your session and analyze platform performance. By using the Platform, you consent to the use of these essential cookies.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              5. Your Rights
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You may request a data export or deletion at any time by contacting our support team.
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
