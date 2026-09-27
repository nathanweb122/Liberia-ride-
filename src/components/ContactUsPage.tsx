import React, { useState } from 'react';
import { motion } from 'motion/react';
import FloatingLines from './FloatingLines';

interface ContactUsPageProps {
  onExit: () => void;
  onNavigate: (screen: string) => void;
  currentUser?: any;
}

export const ContactUsPage: React.FC<ContactUsPageProps> = ({
  onExit,
  onNavigate,
  currentUser,
}) => {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    department: 'general',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});

  const contacts = [
    {
      id: 'ceo',
      title: 'Chief Executive Officer',
      name: 'Mr. Collins',
      role: 'Executive & Strategic Partnerships',
      phoneDisplay: '+231 770 291 424',
      phoneRaw: '+231770291424',
      whatsappUrl: 'https://wa.me/231770291424?text=Hello%20CEO%20Mr.%20Collins%2C%20I%20am%20reaching%20out%20regarding%20Liberia%20Ride%20Elite',
      country: 'Liberia',
      countryFlag: '🇱🇷',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      badge: 'Executive Direct Line',
      badgeColor: 'border-[#e9c349]/40 bg-[#e9c349]/10 text-[#e9c349]',
      description: 'Contact CEO Mr. Collins for executive VIP bookings, government & corporate accounts, investor relations, and high-level enterprise contracts.',
    },
    {
      id: 'tech',
      title: 'Technical & Systems Manager',
      name: 'Mr. Howe',
      role: 'Engineering, Platform & Dispatch Systems',
      phoneDisplay: '+250 796 569 416',
      phoneRaw: '+250796569416',
      whatsappUrl: 'https://wa.me/250796569416?text=Hello%20Tech%20Manager%20Mr.%20Howe%2C%20I%20am%20inquiring%20about%20the%20Liberia%20Ride%20Elite%20platform',
      country: 'International / Tech Operations',
      countryFlag: '🌍',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      badge: 'Engineering & Systems',
      badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      description: 'Contact Tech Manager Mr. Howe for technical assistance, fleet telemetry, GPS routing inquiries, driver app setup, API integrations, and system support.',
    },
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) return;
    setSubmitted(true);
  };

  const openBrevoChat = () => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.BrevoConversations) {
        win.BrevoConversations('openChat');
      } else {
        alert('Live chat widget is loading in the background. You can also chat directly via WhatsApp!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0f0f] text-white flex flex-col relative overflow-x-hidden selection:bg-[#e9c349]/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-60">
        <FloatingLines
          linesGradient={['#e9c349', '#10b981', '#34d399', '#f59e0b', '#fbbf24']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[5, 7, 5]}
          lineDistance={[4, 5, 4]}
          animationSpeed={0.7}
          interactive={true}
          bendRadius={5.0}
          bendStrength={-0.4}
          mouseDamping={0.05}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
        <div className="absolute w-[1000px] h-[600px] bg-[radial-gradient(circle,rgba(16,185,129,0.08)_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[100px]"></div>
        <div className="absolute w-[800px] h-[400px] bg-[radial-gradient(circle,rgba(233,195,73,0.06)_0%,transparent_70%)] -bottom-[100px] -right-[100px] blur-[80px]"></div>
      </div>

      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 md:px-12 py-5 flex items-center justify-between backdrop-blur-xl bg-[#0c0f0f]/80 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 hover:border-[#e9c349]/50 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95 text-xs font-mono font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return</span>
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
            <span className="font-bodoni text-xl font-bold tracking-[0.15em] text-[#e9c349] uppercase">OBSIDIAN</span>
            <span className="text-gray-500 font-bold">•</span>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-mono hidden sm:inline">Executive Concierge</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Chat Widget Launcher */}
          <button
            onClick={openBrevoChat}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="material-symbols-outlined text-sm">support_agent</span>
            <span className="hidden sm:inline">Live Chat</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 pt-28 pb-24 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-[#e9c349]/30 bg-[#e9c349]/10 text-[#e9c349] text-[11px] font-mono font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">contact_phone</span>
            <span>Direct Executive & Technical Communications</span>
          </div>

          <h1 className="font-bodoni text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Connect With Our <span className="text-[#e9c349]">Executive Leadership</span>
          </h1>

          <p className="text-sm md:text-base text-gray-400 font-sans leading-relaxed">
            Reach out directly to CEO Mr. Collins for corporate partnerships and fleet bookings, or contact Tech Manager Mr. Howe for systems support, live telemetry, and technical assistance.
          </p>
        </section>

        {/* WhatsApp Direct Executive Contact Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {contacts.map((contact) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-[#e9c349]/40 bg-gradient-to-b from-white/[0.04] to-transparent relative overflow-hidden group shadow-2xl transition-all duration-300"
            >
              {/* Subtle top ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#e9c349]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#e9c349]/10 transition-colors"></div>

              <div className="space-y-6 relative z-10">
                {/* Header with Role and Flag */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`text-[10px] font-mono font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border ${contact.badgeColor} inline-block mb-2`}>
                      {contact.badge}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bodoni font-bold text-white group-hover:text-[#e9c349] transition-colors">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-[#e9c349] font-bold font-sans uppercase tracking-wider mt-0.5">
                      {contact.title}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {contact.role}
                    </p>
                  </div>

                  <div className="text-2xl bg-white/5 border border-white/10 p-2 rounded-xl shrink-0" title={contact.country}>
                    {contact.countryFlag}
                  </div>
                </div>

                <p className="text-xs text-gray-300 font-sans leading-relaxed border-t border-white/5 pt-4">
                  {contact.description}
                </p>

                {/* WhatsApp & Phone Number Display Panel */}
                <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-bold tracking-wider">
                      Verified WhatsApp & Call Hotline:
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Available on WhatsApp
                    </span>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base md:text-lg font-mono font-bold text-white tracking-wide">
                        {contact.phoneDisplay}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(contact.id, contact.phoneRaw)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[11px] font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      title="Copy phone number"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copyStatus[contact.id] ? 'done' : 'content_copy'}
                      </span>
                      <span>{copyStatus[contact.id] ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs font-mono uppercase tracking-wider transition-all active:scale-95 shadow-[0_4px_20px_rgba(37,211,102,0.25)] hover:shadow-[0_4px_25px_rgba(37,211,102,0.4)]"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.549 1.767.818 2.796.818 3.18 0 5.767-2.587 5.767-5.766.001-3.182-2.585-5.769-5.767-5.769zm10.165 5.767c-.002 6.09-4.945 11.033-11.034 11.033-1.936 0-3.791-.506-5.419-1.468l-6.043 1.584 1.616-5.899c-1.054-1.699-1.61-3.666-1.61-5.684.002-6.09 4.945-11.034 11.035-11.034 6.09 0 11.035 4.945 11.055 11.035z" />
                    </svg>
                    <span>Chat on WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${contact.phoneRaw}`}
                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm text-[#e9c349]">call</span>
                    <span>Direct Call</span>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Live Brevo Chat Widget Banner */}
        <section className="bg-gradient-to-r from-emerald-950/40 via-black to-[#0c0f0f] border border-emerald-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-3xl">chat</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-extrabold">Instant Brevo Live Support</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bodoni font-bold text-white">Need Immediate Help?</h3>
              <p className="text-xs text-gray-400 font-sans max-w-xl">
                Our embedded Brevo Conversations live chat widget is available 24/7 at the bottom right corner of the screen. Click below to open a direct support session.
              </p>
            </div>
          </div>

          <button
            onClick={openBrevoChat}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Launch Live Chat</span>
          </button>
        </section>

        {/* Operational HQ & Interactive Message Form */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Headquarters Info */}
          <div className="lg:col-span-5 glass-panel p-8 rounded-2xl border border-white/10 space-y-6">
            <div>
              <span className="text-[10px] text-[#e9c349] font-mono font-bold uppercase tracking-widest">[ Liberia Dispatch HQ ]</span>
              <h3 className="font-bodoni text-2xl font-bold text-white mt-1">Monrovia Operations Center</h3>
              <p className="text-xs text-gray-400 font-sans mt-1">
                Centrally coordinated across Monrovia diplomatic zones and RIA corridors.
              </p>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-[#e9c349] text-lg shrink-0 mt-0.5">location_on</span>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">Headquarters Location</p>
                  <p className="text-gray-300 mt-0.5">Broad Street & Mamba Point Diplomatic Zone, Sinkor District, Monrovia, Liberia</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-[#e9c349] text-lg shrink-0 mt-0.5">schedule</span>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">Operational Schedule</p>
                  <p className="text-gray-300 mt-0.5">24/7 Live GPS Dispatch, Chauffeur Service & VIP Airport Transfers</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-[#e9c349] text-lg shrink-0 mt-0.5">mail</span>
                <div>
                  <p className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">Official Email Inquiries</p>
                  <p className="text-gray-300 mt-0.5 font-mono">contact@liberiaride.com</p>
                  <p className="text-gray-400 font-mono text-[10px]">concierge@obsidianliberia.com</p>
                </div>
              </div>
            </div>

            {/* Quick links to fleet */}
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-gray-400 uppercase font-mono font-bold tracking-wider mb-2">Explore Fleet & Portals:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate('client-portal')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all"
                >
                  Fleet Discovery
                </button>
                <button
                  onClick={() => onNavigate('rider')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all"
                >
                  Join as Driver
                </button>
                <button
                  onClick={() => onNavigate('admin-portal')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all"
                >
                  Admin Portal
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Dispatch Message Form */}
          <div className="lg:col-span-7 glass-panel p-8 rounded-2xl border border-white/10 space-y-6">
            <div>
              <span className="text-[10px] text-[#e9c349] font-mono font-bold uppercase tracking-widest">[ Direct Transmission ]</span>
              <h3 className="font-bodoni text-2xl font-bold text-white mt-1">Send an Official Inquiry</h3>
              <p className="text-xs text-gray-400 font-sans mt-1">
                Your message is routed instantly to CEO Mr. Collins and Tech Manager Mr. Howe.
              </p>
            </div>

            {submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-2xl text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h4 className="font-bodoni text-2xl font-bold text-white">Inquiry Transmitted Successfully</h4>
                <p className="text-xs text-gray-300 max-w-md mx-auto">
                  Thank you, <strong>{formData.name}</strong>. Your message has been logged. CEO Mr. Collins or Tech Manager Mr. Howe will respond shortly.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/231770291424?text=Hello%20CEO%20Mr.%20Collins%2C%20I%20just%20submitted%20an%20inquiry%20regarding%3A%20${encodeURIComponent(formData.subject || 'Liberia Ride Elite')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#25D366] text-black font-bold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Follow Up on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        phone: '',
                        email: '',
                        department: 'general',
                        subject: '',
                        message: '',
                      });
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono uppercase tracking-wider"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Cllr. Samuel Coleman"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50 focus:ring-1 focus:ring-[#e9c349]/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +231 77..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50 focus:ring-1 focus:ring-[#e9c349]/50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. yourname@domain.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50 focus:ring-1 focus:ring-[#e9c349]/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                      Department / Recipient
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-[#161919] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50"
                    >
                      <option value="ceo">CEO Mr. Collins (Corporate & VIP)</option>
                      <option value="tech">Tech Manager Mr. Howe (Systems & Tech)</option>
                      <option value="general">General Dispatch & Operations</option>
                      <option value="momo">MoMo / Billing Reconciliation</option>
                      <option value="partnership">Driver / Fleet Partnership</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. VIP Concierge Request / Driver Registration / Platform Inquiry"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50 focus:ring-1 focus:ring-[#e9c349]/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#e9c349] uppercase font-mono font-bold tracking-wider">
                    Detailed Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details about your inquiry, schedule, pickup location, or questions..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#e9c349]/50 focus:ring-1 focus:ring-[#e9c349]/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#e9c349] text-[#0c0f0f] font-bold py-4 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Transmit Official Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-[#080a0a] py-8 px-6 text-center text-xs text-gray-500 font-mono">
        <p>© 2026 Liberia Ride Elite • Obsidian Concierge & Logistics Network</p>
        <p className="text-[10px] mt-1 text-gray-600">
          CEO: Mr. Collins (+231770291424) • Tech Manager: Mr. Howe (+250796569416) • Monrovia, Liberia
        </p>
      </footer>
    </div>
  );
};
