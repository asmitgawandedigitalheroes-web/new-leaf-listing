import { useState } from 'react';
import { 
  HiMapPin, 
  HiEnvelope, 
  HiPhone, 
  HiAtSymbol, 
  HiBriefcase, 
  HiCheckCircle,
  HiCamera
} from 'react-icons/hi2';
import PublicNav from '../../components/layout/PublicNav';
import PublicFooter from '../../components/layout/PublicFooter';
import { useLeads } from '../../hooks/useLeads';
import { useToast } from '../../context/ToastContext';

const G  = '#D4AF37';
const GH = '#B8962E';
const DG = '#1F4D3A';
const SB = '#E8F3EE';
const TX = '#111111';
const TS = '#4B5563';
const TM = '#6B7280';
const BD = '#E5E7EB';
const IB = '#D1D5DB';

const CONTACT_INFO = [
  {
    icon: HiMapPin,
    title: 'Headquarters',
    lines: ['3250 S Durango Dr, Suite 200', 'Las Vegas, NV 89117'],
  },
  {
    icon: HiEnvelope,
    title: 'Email Us',
    lines: ['hello@nlvlistings.com', 'support@nlvlistings.com'],
  },
  {
    icon: HiPhone,
    title: 'Call Us',
    lines: ['+1 (702) 555-0192', 'Mon–Fri, 9am – 6pm PST'],
  },
];

const SUBJECTS = [
  'Membership Inquiry',
  'Listing Submission',
  'Technical Support',
  'Partnership',
  'Press & Media',
  'Other',
];

// Removed legacy Ico function

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: TM }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: `1px solid ${IB}`,
  borderRadius: 10,
  background: '#fff',
  color: TX,
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
};

export default function ContactPage() {
  const { createInquiry } = useLeads();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFocus = e => {
    e.target.style.borderColor = G;
    e.target.style.boxShadow = `0 0 0 3px rgba(212,175,55,0.12)`;
  };
  const handleBlur = e => {
    e.target.style.borderColor = IB;
    e.target.style.boxShadow = 'none';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await createInquiry({
      ...form,
      interest: form.subject,
      source: 'Website Contact Form'
    });

    if (error) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        desc: error.message || 'Please try again later'
      });
    } else {
      setSent(true);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white min-h-screen font-body">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6 md:px-8 text-center" style={{ background: 'linear-gradient(160deg, #fff 60%, #E8F3EE 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <span
            className="inline-block text-xs font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(212,175,55,0.1)', color: GH, border: '1px solid rgba(212,175,55,0.25)' }}
          >
            Get In Touch
          </span>
          <h1 className="font-headline font-black text-4xl md:text-5xl leading-tight mb-4" style={{ color: TX }}>
            We'd Love to <span style={{ color: G }}>Hear From You</span>
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: TS }}>
            Whether you're exploring membership, submitting a listing, or need support — our team responds within one business day.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-10">

          {/* Contact info sidebar */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {CONTACT_INFO.map(info => (
              <div
                key={info.title}
                className="rounded-2xl p-6 flex gap-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: SB }}
                >
                  <info.icon size={20} color={DG} />
                </div>
                <div>
                  <div className="font-semibold text-sm mb-1" style={{ color: TX }}>{info.title}</div>
                  {info.lines.map((l, i) => (
                    <div key={i} className="text-sm" style={{ color: TS }}>{l}</div>
                  ))}
                </div>
              </div>
            ))}

            {/* Social links */}
            <div className="rounded-2xl p-6" style={{ background: DG, boxShadow: '0 4px 20px rgba(31,77,58,0.15)' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Follow NLV</div>
              <div className="flex gap-3">
                {[
                  { icon: HiAtSymbol, label: 'Twitter / X' },
                  { icon: HiCamera, label: 'Instagram' },
                  { icon: HiBriefcase, label: 'LinkedIn' },
                ].map(s => (
                  <button
                    key={s.label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    title={s.label}
                  >
                    <s.icon size={18} color="currentColor" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6 md:p-8"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)' }}
            >
              {sent ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: SB }}
                  >
                    <HiCheckCircle size={32} color={DG} />
                  </div>
                  <h3 className="font-headline font-bold text-xl mb-2" style={{ color: TX }}>Message Sent!</h3>
                  <p className="text-sm" style={{ color: TS }}>
                    Thank you for reaching out. A member of our team will respond within one business day.
                  </p>
                  <button
                    className="mt-6 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all"
                    style={{ background: G, color: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = GH}
                    onMouseLeave={e => e.currentTarget.style.background = G}
                    onClick={() => setSent(false)}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <h2 className="font-headline font-bold text-xl mb-1" style={{ color: TX }}>Send Us a Message</h2>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Full Name">
                      <input
                        required
                        type="text"
                        placeholder="John Smith"
                        value={form.name}
                        onChange={set('name')}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </Field>
                    <Field label="Email Address">
                      <input
                        required
                        type="email"
                        placeholder="john@brokerage.com"
                        value={form.email}
                        onChange={set('email')}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Phone (optional)">
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={form.phone}
                        onChange={set('phone')}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </Field>
                    <Field label="Subject">
                      <select
                        required
                        value={form.subject}
                        onChange={set('subject')}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      >
                        <option value="" disabled>Select a subject…</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Message">
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us how we can help you…"
                      value={form.message}
                      onChange={set('message')}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: G }}
                    onMouseEnter={e => !isSubmitting && (e.currentTarget.style.background = GH)}
                    onMouseLeave={e => !isSubmitting && (e.currentTarget.style.background = G)}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ strip ── */}
      <section className="py-16 px-6 md:px-8" style={{ background: '#F9FAFB' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-headline font-bold text-2xl md:text-3xl" style={{ color: TX }}>Common Questions</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { q: 'How do I apply for membership?', a: 'Click "Apply for Membership" and complete the 3-step onboarding. Approval takes 1–2 business days.' },
              { q: 'Is NLV Listings free to try?', a: 'Yes — all plans include a 14-day free trial. No credit card required to start.' },
              { q: 'Can I list off-market properties?', a: 'Absolutely. NLV supports confidential and off-market listings with full privacy controls.' },
              { q: 'What markets do you cover?', a: 'We currently operate in 18 major US markets with international expansion planned for 2026.' },
              { q: 'How is lead routing handled?', a: 'Our smart routing engine assigns inbound leads to the best-matched realtor based on territory, plan tier, and availability.' },
              { q: 'How do I cancel my subscription?', a: 'You can cancel at any time from your Billing page. Your access continues until the end of the billing period.' },
              { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee on all new subscriptions. Contact support to request a refund.' },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E7EB' }}>
                <h4 className="font-semibold text-sm mb-2" style={{ color: '#111111' }}>{item.q}</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}