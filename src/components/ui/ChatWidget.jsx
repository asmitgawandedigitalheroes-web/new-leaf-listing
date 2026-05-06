import { useState, useRef, useEffect } from 'react';
import {
  HiXMark,
  HiPaperAirplane,
} from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm Cl0s3r, your NLV assistant. I can help you with subscription plans, signing up as a realtor or director, adding listings, earning commissions, and more. What would you like to know?",
};

// ── FAQ knowledge base ────────────────────────────────────────────────────────

const FAQ = [
  // ── Specific role/access entries first (before generic login/signup) ──────

  {
    patterns: ['admin login', 'login as admin', 'log in as admin', 'sign in as admin', 'admin access', 'admin account', 'admin dashboard', 'admin panel', 'admin role', 'become admin', 'how to be admin', 'get admin'],
    answer: `**Admin** is a platform-level role managed internally by the NLV team.\n\n• Admin accounts are **not available through self-registration** — they are created and assigned by the platform team\n• Admins have full access to: users, subscriptions, listings, approvals, commissions, territories, pricing, payouts, disputes, and audit logs\n• If you believe you should have admin access, please contact us via the **/contact** page\n\nIf you are an existing admin, log in at **/login** with your admin email and password.`,
  },
  {
    patterns: ['director login', 'login as director', 'log in as director', 'sign in as director', 'director access', 'director dashboard'],
    answer: `To log in as a **Director**:\n\n• Go to **/login** and enter your director email and password\n• You'll be redirected to your Director Dashboard automatically\n\n**Director dashboard includes:**\n• Manage your territory and team of realtors\n• Review and approve listings\n• Track leads, commissions, and reports\n• Handle billing and contracts\n\nNot signed up yet? Go to **/signup** and select the **Director** role.`,
  },
  {
    patterns: ['realtor login', 'login as realtor', 'log in as realtor', 'sign in as realtor', 'realtor access', 'realtor dashboard'],
    answer: `To log in as a **Realtor**:\n\n• Go to **/login** and enter your realtor email and password\n• You'll be redirected to your Realtor Dashboard automatically\n\n**Realtor dashboard includes:**\n• My Listings, My Leads, Analytics\n• Messages, Commissions, Billing\n• NLV Referrals and Profile settings\n\nNot signed up yet? Go to **/signup** and select the **Realtor** role.`,
  },
  {
    patterns: ['sign up realtor', 'signup realtor', 'register realtor', 'become realtor', 'join as realtor', 'realtor account', 'create realtor'],
    answer: `To sign up as a **Realtor**:\n\n1. Go to **/signup**\n2. Select **"Realtor"** as your role\n3. Fill in your name, email, and password\n4. Choose a subscription plan (Starter, Pro, or Dominator)\n5. Complete Stripe checkout — your **14-day free trial** starts immediately\n6. Your account goes through an admin approval process\n7. Once approved, you get full dashboard access to add listings, manage leads, and track commissions`,
  },
  {
    patterns: ['sign up director', 'signup director', 'register director', 'become director', 'join as director', 'director account', 'create director', 'broker account', 'become broker'],
    answer: `To sign up as a **Director (Broker)**:\n\n1. Go to **/signup**\n2. Select **"Director"** as your role\n3. Fill in your account details\n4. Submit — no plan selection needed at signup\n5. Your account goes through **admin approval**\n6. Once approved, you can manage a territory, oversee your realtor team, approve listings, and track commissions\n\nDirectors can also be invited directly by an admin via an invite link.`,
  },
  {
    patterns: ['book appointment', 'appointment', 'meeting', 'meet director', 'speak to director', 'talk to director', 'contact director', 'schedule'],
    answer: `To book an appointment with a director:\n\n1. Visit the **/contact** page and fill in the form\n2. Select **"Membership Inquiry"** as the subject and mention you'd like to speak with a director\n3. Alternatively, click "Contact" on any listing — the director for that territory will be in touch\n\nDirectors (brokers) oversee teams of realtors within their assigned territories.`,
  },
  {
    patterns: ['contact realtor', 'contact agent', 'reach realtor', 'reach agent', 'find agent', 'talk to realtor', 'message realtor', 'get in touch with realtor'],
    answer: `To contact a realtor:\n\n1. Visit **/browse** to see all active property listings\n2. Click any listing to open the full detail page\n3. Click the **"Contact Agent"** button to send a message\n\nYou may need to create a free account to send messages to agents.`,
  },

  // ── Plans & billing ───────────────────────────────────────────────────────

  {
    patterns: ['plan', 'plans', 'pricing', 'price', 'cost', 'how much', 'subscription', 'tier', 'starter', 'pro', 'dominator', 'sponsor'],
    answer: `We offer 4 subscription plans:\n\n**Starter — $29/month**\n• Up to 10 listings, 50 leads/month, 1 territory\n• Standard analytics + email support\n\n**Pro — $79/month**\n• Up to 25 listings, 200 leads/month, 3 territories\n• 2 featured spots, advanced analytics, phone + email support\n\n**Dominator — $199/month** ⭐ Most Popular\n• Unlimited listings & leads, 5 territories\n• 5 featured + 2 top spots, 24/7 priority support\n\n**Sponsor — Custom Pricing**\n• Full territory ownership + revenue sharing\n• All Dominator features + dedicated account manager\n\nAll plans include a **14-day free trial** — no charge until day 15.\n\nView full details at /pricing`,
  },
  {
    patterns: ['trial', 'free trial', 'activate', 'activation', 'start plan', 'begin', 'how to activate', 'how does billing', 'billing cycle', 'charged', 'charge'],
    answer: `Here's how plans activate:\n\n1. Go to /signup and create your account\n2. Choose the **Realtor** role and select a plan\n3. You'll be directed to Stripe checkout to enter payment details\n4. Your **14-day free trial** begins immediately — no charge until day 15\n5. After the trial, billing is monthly (or annual if selected)\n6. You can upgrade, downgrade, or cancel anytime from your **Billing** page in the dashboard`,
  },
  {
    patterns: ['cancel', 'cancellation', 'stop subscription', 'end subscription', 'unsubscribe'],
    answer: `You can cancel your subscription at any time:\n\n1. Log in to your dashboard\n2. Go to **Billing** in the sidebar\n3. Click **"Cancel Subscription"**\n\nYour access continues until the end of the current billing period. No refunds are issued for partial months.`,
  },

  // ── Listings & earnings ───────────────────────────────────────────────────

  {
    patterns: ['add listing', 'create listing', 'post listing', 'upload listing', 'new listing', 'how to list', 'list property', 'list a property', 'add property'],
    answer: `To add a listing:\n\n1. Log in to your **realtor dashboard**\n2. Go to **"My Listings"** in the sidebar\n3. Click **"Add New Listing"**\n4. Fill in the property details:\n   • Title, description, price, address\n   • Property type, bedrooms, bathrooms, size\n   • Up to **5 images** (5MB each)\n5. Save as Draft or **Submit for Approval**\n6. An admin or director will review and approve it\n7. Once approved, your listing goes live at /browse\n\n⚠️ An **active subscription** is required to add listings.\n\nUpgrade tiers available: Standard (included), Featured, and Top placement.`,
  },
  {
    patterns: ['listing upgrade', 'featured listing', 'top listing', 'upgrade listing', 'boost listing', 'promote listing'],
    answer: `Listings can be upgraded for better visibility:\n\n• **Standard** — included with all plans\n• **Featured** — highlighted placement in search results\n• **Top** — premium top-of-page placement for maximum exposure\n\nUpgrade your listing from the **My Listings** section in your dashboard.`,
  },
  {
    patterns: ['earn', 'money', 'commission', 'commissions', 'income', 'revenue', 'pay', 'payment', 'payout', 'how much can i earn', 'salary', 'profit', 'referral'],
    answer: `Here's how you earn money on New Leaf Listings:\n\n**Commission Structure (per closed deal):**\n1. Platform fee — 15% goes to NLV\n2. Director cut — 25% of the realtor's share goes to their broker\n3. Admin override — up to 15% in some cases\n4. **Realtor keeps the remainder**\n\n**Commission Types:**\n• **Deal** — when a property sells through your lead\n• **Listing** — from listing upgrade purchases\n• **Subscription** — when you refer new realtors\n• **Referral** — tracked via NLV Referrals in your dashboard\n\n**Tracking earnings:**\nDashboard → Commissions\nStatus: Pending → Approved → Payable → Paid\n\n**Sponsor plan:** Territory sponsors earn revenue sharing from all activity in their territory.`,
  },

  // ── Platform info ─────────────────────────────────────────────────────────

  {
    patterns: ['territory', 'territories', 'area', 'region', 'zone', 'location'],
    answer: `Territories are geographic areas managed by Directors (brokers).\n\n• **Starter plan** — 1 territory\n• **Pro plan** — up to 3 territories\n• **Dominator plan** — up to 5 territories\n• **Sponsor plan** — full territory ownership with revenue sharing\n\nEach territory is overseen by a Director who manages a team of realtors and approves listings within that area.`,
  },
  {
    patterns: ['lead', 'leads', 'buyer', 'enquiry', 'inquiry', 'contact form'],
    answer: `Leads are buyer/seller inquiries captured through your listings.\n\n• Leads are tracked in your dashboard under **"My Leads"**\n• Each lead has a **180-day attribution lock** — it stays assigned to you\n• Lead statuses: New → Contacted → In Progress → Closed\n• Plan limits: Starter (50/mo), Pro (200/mo), Dominator (unlimited)\n\nManage and follow up on all your leads from the Leads section in your dashboard.`,
  },
  {
    patterns: ['what is nlv', 'what is new leaf', 'about', 'about nlv', 'how does it work', 'platform', 'overview'],
    answer: `**New Leaf Listings** is a real estate platform that connects:\n\n• **Realtors** — agents who list properties and manage buyer/seller leads\n• **Directors** — brokers who manage territory and oversee realtor teams\n• **Buyers/Sellers** — people searching for properties\n\n**Key features:**\n• Browse listings at /browse or /map\n• Subscription-based access for realtors\n• Territory-based commission system\n• Integrated lead management and CRM\n\nGet started at /signup or explore listings at /browse.`,
  },

  // ── General (last — broadest patterns) ───────────────────────────────────

  {
    patterns: ['sign up', 'signup', 'register', 'create account', 'get started', 'join', 'how to join', 'new account'],
    answer: `To get started on New Leaf Listings:\n\n1. Go to **/signup**\n2. Choose your role:\n   • **Realtor** — add listings, manage leads, earn commissions\n   • **Director** — manage a territory and a team of realtors\n3. Fill in your account details\n4. Realtors select a subscription plan; Directors skip this step\n5. Your account goes through admin approval\n6. Once approved, you have full dashboard access\n\nAlready have an account? Log in at /login`,
  },
  {
    patterns: ['login', 'log in', 'sign in', 'password', 'forgot password', 'reset password', 'access account'],
    answer: `To log in to your account:\n\n• Go to **/login** and enter your email and password\n• Forgot your password? Click **"Reset Password"** on the login page\n\nLog in as a specific role:\n• **Realtor** — /login → redirected to realtor dashboard\n• **Director** — /login → redirected to director dashboard\n• **Admin** — admin accounts are assigned by the platform team\n\nNot signed up yet? Visit **/signup** to create an account.`,
  },
  {
    patterns: ['contact', 'support', 'help', 'assistance', 'get help', 'talk to someone', 'human', 'team'],
    answer: `Need to speak with the NLV team?\n\n• Visit the **/contact** page and fill in the form\n• Choose the most relevant subject:\n  – Membership Inquiry\n  – Listing Submission\n  – Technical Support\n  – Partnership\n  – Press & Media\n\nOur team will respond as quickly as possible.`,
  },
];

const FALLBACK = "I'm not sure about that specific question. For detailed help, please visit our **/contact** page and our team will be happy to assist you.\n\nOr try asking about:\n• Subscription plans & pricing\n• How to sign up as a realtor or director\n• Adding a listing\n• Earning commissions\n• Contacting a realtor";

function getAnswer(text) {
  const lower = text.toLowerCase();
  for (const entry of FAQ) {
    if (entry.patterns.some(p => lower.includes(p))) {
      return entry.answer;
    }
  }
  return FALLBACK;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { messages: updatedMessages },
      });

      if (error || !data?.reply) throw new Error(error?.message || 'No reply received');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or visit our **/contact** page for help.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Render markdown-style bold (**text**) and bullet points
  function renderContent(text) {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      );
      return <p key={i} className={line === '' ? 'mt-1' : ''}>{parts}</p>;
    });
  }

  return (
    <>
      {/* Chat panel */}
      <div
        className="fixed bottom-24 right-6 z-[1050] flex flex-col rounded-2xl shadow-2xl bg-white border border-gray-100 transition-all duration-200"
        style={{
          width: '380px',
          maxWidth: 'calc(100vw - 24px)',
          height: '500px',
          maxHeight: 'calc(100vh - 120px)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(12px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        role="dialog"
        aria-label="NLV Assistant chat"
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-t-2xl flex-shrink-0"
          style={{ background: '#1F4D3A' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: '#D4AF37' }}
          >
            <img src="/images/Cl0s3r.png" alt="Assistant" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Chat with us</p>
            <p className="text-white text-xs opacity-70">Ask me anything about the platform</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white opacity-70 hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10"
            aria-label="Close chat"
          >
            <HiXMark size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div
                  className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed"
                  style={{ background: '#1F4D3A' }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2 items-end">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: '#D4AF37' }}
                >
                  <img src="/images/Cl0s3r.png" alt="Assistant" className="w-full h-full object-contain p-0.5" />
                </div>
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-800 bg-gray-100 leading-relaxed space-y-0.5">
                  {renderContent(msg.content)}
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-2 items-end">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: '#D4AF37' }}
              >
                <img src="/images/Cl0s3r.png" alt="Assistant" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="px-3 py-3 rounded-2xl rounded-bl-sm bg-gray-100 flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestion chips */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {['Subscription plans', 'Add a listing', 'How to sign up', 'Earn commissions'].map(q => (
              <button
                key={q}
                onClick={() => { setInputValue(q); setTimeout(handleSend, 50); }}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-[#D4AF37] hover:text-[#1F4D3A] transition-colors bg-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 px-3 py-3 flex gap-2 items-end flex-shrink-0">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about plans, listings, commissions…"
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] overflow-y-auto"
            style={{ maxHeight: '96px' }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: inputValue.trim() && !isLoading ? '#D4AF37' : '#E5E7EB' }}
            aria-label="Send message"
          >
            <HiPaperAirplane
              size={16}
              className={inputValue.trim() && !isLoading ? 'text-white' : 'text-gray-400'}
            />
          </button>
        </div>
      </div>

      {/* Floating action button & Label */}
      <div className="fixed bottom-6 right-6 z-[1100] flex flex-col items-center">
        {!isOpen ? (
          <div 
            className="flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group"
            onClick={() => setIsOpen(true)}
          >
            {/* Alien character "standing" */}
            <div className="relative mb-[-12px] z-10 transition-transform duration-500 group-hover:-translate-y-2 animate-float">
              <img 
                src="/images/Cl0s3r.png" 
                alt="Assistant" 
                className="w-16 h-16 object-contain drop-shadow-2xl" 
              />
            </div>
            {/* Bubble */}
            <div className="bg-white px-4 py-2 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-50 flex items-center gap-2">
              <span className="text-[13px] font-bold text-gray-800 whitespace-nowrap tracking-tight">Chat with us 👋</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(false)}
            className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 text-white hover:rotate-90"
            style={{ background: '#1F4D3A' }}
            aria-label="Close chat assistant"
          >
            <HiXMark size={28} />
          </button>
        )}
      </div>
    </>
  );
}
