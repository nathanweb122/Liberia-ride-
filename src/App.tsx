/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleSheetsSyncHub } from './components/GoogleSheetsSyncHub';
import { saveDriverToFirestore, listenToLiveDrivers, auth, listenToActiveTrip, saveActiveTripToFirestore, checkDuplicateIdentity } from './lib/firebaseService';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { MomoPaymentHub, AdminCompliancePanel } from './components/ComplianceHub';
import { RevenueGrowthChart } from './components/RevenueGrowthChart';
import { InteractiveMap, LIBERIA_PRESET_LOCATIONS } from './components/InteractiveMap';
import { AIAssistant } from './components/AIAssistant';
import { getTranslation } from './utils/i18n';
import { FareMatrixTable } from './components/FareMatrixTable';
import { TextType } from './components/TextType';
import FloatingLines from './components/FloatingLines';
import { PostTripSummaryModal } from './components/PostTripSummaryModal';
import { ContactUsPage } from './components/ContactUsPage';
import { LiveVehicleTrackerHub } from './components/LiveVehicleTrackerHub';
import { PRODUCTION_DRIVERS, authenticateProductionDriver, purgeAndSeedProductionDrivers, findProductionDriver, purgeAllAccountsFromFirestore } from './lib/driverRoster';
import { authenticateWithRoleGuard, classifyAccount, verifyStrictPortalAccess } from './lib/roleAccessSecurity';

const compressImage = (base64Str: string, maxWidth = 250, maxHeight = 250, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

const FLEET = [
  { id: 'taxi', name: 'Taxi Service', image: 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png' },
  { id: 'bike', name: 'Bike Ride', image: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png' },
  { id: 'kekeh', name: 'Kekeh Ride', image: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png' },
];

const MASTER_DRIVERS: any[] = PRODUCTION_DRIVERS;

const LandingPage = ({ selectedVehicleId, onSelectVehicle, onNavigate, onJoinPartner }: any) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="relative pt-28 md:pt-40 pb-20 px-4 w-full">
      <header className="fixed top-0 left-0 w-full z-50 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between backdrop-blur-md bg-[#0e0e0e]/60 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <span className="text-lg md:text-xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Montserrat' }}>Liberia Ride<sup className="text-[10px]">®</sup></span>
        </div>
        <nav className="hidden md:flex items-center space-x-10">
          <a className="text-sm font-medium text-gray-400 hover:text-white transition-colors" href="#">Features</a>
          <a className="text-sm font-medium text-gray-400 hover:text-white transition-colors" href="#">Safety</a>
          <button 
            onClick={() => onNavigate('contact')}
            className="text-sm font-medium text-[#e9c349] hover:text-white transition-colors flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">support_agent</span>
            <span>Contact Us</span>
          </button>
          <button 
            onClick={() => onNavigate('auth', { tab: 'signup' })}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Client Sign Up
          </button>
          <button 
            onClick={() => onNavigate('live-tracking')}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full uppercase tracking-wider transition-all hover:bg-emerald-500/20"
          >
            <span className="material-symbols-outlined text-sm">radar</span>
            <span>Live GPS Radar</span>
          </button>
          <button 
            onClick={() => onNavigate('admin-portal')}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3.5 py-1.5 rounded-full uppercase tracking-wider transition-all hover:bg-amber-400/20"
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span>Admin Portal</span>
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('admin-portal')}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-black hover:bg-amber-400 bg-amber-400/10 border border-amber-400/40 px-2.5 sm:px-3 py-1.5 rounded-full uppercase tracking-wider transition-all"
            title="Administrator Fleet Command"
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span>Admin<span className="hidden sm:inline"> Portal</span></span>
          </button>
          <button 
            onClick={() => onNavigate('auth')}
            className="bg-[#e9c349] text-[#0c0f0f] px-3.5 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm tracking-wide hover:opacity-90 transition-opacity">
            Dashboard
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#e9c349] p-1 rounded hover:bg-white/5 transition-all focus:outline-none flex items-center justify-center"
            title="Menu"
          >
            <span className="material-symbols-outlined text-[24px]">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {/* Floating Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-[64px] left-0 w-full bg-[#131313] border-b border-white/10 p-6 space-y-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <a className="block text-sm font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors py-2 border-b border-white/5" href="#" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
            <a className="block text-sm font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors py-2 border-b border-white/5" href="#" onClick={() => setIsMobileMenuOpen(false)}>Safety</a>
            <button 
              onClick={() => { onNavigate('contact'); setIsMobileMenuOpen(false); }}
              className="w-full text-left block text-sm font-bold uppercase tracking-wider text-[#e9c349] hover:text-white transition-colors py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Contact Leadership</span>
              <span className="material-symbols-outlined text-sm">support_agent</span>
            </button>
            <button 
              onClick={() => { onNavigate('auth', { tab: 'signup' }); setIsMobileMenuOpen(false); }}
              className="w-full text-left block text-sm font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors py-2 border-b border-white/5"
            >
              Client Sign Up
            </button>
            <button 
              onClick={() => { onNavigate('live-tracking'); setIsMobileMenuOpen(false); }}
              className="w-full text-left block text-sm font-bold uppercase tracking-wider text-emerald-400 hover:text-white transition-colors py-2 border-b border-white/5 flex items-center justify-between"
            >
              <span>Live Vehicle GPS Radar</span>
              <span className="material-symbols-outlined text-sm">radar</span>
            </button>
            <button 
              onClick={() => { onNavigate('admin-portal'); setIsMobileMenuOpen(false); }}
              className="w-full text-left block text-sm font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors py-2 flex items-center justify-between"
            >
              <span>Admin Portal (Fleet Provisioner)</span>
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            </button>
          </div>
        </div>
      )}

      <section className="max-w-6xl mx-auto text-center mb-16 relative z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-8 leading-tight">
          <span className="text-gradient-slate block">Experience luxury.</span>
          <span className="text-gradient-slate">Deep green. </span>
          <span className="text-[#e9c349]">
            <TextType
              text={[
                "Gold. Premium rides in Liberia.",
                "Executive Chauffeur Service.",
                "Safe, Timely, Elite Mobility.",
                "Obsidian Executive Transport."
              ]}
              typingSpeed={55}
              deletingSpeed={30}
              pauseDuration={2200}
              loop={true}
              cursorCharacter="|"
              cursorClassName="text-[#e9c349] font-light ml-1"
            />
          </span>
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button 
            onClick={() => onNavigate('auth')}
            className="relative group cursor-pointer w-full sm:w-auto"
          >
            <div className="absolute -inset-0.5 bg-[#e9c349] rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative px-8 py-3 bg-transparent border-2 border-[#e9c349] rounded-full text-[#e9c349] font-bold text-sm tracking-wide text-center">
              Register for Launch
            </div>
          </button>
          <button 
            onClick={() => onNavigate('admin-portal')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/40 text-sm font-bold tracking-wide transition-all shadow-lg shadow-amber-400/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-amber-400">admin_panel_settings</span>
            <span>Admin Login Portal</span>
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20 relative z-10">
        {FLEET.map(fleet => {
          const isActive = selectedVehicleId === fleet.id;
          return (
            <div 
              key={fleet.id}
              onClick={() => onSelectVehicle(fleet.id)}
              className={`glass-card service-card p-6 flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 ${isActive ? 'glass-card-active' : 'hover:border-white/20'}`}
              style={{ transform: isActive ? 'skewX(-10deg) translateY(-5px)' : 'skewX(-10deg) translateY(0px)' }}
            >
              {isActive && (
                <div className="absolute top-0 right-0 p-2 transform -translate-y-4 translate-x-4">
                  <svg className="w-6 h-6 text-[#e9c349]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"></path>
                  </svg>
                </div>
              )}
              <div className={`h-24 flex items-center justify-center mb-4 ${isActive ? 'scale-110 transition-transform' : ''}`}>
                <img alt={fleet.name} className="w-full h-auto object-contain" src={fleet.image} />
              </div>
              <span className={`font-bold text-lg ${isActive ? 'text-[#e9c349]' : 'text-white'}`}>{fleet.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  let role = 'rider';
                  if (fleet.id === 'taxi') role = 'chauffeur';
                  onJoinPartner(role);
                }}
                className="mt-4 text-[10px] font-bold text-primary border border-primary/20 bg-primary/5 px-3 py-1 rounded-sm uppercase tracking-widest hover:bg-primary/20 transition-all opacity-60 hover:opacity-100"
              >
                Partner Hub
              </button>
            </div>
          );
        })}
      </section>
      
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mb-16">
        <div className="glass-card p-8 flex items-start space-x-6">
          <div className="flex-shrink-0 w-24 h-24 relative">
            <div className="absolute inset-0 bg-[#e9c349] opacity-10 blur-xl rounded-full"></div>
            <div className="relative w-full h-full glass-card flex items-center justify-center border-[#e9c349]/30">
              <img alt="Safety" className="w-12 h-12" src="https://i.ibb.co/HfmGV9MK/Screenshot-2026-05-08-234741.png" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Safety first.</h3>
            <p className="text-gray-400 leading-relaxed font-sans font-medium text-sm">Every vehicle meets our premium standards. Your journey is protected by state-of-the-art security protocols.</p>
          </div>
        </div>
        <div className="glass-card p-8 flex items-start space-x-6">
          <div className="flex-shrink-0 w-24 h-24 relative">
            <div className="absolute inset-0 bg-[#e9c349] opacity-10 blur-xl rounded-full"></div>
            <div className="relative w-full h-full glass-card flex items-center justify-center border-[#e9c349]/30">
              <img alt="Trusted" className="w-12 h-12" src="https://i.ibb.co/GXhgNqN/Screenshot-2026-05-08-234807.png" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Trusted rides.</h3>
            <p className="text-gray-400 leading-relaxed font-sans font-medium text-sm">Expert drivers, live GPS tracking, and 24/7 concierge support for a seamless experience across Liberia.</p>
          </div>
        </div>
      </section>

      {/* Dedicated Contact Us Section on Landing Page */}
      <section id="contact-us-section" className="max-w-6xl mx-auto px-4 relative z-10 mb-12">
        <div className="glass-card p-8 md:p-10 border border-[#e9c349]/30 bg-gradient-to-b from-[#141818]/90 to-[#0c0f0f]/90 rounded-2xl shadow-2xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#e9c349]/30 bg-[#e9c349]/10 text-[#e9c349] text-[10px] font-mono font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">support_agent</span>
              <span>Executive & Technical Contacts</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bodoni font-bold text-white tracking-tight">
              Contact <span className="text-[#e9c349]">Leadership</span>
            </h2>
            <p className="text-xs md:text-sm text-gray-400 font-sans">
              Connect directly via WhatsApp or phone with our executive and engineering leadership teams in Monrovia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CEO Card */}
            <div className="bg-black/50 border border-white/10 hover:border-[#e9c349]/40 p-6 rounded-xl space-y-4 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#e9c349]/40 bg-[#e9c349]/10 text-[#e9c349] inline-block mb-1.5">
                    Executive Direct Line
                  </span>
                  <h3 className="text-xl font-bodoni font-bold text-white group-hover:text-[#e9c349] transition-colors">
                    Mr. Collins
                  </h3>
                  <p className="text-xs text-[#e9c349] font-bold uppercase tracking-wider">
                    Chief Executive Officer
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Corporate Partnerships, VIP Concierge & Strategic Inquiries
                  </p>
                </div>
                <span className="text-xl bg-white/5 border border-white/10 p-1.5 rounded-lg shrink-0">🇱🇷</span>
              </div>

              <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white tracking-wider">+231 770 291 424</span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold">● Active WhatsApp</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="https://wa.me/231770291424?text=Hello%20CEO%20Mr.%20Collins%2C%20I%20am%20reaching%20out%20regarding%20Liberia%20Ride%20Elite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider transition-all"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.549 1.767.818 2.796.818 3.18 0 5.767-2.587 5.767-5.766.001-3.182-2.585-5.769-5.767-5.769zm10.165 5.767c-.002 6.09-4.945 11.033-11.034 11.033-1.936 0-3.791-.506-5.419-1.468l-6.043 1.584 1.616-5.899c-1.054-1.699-1.61-3.666-1.61-5.684.002-6.09 4.945-11.034 11.035-11.034 6.09 0 11.035 4.945 11.055 11.035z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <a
                  href="tel:+231770291424"
                  className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider transition-all"
                >
                  <span className="material-symbols-outlined text-sm text-[#e9c349]">call</span>
                  <span>Direct Call</span>
                </a>
              </div>
            </div>

            {/* Tech Manager Card */}
            <div className="bg-black/50 border border-white/10 hover:border-emerald-500/40 p-6 rounded-xl space-y-4 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 inline-block mb-1.5">
                    Engineering & Systems
                  </span>
                  <h3 className="text-xl font-bodoni font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Mr. Howe
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Technical & Systems Manager
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Fleet Telemetry, GPS Systems, App Tech Support & Platform APIs
                  </p>
                </div>
                <span className="text-xl bg-white/5 border border-white/10 p-1.5 rounded-lg shrink-0">🌍</span>
              </div>

              <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white tracking-wider">+250 796 569 416</span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold">● Active WhatsApp</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="https://wa.me/250796569416?text=Hello%20Tech%20Manager%20Mr.%20Howe%2C%20I%20am%20inquiring%20about%20the%20Liberia%20Ride%20Elite%20platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider transition-all"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.549 1.767.818 2.796.818 3.18 0 5.767-2.587 5.767-5.766.001-3.182-2.585-5.769-5.767-5.769zm10.165 5.767c-.002 6.09-4.945 11.033-11.034 11.033-1.936 0-3.791-.506-5.419-1.468l-6.043 1.584 1.616-5.899c-1.054-1.699-1.61-3.666-1.61-5.684.002-6.09 4.945-11.034 11.035-11.034 6.09 0 11.035 4.945 11.055 11.035z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <a
                  href="tel:+250796569416"
                  className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider transition-all"
                >
                  <span className="material-symbols-outlined text-sm text-[#e9c349]">call</span>
                  <span>Direct Call</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e9c349] text-base">location_on</span>
              <span>Monrovia Operations HQ • Broad Street & Mamba Point Corridors</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('admin-portal')}
                className="text-amber-400 hover:text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400/20 transition-all"
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                <span>Admin Login Portal</span>
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-[#e9c349] hover:underline font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <span>Dispatch & Contact</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pinned Quick Admin Portal Access Pill */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => onNavigate('admin-portal')}
          className="flex items-center gap-2 bg-[#0c0f0f]/95 hover:bg-black text-amber-400 border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md group"
          title="Direct Access to Administrator Fleet Command Portal"
        >
          <span className="material-symbols-outlined text-base text-amber-400 group-hover:rotate-12 transition-transform">admin_panel_settings</span>
          <span>Admin Portal</span>
        </button>
      </div>
    </div>
  );
};

const AuthPage = ({ onAuthSuccess, onNavigate, drivers, initialTab = 'login', initialTier = 'Normal' }: any) => {
  const [isLogin, setIsLogin] = useState(initialTab === 'login');
  const [name, setName] = useState('');
  const [clientTier, setClientTier] = useState<'Normal' | 'VIP'>(initialTier || 'Normal');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    // Validation
    if (!isLogin && (!name || !name.trim())) {
      setAuthError("Validation Error: Full Legal Name is required to register as a client.");
      setIsLoading(false);
      return;
    }
    if (!email || !email.trim()) {
      setAuthError("Validation Error: Email Identity or ID is required.");
      setIsLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Validation Error: Security Key must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      let userCredential;
      if (isLogin) {
        const cleanEmail = email.trim().toLowerCase();
        // Check if administrator is logging in
        if (cleanEmail === 'africahowe@gmail.com' || cleanEmail === 'admin@liberiaride.com' || cleanEmail.includes('africahowe') || cleanEmail.includes('admin')) {
          setIsLoading(false);
          onNavigate('admin-portal');
          return;
        }

        // Check if this account belongs to an official driver, rider, kekeh operator, or admin in the fleet roster
        const lowerEmail = email.trim().toLowerCase();
        const existingFleetAccount = drivers?.find((d: any) => {
          if (!d || d.id === 'active_trip') return false;
          const dEmail = (d.email || '').toLowerCase();
          const dPhone = (d.phone || '').toLowerCase();
          const dPlate = (d.plate || '').toLowerCase();
          return dEmail === lowerEmail || dPhone === lowerEmail || dPlate === lowerEmail || d.id?.toLowerCase() === lowerEmail;
        }) || findProductionDriver(email);

        if (existingFleetAccount) {
          const check = verifyStrictPortalAccess(existingFleetAccount, 'client');
          if (!check.allowed) {
            setAuthError(check.error || "Security Restriction: Official fleet drivers and operators cannot log into the Passenger Client Portal.");
            setIsLoading(false);
            return;
          }
        }

        // Real Login using Firebase Auth!
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userObj = userCredential.user;
        
        // Find existing client profile in the real-time system database (drivers collection)
        const profile = drivers?.find((d: any) => d.id === userObj.uid || (d.email && d.email.toLowerCase() === userObj.email?.toLowerCase()));
        
        if (profile) {
          const clientCheck = verifyStrictPortalAccess(profile, 'client');
          if (!clientCheck.allowed) {
            setAuthError(clientCheck.error || "Security Restriction: This account is registered as a fleet operator and cannot access the Passenger Client Portal.");
            setIsLoading(false);
            return;
          }

          const tier = profile.clientTier || (profile.rating?.toLowerCase().includes('vip') ? 'VIP' : 'Normal');
          const rating = profile.rating || (tier === 'VIP' ? 'VIP Premium Member' : 'Normal Client Member');
          localStorage.setItem(`obsidian_tier_${userObj.uid}`, tier);
          localStorage.setItem(`obsidian_rating_${userObj.uid}`, rating);

          onAuthSuccess({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role || 'Client',
            clientTier: tier,
            rating: rating,
            avatar: profile.avatar || ''
          });
        } else {
          // Fallback & automatic seeding if profile is missing in DB
          localStorage.setItem(`obsidian_tier_${userObj.uid}`, 'Normal');
          localStorage.setItem(`obsidian_rating_${userObj.uid}`, 'Normal Client Member');

          const defaultClient = {
            id: userObj.uid,
            name: userObj.displayName || (email && email.includes('@') ? email.split('@')[0] : 'Passenger'),
            email: (userObj.email || email || '').trim().toLowerCase(),
            role: 'Client',
            rating: 'Normal Client Member',
            clientTier: 'Normal',
            avatar: ''
          };
          await saveDriverToFirestore(defaultClient);
          onAuthSuccess(defaultClient);
        }
      } else {
        // Real Client Signup using Firebase Auth!
        const cleanEmail = email.trim().toLowerCase();
        let isDuplicate = drivers?.some((d: any) => {
          const dEmail = (d.email || '').trim().toLowerCase();
          const dPhone = (d.phone || '').trim().toLowerCase();
          return dEmail === cleanEmail || dPhone === cleanEmail;
        });

        if (!isDuplicate) {
          isDuplicate = await checkDuplicateIdentity(cleanEmail);
        }

        if (isDuplicate) {
          setAuthError("This Email Identity is already registered. Please sign in instead.");
          setIsLoading(false);
          return;
        }

        userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const userObj = userCredential.user;

        const ratingStr = clientTier === 'VIP' ? 'VIP Premium Member' : 'Normal Client Member';
        localStorage.setItem(`obsidian_tier_${userObj.uid}`, clientTier);
        localStorage.setItem(`obsidian_rating_${userObj.uid}`, ratingStr);

        const newClient = {
          id: userObj.uid,
          name: name.trim(),
          email: cleanEmail,
          role: 'Client',
          rating: ratingStr,
          clientTier: clientTier,
          avatar: ''
        };
        await saveDriverToFirestore(newClient);
        onAuthSuccess(newClient);
      }
    } catch (error: any) {
      const errStr = (error?.code || "") + " " + (error?.message || "");
      console.warn("Firebase Auth Warning Handled:", errStr);
      let friendlyMessage = error?.message || "An error occurred during authentication.";

      if (errStr.includes('invalid-credential') || errStr.includes('wrong-password') || errStr.includes('user-not-found')) {
        friendlyMessage = isLogin 
          ? "Incorrect Security Key or Email Identity. If you are a new passenger, click 'Create Client Account' to register."
          : "Could not create account with these credentials.";
      } else if (errStr.includes('weak-password')) {
        friendlyMessage = "The Security Key must be at least 6 characters.";
      } else if (errStr.includes('email-already-in-use')) {
        friendlyMessage = "This Email Identity is already registered. Try logging in instead.";
      } else if (errStr.includes('too-many-requests')) {
        friendlyMessage = "Access is temporarily locked due to too many failed login attempts. Please try again soon.";
      } else if (errStr.includes('invalid-email')) {
        friendlyMessage = "Invalid format for Email Identity.";
      }

      setAuthError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/30 text-on-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Top Left Exit Button */}
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 duration-200 shadow-[0_0_15px_rgba(255,191,116,0.1)] font-sans text-[10px] font-bold uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-sm leading-none">logout</span>
          <span>Exit Portal</span>
        </button>
      </div>

      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-bodoni text-4xl tracking-[0.2em] text-primary uppercase font-bold cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('landing')}>OBSIDIAN</h1>
          <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-[0.3em] opacity-60">
            {isLogin ? 'Premium Client Access' : 'Create Client Account'}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6 amber-glow backdrop-blur-2xl">
          {/* Tab Switcher: Sign In vs Create Client Account vs Admin Portal */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setAuthError(null); }}
              className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                isLogin ? 'bg-primary text-black shadow-md font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setAuthError(null); }}
              className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                !isLogin ? 'bg-primary text-black shadow-md font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin-portal')}
              className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 text-amber-400 hover:text-black hover:bg-amber-400 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
              <span>Admin</span>
            </button>
          </div>

          {/* Role Policy Notice Banner */}
          {!isLogin ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-base">person_add</span>
                <div>
                  <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Client Self-Registration</p>
                  <p className="text-[10px] text-emerald-400/80">Passengers register personal accounts directly</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded uppercase border border-emerald-400/30">
                Client Only
              </span>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">lock</span>
                <div>
                  <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Obsidian Client Access</p>
                  <p className="text-[10px] text-gray-400">Sign in with your email or ID</p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase border border-primary/20">
                Secure
              </span>
            </div>
          )}

          {authError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-200 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="material-symbols-outlined text-red-500 mt-0.5 shrink-0 select-none">error_outline</span>
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-red-400 font-mono mb-1">Notice</p>
                <p className="font-light leading-relaxed text-xs">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-2">Full Legal Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Patricia Tweh"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-2">Email Identity / ID</label>
              <input 
                type="text" 
                placeholder="name@domain.com or ID"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
              />
            </div>

            {email && (email.toLowerCase().includes('admin') || email.toLowerCase().includes('africahowe')) && (
              <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-sm text-amber-400">admin_panel_settings</span>
                  Administrator Identity Detected
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-portal')}
                  className="px-2.5 py-1 bg-amber-400 text-black font-bold rounded text-[10px] uppercase hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Go to Admin Portal →
                </button>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Security Key</label>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{isLogin ? 'Admin or User Key' : 'Min 6 Characters'}</span>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
              />
            </div>

            {!isLogin && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 ml-2">Client Membership Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientTier('Normal')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      clientTier === 'Normal'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block text-white">Normal Member</span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Standard Executive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientTier('VIP')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      clientTier === 'VIP'
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-300 block">VIP Member</span>
                    <span className="text-[9px] text-amber-400/70 block mt-0.5">Priority Chauffeur</span>
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 group active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 disabled:active:scale-100 mt-6 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
              ) : (
                <span className="uppercase tracking-[0.2em] text-[10px]">
                  {isLogin ? 'Access Portal' : 'Register Client Account'}
                </span>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('admin-portal')}
              className="w-full py-3 px-4 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-400/5"
            >
              <span className="material-symbols-outlined text-base text-amber-400">admin_panel_settings</span>
              <span>Open Administrator Login Portal</span>
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setAuthError(null); }}
                className="text-xs text-primary hover:underline font-bold transition-all cursor-pointer block w-full"
              >
                {isLogin ? "Don't have an account? Create Client Account" : "Already registered? Sign in here"}
              </button>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Driver, Rider, and Kekeh operator accounts are provisioned exclusively through the Admin Portal.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('landing')}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-60 hover:opacity-100 transition-all"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};

const getVehicleDetails = (driver: any) => {
  if (!driver) {
    return {
      type: 'Executive Sedan',
      name: 'Mercedes-Benz S-Class Prestige',
      image: 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png',
      amenities: ['Zoned Climate Control (20°C)', 'Smart Ambient Lighting', 'Complementary Acqua Panna water', 'Newspaper & Charging Bay'],
      specs: '6-Cylinder Twin-Turbo, Active cabin air filter'
    };
  }

  const roleLower = (driver.role || '').toLowerCase();
  const nameLower = (driver.name || '').toLowerCase();
  const vehicleLower = (driver.vehicle || '').toLowerCase();
  const idLower = (driver.id || '').toLowerCase();

  // Find the active vehicle from the driver's vehicle list, or the first one if none are marked active
  const activeVehicle = driver.vehiclesList?.find((v: any) => v.active) || driver.vehiclesList?.[0];
  
  // Custom vehicle details uploaded/configured by the partner
  const uploadedImage = activeVehicle?.image || driver.vehicleImage || driver.image;
  const rawVehicleName = activeVehicle?.name || driver.vehicle || '';
  const vehicleNameLower = rawVehicleName.toLowerCase();

  // Determine true classification strictly to protect visual accuracy:
  let classification: 'kekeh' | 'bike' | 'car' = 'car';

  if (roleLower === 'rider' || roleLower.includes('rider') || driver.vehicleType === 'bike' || driver.vehicleType === 'kekeh') {
    // Under Rider role, they are either a Kekeh or a Bike
    if (
      driver.vehicleType === 'kekeh' ||
      driver.plate === 'A1A2715' || 
      vehicleLower.includes('kekeh') || 
      vehicleLower.includes('tuk') || 
      vehicleLower.includes('keke') ||
      vehicleNameLower.includes('kekeh') || 
      vehicleNameLower.includes('tuk') || 
      vehicleNameLower.includes('keke')
    ) {
      classification = 'kekeh';
    } else {
      classification = 'bike';
    }
  } else {
    // Role is Chauffeur / Driver / default
    classification = 'car';
  }

  // Enforce classification protection: 
  // If they are a driver/chauffeur, only allow a car image.
  // If they are a bike/kekeh, represent the actual type.
  let imageToShow = uploadedImage;

  if (classification === 'kekeh') {
    // If the image to show doesn't exist, use the verified yellow Kekeh illustration
    if (!imageToShow) {
      imageToShow = 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png';
    }
    return {
      type: 'Premium Kekeh Ride',
      name: rawVehicleName || 'Kekeh Executive (Classic Yellow)',
      image: imageToShow,
      amenities: ['Monrovia Rain Canopy', 'USB Phone Charger', 'Verified Safe Helmsman', '4G Wi-Fi hotspot', 'Plush Seat Cushions'],
      specs: 'Fully electric drive, high maneuverability'
    };
  } else if (classification === 'bike') {
    // If the image to show doesn't exist, use the verified red luxury bike illustration
    if (!imageToShow) {
      imageToShow = 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png';
    }
    return {
      type: 'Luxury Bike Express',
      name: rawVehicleName || 'Luxury Bike Express (Red)',
      image: imageToShow,
      amenities: ['Rapid-transit bypass routes', 'Smart helmets provided', 'Zero emission transit', 'Chilled beverage holder', 'Traction Control'],
      specs: '80km/h max speed, dual motor suspension'
    };
  } else {
    // Must be a Car
    if (!imageToShow) {
      imageToShow = 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png';
    }
    return {
      type: 'Executive Chauffeur Sedan',
      name: rawVehicleName || 'Mercedes-Benz S-Class (Black Edition)',
      image: imageToShow,
      amenities: ['Zoned Climate Control (20°C)', 'Smart Ambient Lighting', 'Complementary Acqua Panna water', 'USB Fast-Charging Hub', 'Privacy glass'],
      specs: '6-Cylinder Twin-Turbo, Active Cabin Air Filter'
    };
  }
};

const getVehicleImage = (vehicleName: string) => {
  const nameLower = (vehicleName || '').toLowerCase();
  if (nameLower.includes('kekeh')) {
    return 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png';
  }
  if (nameLower.includes('bike')) {
    return 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png';
  }
  if (nameLower.includes('delivery')) {
    return 'https://i.ibb.co/WNvP6jQ4/Screenshot-2026-05-08-234709.png';
  }
  // Return Mercedes S-Class fallback
  return 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png';
};

// Elegant Currency formatters with thousands separators
export const formatUSD = (val: number): string => {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatLRD = (val: number): string => {
  return `${Math.round(val).toLocaleString('en-US')} LRD`;
};

// Visual badge for Active Trip status ('Waiting', 'In Transit', 'Completed') with color-coded styling
interface TripStatusBadgeProps {
  status: string;
  accepted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ 
  status, 
  accepted = false, 
  size = 'md', 
  className = '' 
}) => {
  let normalizedStatus: 'Waiting' | 'In Transit' | 'Completed' = 'Waiting';
  if (status === 'completed') {
    normalizedStatus = 'Completed';
  } else if (status === 'transit' || status === 'in_transit') {
    normalizedStatus = 'In Transit';
  } else {
    normalizedStatus = 'Waiting';
  }

  const configs = {
    'Waiting': {
      label: accepted ? 'Waiting • Driver En Route' : 'Waiting • Awaiting Approval',
      shortLabel: 'Waiting',
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-400/50',
      text: 'text-yellow-300',
      dotBg: 'bg-yellow-400',
      icon: 'hourglass_top',
      glow: 'shadow-[0_0_14px_rgba(234,179,8,0.25)]',
    },
    'In Transit': {
      label: 'In Transit • Active Voyage',
      shortLabel: 'In Transit',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-400/50',
      text: 'text-emerald-300',
      dotBg: 'bg-emerald-400',
      icon: 'navigation',
      glow: 'shadow-[0_0_14px_rgba(16,185,129,0.25)]',
    },
    'Completed': {
      label: 'Completed • Arrived Safely',
      shortLabel: 'Completed',
      bg: 'bg-sky-500/15',
      border: 'border-sky-400/50',
      text: 'text-sky-300',
      dotBg: 'bg-sky-400',
      icon: 'verified',
      glow: 'shadow-[0_0_14px_rgba(14,165,233,0.25)]',
    }
  };

  const config = configs[normalizedStatus];

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-0.5 text-[9px] gap-1.5' 
    : size === 'lg' 
      ? 'px-4 py-2 text-xs gap-2.5 font-bold' 
      : 'px-3 py-1 text-[10px] gap-2 font-bold';

  return (
    <div className={`inline-flex items-center rounded-full border backdrop-blur-md font-mono uppercase tracking-wider transition-all duration-300 ${config.bg} ${config.border} ${config.text} ${config.glow} ${sizeClasses} ${className}`}>
      <span className="relative flex h-2 w-2">
        {normalizedStatus !== 'Completed' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotBg}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotBg}`}></span>
      </span>
      <span className="material-symbols-outlined text-[13px] leading-none">
        {config.icon}
      </span>
      <span>
        {size === 'sm' ? config.shortLabel : config.label}
      </span>
    </div>
  );
};

// Static route preview component showing start and end points of the trip before live tracking takes over
interface StaticRouteMapPreviewProps {
  pickup: string;
  destination: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  vehicleType?: string;
  onSwitchToLive?: () => void;
}

export const StaticRouteMapPreview: React.FC<StaticRouteMapPreviewProps> = ({
  pickup = "Sinkor, Monrovia",
  destination = "Mamba Point Hotel",
  pickupLat = 6.3156,
  pickupLng = -10.8074,
  destinationLat = 6.3006,
  destinationLng = -10.8124,
  vehicleType = "car",
  onSwitchToLive
}) => {
  const dLat = (destinationLat - pickupLat) * 111;
  const dLng = (destinationLng - pickupLng) * 111 * Math.cos(pickupLat * (Math.PI / 180));
  const estimatedKm = Math.max(1.2, Math.sqrt(dLat * dLat + dLng * dLng) * 1.35).toFixed(1);
  const estimatedMinutes = Math.max(4, Math.round(parseFloat(estimatedKm) * 3.2));

  return (
    <div className="relative w-full h-[280px] bg-[#090b0e] rounded-xl overflow-hidden border border-[#e9c349]/25 flex flex-col justify-between p-3.5 sm:p-4 group select-none shadow-2xl">
      {/* Background Cartographic Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(233, 195, 73, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(233, 195, 73, 0.15) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 65%)
          `,
          backgroundSize: '24px 24px, 24px 24px, 100% 100%'
        }}
      />

      {/* Stylized Coastal Waterline & Street Corridors SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="45%" stopColor="#e9c349" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Coastal boundary silhouette */}
        <path d="M 0,230 Q 90,190 180,210 T 360,170 T 540,200 T 800,150 L 800,280 L 0,280 Z" fill="rgba(14, 165, 233, 0.07)" />
        <path d="M 0,230 Q 90,190 180,210 T 360,170 T 540,200 T 800,150" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.5" strokeDasharray="5 5" fill="none" />

        {/* Secondary street grid lines */}
        <line x1="20" y1="45" x2="700" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="40" y1="95" x2="750" y2="95" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="30" y1="185" x2="720" y2="185" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="140" y1="10" x2="140" y2="270" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="380" y1="10" x2="380" y2="270" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="600" y1="10" x2="600" y2="270" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Major Arterial Route Corridor Line */}
        <path 
          d="M 90,95 C 180,90 220,145 310,150 S 440,115 540,130 S 660,175 740,165" 
          stroke="rgba(233, 195, 73, 0.18)" 
          strokeWidth="6" 
          fill="none" 
          strokeLinecap="round" 
        />
        
        {/* Active Trip Trajectory Path from Start Pin to End Pin */}
        <path 
          d="M 95,95 C 185,90 235,145 325,145 S 445,120 520,138" 
          stroke="url(#routeGradient)" 
          strokeWidth="3.5" 
          fill="none" 
          strokeLinecap="round"
          strokeDasharray="6 3"
          filter="url(#routeGlow)"
        />

        {/* Intermediate waypoint beads */}
        <circle cx="215" cy="110" r="3.5" fill="#e9c349" opacity="0.9" />
        <circle cx="325" cy="145" r="3.5" fill="#e9c349" opacity="0.9" />
        <circle cx="435" cy="128" r="3.5" fill="#e9c349" opacity="0.9" />
      </svg>

      {/* Top Header Controls: Badge & Live GPS Toggle */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] font-mono font-bold text-gray-300 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-white uppercase tracking-wider">Static Route Preview</span>
          <span className="text-gray-500">•</span>
          <span className="text-[#e9c349] font-mono">{estimatedKm} km (~{estimatedMinutes} min)</span>
        </div>

        {onSwitchToLive && (
          <button
            onClick={onSwitchToLive}
            className="flex items-center gap-1.5 bg-[#e9c349]/15 hover:bg-[#e9c349] text-[#e9c349] hover:text-[#0c0f0f] border border-[#e9c349]/40 hover:border-transparent px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer group/btn"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Switch to Live GPS</span>
            <span className="material-symbols-outlined text-[12px] group-hover/btn:translate-x-0.5 transition-transform">arrow_forward</span>
          </button>
        )}
      </div>

      {/* Mid Canvas: Start Pin (A) and End Pin (B) Overlay Elements */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-between px-3 sm:px-10 my-auto">
        {/* Start Point Pin (A) */}
        <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500 max-w-[155px]">
          <div className="relative mb-2">
            <div className="absolute -inset-2 bg-emerald-500/20 rounded-full animate-ping"></div>
            <div className="w-9 h-9 rounded-full bg-emerald-950/90 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]">
              <span className="font-mono font-black text-xs">A</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rotate-45"></div>
          </div>
          <div className="bg-black/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-emerald-500/40 shadow-xl">
            <p className="text-[8px] uppercase tracking-widest text-emerald-400 font-extrabold font-mono flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[10px]">trip_origin</span>
              <span>Start Point</span>
            </p>
            <p className="text-[11px] font-bold text-white truncate max-w-[130px] leading-tight mt-0.5" title={pickup}>{pickup}</p>
            <p className="text-[8px] text-gray-400 font-mono mt-0.5">{pickupLat.toFixed(4)}°N, {Math.abs(pickupLng).toFixed(4)}°W</p>
          </div>
        </div>

        {/* Route Midpoint Compass Capsule */}
        <div className="hidden sm:flex flex-col items-center justify-center bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-center shadow-lg">
          <div className="flex items-center gap-1.5 text-[10px] text-[#e9c349] font-mono font-bold">
            <span className="material-symbols-outlined text-[13px] text-[#e9c349]">alt_route</span>
            <span>Monrovia Corridor</span>
          </div>
          <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider">Start ➔ End Vector</span>
        </div>

        {/* End Point Pin (B) */}
        <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500 max-w-[155px]">
          <div className="relative mb-2">
            <div className="absolute -inset-2 bg-yellow-500/20 rounded-full animate-ping" style={{ animationDelay: '500ms' }}></div>
            <div className="w-9 h-9 rounded-full bg-yellow-950/90 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.6)]">
              <span className="font-mono font-black text-xs">B</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45"></div>
          </div>
          <div className="bg-black/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-yellow-500/40 shadow-xl">
            <p className="text-[8px] uppercase tracking-widest text-yellow-400 font-extrabold font-mono flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[10px]">sports_score</span>
              <span>End Point</span>
            </p>
            <p className="text-[11px] font-bold text-white truncate max-w-[130px] leading-tight mt-0.5" title={destination}>{destination}</p>
            <p className="text-[8px] text-gray-400 font-mono mt-0.5">{destinationLat.toFixed(4)}°N, {Math.abs(destinationLng).toFixed(4)}°W</p>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info Bar */}
      <div className="relative z-10 flex items-center justify-between bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 text-[9px] text-gray-400 font-mono">
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <span className="material-symbols-outlined text-[12px]">check_circle</span>
          <span>Pickup Locked</span>
        </span>
        <span className="text-gray-500 hidden sm:inline">•</span>
        <span className="hidden sm:inline text-gray-300">Liberia GPS Verified Corridors</span>
        <span className="text-gray-500">•</span>
        <span className="flex items-center gap-1 text-yellow-400 font-bold">
          <span className="material-symbols-outlined text-[12px]">flag</span>
          <span>Destination Set</span>
        </span>
      </div>
    </div>
  );
};

const ClientPortal = ({ onNavigate, currentUser, activeChatDriverId, setActiveChatDriverId, onLogout, drivers, selectedVehicleId, setSelectedVehicleId, activeTripState, setActiveTripState, language, setLanguage }: any) => {
  const [timeLeft, setTimeLeft] = useState(253); // 4:13 in seconds
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProfileDriver, setSelectedProfileDriver] = useState<any>(null);
  const [pickupLoc, setPickupLoc] = useState('Sinkor, Monrovia');
  const [destLoc, setDestLoc] = useState('Mamba Point Hotel');

  // ETA tracking storage
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaDistance, setEtaDistance] = useState<number | null>(null);

  // Map view toggle: static route preview vs live GPS tracking
  const [mapViewMode, setMapViewMode] = useState<'static' | 'live'>(() => {
    return activeTripState?.status === 'transit' ? 'live' : 'static';
  });

  // Post-trip Chauffeur Feedback & Summary states
  const [showPostTripModal, setShowPostTripModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [customStopover, setCustomStopover] = useState<string>('');

  useEffect(() => {
    if (activeTripState?.status === 'transit') {
      setMapViewMode('live');
    } else if (activeTripState?.status === 'completed' && !feedbackSubmitted) {
      setShowPostTripModal(true);
    }
  }, [activeTripState?.status, feedbackSubmitted]);

  // Pool passenger preset entries and state
  const [simulatedPoolRequest, setSimulatedPoolRequest] = useState<any>(null);
  const [customPoolName, setCustomPoolName] = useState('');

  const POOL_PRESETS = [
    { name: "Madam Mary Broh", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk" },
    { name: "Cllr. Pearl Brown Bull", avatar: "https://lh3.googleusercontent.com/a/ALm5wu3X6M4LzKqEwS7O6b6_z12o-iX7_mZInLh4pC_C=s96-c" },
    { name: "Hon. Alexander Cummings", avatar: "https://lh3.googleusercontent.com/a/default-user" },
    { name: "Dr. Robtel Neajai Pailey", avatar: "https://lh3.googleusercontent.com/a/default-user" }
  ];

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "ARRIVED";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe defaults
  const user = currentUser || {
    name: 'Passenger',
    rating: 'Member',
    avatar: ''
  };

  const currentVehicleObj = FLEET.find(f => f.id === selectedVehicleId) || FLEET[2];
  const actualDriversOnly = (drivers || []).filter((d: any) => d.role?.toLowerCase() !== 'client');
  const findDriverForVehicle = (vId: string) => {
    if (vId === 'taxi') {
      return actualDriversOnly.find((d: any) => d.vehicleType === 'taxi' || d.role === 'Chauffeur' || d.plate?.startsWith('T')) || actualDriversOnly[0];
    }
    if (vId === 'bike') {
      return actualDriversOnly.find((d: any) => d.vehicleType === 'bike' || d.plate === 'M4718' || (d.vehicle || '').toLowerCase().includes('bike')) || actualDriversOnly.find((d: any) => d.role === 'Rider') || actualDriversOnly[0];
    }
    if (vId === 'kekeh') {
      return actualDriversOnly.find((d: any) => d.vehicleType === 'kekeh' || d.plate === 'A1A2715' || (d.vehicle || '').toLowerCase().includes('kekeh')) || actualDriversOnly.find((d: any) => d.role === 'Rider') || actualDriversOnly[0];
    }
    return actualDriversOnly[0];
  };

  const activeDriver = (activeTripState?.accepted && activeTripState?.acceptedBy)
    ? (actualDriversOnly.find((d: any) => d.id === activeTripState.acceptedBy) || findDriverForVehicle(selectedVehicleId))
    : findDriverForVehicle(selectedVehicleId);

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-16 relative overflow-hidden">
      {/* Background Floating Lines Effect - Client Portal Only */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-60">
        <FloatingLines
          linesGradient={['#e9c349', '#10b981', '#34d399', '#f59e0b', '#fbbf24']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[6, 8, 6]}
          lineDistance={[4, 5, 4]}
          animationSpeed={0.8}
          interactive={true}
          bendRadius={5.0}
          bendStrength={-0.5}
          mouseDamping={0.05}
          parallax={true}
          parallaxStrength={0.2}
          mixBlendMode="screen"
        />
        <div className="absolute w-[1000px] h-[600px] bg-[radial-gradient(circle,rgba(16,185,129,0.08)_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[100px]"></div>
        <div className="absolute w-[800px] h-[400px] bg-[radial-gradient(circle,rgba(233,195,73,0.05)_0%,transparent_70%)] -bottom-[100px] -right-[100px] blur-[80px]"></div>
      </div>

      <div className="relative z-10">
        {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-8 h-16 w-full">
        <button 
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 duration-200 shadow-[0_0_15px_rgba(255,191,116,0.1)] hover:shadow-[0_0_20px_rgba(255,191,116,0.25)] font-sans text-[11px] font-bold uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'wght' 500" }}>logout</span>
          <span>Logout</span>
        </button>
        <h1 className="font-bodoni text-2xl tracking-[0.2em] text-primary uppercase font-bold">OBSIDIAN</h1>
        
        <div className="flex items-center gap-3">
          {/* Liberia English Badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full py-1 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Liberia • EN</span>
          </div>

          {/* Dropdown Menu Toggle */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full border border-primary/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer focus:outline-none"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/30 bg-surface-container-high flex items-center justify-center">
                {user.avatar ? (
                  <img alt="client portrait" className="w-full h-full object-cover" src={user.avatar} referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] font-bold text-primary">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#e9c349] hidden xs:block">Menu</span>
              <span className={`material-symbols-outlined text-xs text-[#e9c349] transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-high/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-white/5 mb-2">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Obsidian Access</p>
                    <p className="text-xs text-on-surface font-bold truncate mt-0.5">{user.name}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      onNavigate('client-portal');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">directions_car</span>
                    <span className="uppercase tracking-wider text-[10px]">Fleet Discovery</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('chat');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">chat_bubble</span>
                    <span className="uppercase tracking-wider text-[10px]">Direct Dispatch</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('live-tracking');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-emerald-400">radar</span>
                    <span className="uppercase tracking-wider text-[10px]">Live GPS Radar</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('trip');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">timer</span>
                    <span className="uppercase tracking-wider text-[10px]">Trip Status</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('profile');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">person</span>
                    <span className="uppercase tracking-wider text-[10px]">Client Profile</span>
                  </button>

                  <div className="h-[1px] bg-white/5 my-2"></div>

                  <button 
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="uppercase tracking-wider text-[10px]">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-4 md:px-12 max-w-7xl mx-auto space-y-12">
        {/* User Welcome Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-primary font-bold text-[10px] tracking-widest uppercase opacity-80">{getTranslation(language, 'welcome_back')}, {(user.name || 'Passenger').split(' ')[0]}</p>
            <h2 className="font-bodoni text-4xl md:text-5xl text-on-surface font-bold">{getTranslation(language, 'fleet_discovery')}</h2>
          </div>
          <div className="glass-panel p-4 rounded-xl flex items-center gap-4 w-fit border border-white/5">
            <div className="relative group cursor-pointer" onClick={() => onNavigate('profile')}>
              <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/30 bg-surface-container-high flex items-center justify-center">
                {user.avatar ? (
                  <img alt="User portrait" className="w-full h-full object-cover" src={user.avatar} referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-lg font-bodoni font-bold text-primary">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div>
              <p className="font-bodoni text-xl font-bold text-on-surface leading-tight">{user.name}</p>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest opacity-60">{user.rating}</p>
            </div>
          </div>
        </section>

        {/* Dynamic Booking & Active Trip Status section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(!activeTripState || (activeTripState.status === 'completed' && feedbackSubmitted) || activeTripState.elapsedTime === 0) ? (
            <div className="lg:col-span-2 glass-panel p-8 rounded-xl relative overflow-hidden amber-glow group border border-white/5 space-y-6">
              <div>
                <span className="text-[10px] text-[#e9c349] uppercase font-bold tracking-widest font-mono">[ Liberia Ride Dispatch Desk ]</span>
                <h3 className="font-bodoni text-3xl font-bold text-on-surface mt-1">{getTranslation(language, 'book_voyage')}</h3>
                <p className="text-xs text-on-surface-variant opacity-60 font-sans mt-0.5">{getTranslation(language, 'book_subtitle')}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#e9c349] uppercase font-bold tracking-wider font-mono">{getTranslation(language, 'pickup')}</label>
                    <input 
                      type="text" 
                      value={pickupLoc}
                      onChange={(e) => setPickupLoc(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-on-surface focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#e9c349] uppercase font-bold tracking-wider font-mono flex items-center justify-between">
                      <span>{getTranslation(language, 'destination')}</span>
                      <span className="text-gray-400 text-[9px] font-normal">Select or type location</span>
                    </label>
                    <input 
                      type="text" 
                      value={destLoc}
                      onChange={(e) => setDestLoc(e.target.value)}
                      placeholder="e.g. Mamba Point Hotel, RIA Airport..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-on-surface focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Quick Destination Location Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-gray-400 font-bold block">Popular Locations:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Mamba Point', 'RIA Airport', 'Boulevard Palace', 'Royal Grand', 'Farmington', 'Broad St', 'Red Light'].map((tag) => {
                      const locMatch = LIBERIA_PRESET_LOCATIONS.find(l => l.name.toLowerCase().includes(tag.toLowerCase()));
                      const isSelected = destLoc.toLowerCase().includes(tag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (locMatch) {
                              setDestLoc(locMatch.name);
                            } else {
                              setDestLoc(tag);
                            }
                          }}
                          className={`text-[9px] font-mono px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#e9c349]/20 border-[#e9c349] text-[#e9c349] font-bold shadow-sm'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          <span>{tag === 'RIA Airport' ? '✈️' : tag === 'Farmington' || tag === 'Boulevard Palace' || tag === 'Royal Grand' || tag === 'Mamba Point' ? '🏨' : '📍'}</span>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Selected Fleet Category</p>
                  <p className="text-xs font-bold text-[#e9c349] uppercase font-sans flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">directions_car</span>
                    {currentVehicleObj?.name || 'Luxury Sedan'}
                  </p>
                </div>
                <button 
                  onClick={async () => {
                    const matchedDest = LIBERIA_PRESET_LOCATIONS.find(l => l.name.toLowerCase() === destLoc.toLowerCase() || destLoc.toLowerCase().includes(l.name.toLowerCase()));
                    const targetLat = matchedDest ? matchedDest.lat : 6.3006;
                    const targetLng = matchedDest ? matchedDest.lng : -10.8124;

                    const nextTrip = {
                      status: 'ready',
                      isActive: false, 
                      elapsedTime: 0,
                      clientName: user.name || 'Passenger',
                      clientId: user.uid || user.id || 'passenger_guest',
                      pickup: pickupLoc,
                      pickupLat: 6.3156,
                      pickupLng: -10.8074,
                      destination: destLoc,
                      destinationLat: targetLat,
                      destinationLng: targetLng,
                      vehicleId: selectedVehicleId || 'taxi',
                      accepted: false,
                      acceptedBy: null,
                      acceptedByName: null,
                      started: false,
                    };
                    setFeedbackSubmitted(false);
                    setActiveTripState(nextTrip);
                    await saveActiveTripToFirestore(nextTrip);
                  }}
                  className="w-full sm:w-auto bg-[#e9c349] text-[#0c0f0f] font-bold px-8 py-3.5 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">hail</span>
                  Submit Booking Request
                </button>
              </div>
            </div>
          ) : (activeTripState.status === 'completed' && !feedbackSubmitted) ? (
            <div className="lg:col-span-2 glass-panel p-8 rounded-xl relative overflow-hidden group border border-amber-500/20 bg-amber-500/5 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-widest font-mono">[ Voyage Completed ]</span>
                  <h3 className="font-bodoni text-2xl font-bold text-on-surface mt-1">Grade Your Chauffeur Experience</h3>
                  <p className="text-xs text-on-surface-variant opacity-70 font-sans mt-0.5">Your luxury passage with Obsidian in Monrovia has concluded safely.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold font-sans self-start">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>PASSAGE SUCCESSFUL</span>
                </div>
              </div>

              {/* Chauffeur details */}
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 w-fit">
                <div className="w-14 h-14 rounded-full border-2 border-primary/40 overflow-hidden shrink-0 bg-neutral-900">
                  {activeDriver?.avatar ? (
                    <img src={activeDriver.avatar} alt={activeDriver.name || 'Driver'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-primary">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[9px] text-primary uppercase tracking-widest font-bold">{activeDriver?.role || 'Elite Chauffeur'}</p>
                  <h4 className="text-lg font-bold text-on-surface leading-tight">{activeDriver?.name || activeTripState.acceptedByName || 'Assigned Driver'}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{activeDriver?.vehicle || 'Premium Mercedes S-Class'}</p>
                </div>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Service Grading (1-5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="text-3xl focus:outline-none transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                    >
                      <span 
                        className="material-symbols-outlined select-none text-3xl"
                        style={{ 
                          fontVariationSettings: star <= feedbackRating ? "'FILL' 1" : "'FILL' 0",
                          color: star <= feedbackRating ? '#e9c349' : '#444444'
                        }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                  <span className="text-lg font-bold font-mono text-primary ml-2">{feedbackRating}.00 / 5.00</span>
                </div>
              </div>

              {/* Tag compliments */}
              <div className="space-y-2">
                <label className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Complimentary Traits</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Professional & Polite",
                    "Perfect Navigation",
                    "Pristine Vehicle Status",
                    "Chilled Water Premium",
                    "Ozone Clean Inside Room",
                    "Smooth Acceleration"
                  ].map((tag) => {
                    const isSelected = selectedFeedbackTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFeedbackTags(selectedFeedbackTags.filter(t => t !== tag));
                          } else {
                            setSelectedFeedbackTags([...selectedFeedbackTags, tag]);
                          }
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 duration-200 ${
                          isSelected 
                            ? 'bg-primary/20 border-primary text-primary font-bold' 
                            : 'bg-white/5 border-white/10 text-on-surface-variant hover:border-white/20'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chauffeur Service Tipping Selection */}
              <div className="space-y-2">
                <label className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Chauffeur Service Tip (USD)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 2, 5, 10, 20].map((tipVal) => (
                    <button
                      key={tipVal}
                      type="button"
                      onClick={() => setSelectedTip(tipVal)}
                      className={`py-2 px-1 text-xs font-mono font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedTip === tipVal
                          ? 'bg-[#e9c349]/20 border-[#e9c349] text-[#e9c349]'
                          : 'bg-white/5 border-white/10 text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      {tipVal === 0 ? 'No Tip' : `$${tipVal}.00`}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 items-center pt-1.5">
                  <span className="text-[10px] font-mono text-on-surface-variant opacity-75">Custom tip:</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-primary">$</span>
                    <input
                      type="number"
                      min="0"
                      value={selectedTip || ''}
                      onChange={(e) => setSelectedTip(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Custom tip amount..."
                      className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-6 pr-3 text-xs font-mono text-on-surface w-full focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Comment text area */}
              <div className="space-y-2">
                <label className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Chauffeur Operational Log notes</label>
                <textarea
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Insert any bespoke details, route comfort remarks or custom messages..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 h-20"
                />
              </div>

              {/* Submit trigger button */}
              <button
                onClick={async () => {
                  try {
                    const activeDriverDocId = activeTripState.acceptedBy || (drivers && drivers[0] ? drivers[0].id : '');
                    const driverToUpdate = (drivers || []).find((d: any) => d.id === activeDriverDocId);
                    
                    if (driverToUpdate) {
                      const currentRatingVal = parseFloat(driverToUpdate.rating) || 5.0;
                      const currentVotes = driverToUpdate.ratingCount || 50;
                      const nextRatingVal = ((currentRatingVal * currentVotes) + feedbackRating) / (currentVotes + 1);
                      const currentTips = parseFloat(driverToUpdate.tipsAccumulated) || 0.0;
                      const nextTipsVal = currentTips + selectedTip;
                      
                      const updatedDriver = {
                        ...driverToUpdate,
                        rating: nextRatingVal.toFixed(2),
                        ratingCount: currentVotes + 1,
                        tipsAccumulated: nextTipsVal,
                        updatedAt: new Date().toISOString()
                      };
                      await saveDriverToFirestore(updatedDriver);
                    }

                    // Reset shared active trip state completely so it clears in real time for everyone
                    const resetTrip = {
                      status: 'ready',
                      isActive: false,
                      elapsedTime: 0,
                      clientName: user.name || 'Passenger',
                      clientId: user.uid || user.id || 'passenger_guest',
                      pickup: pickupLoc,
                      pickupLat: 6.3156,
                      pickupLng: -10.8074,
                      destination: destLoc,
                      destinationLat: 6.3006,
                      destinationLng: -10.8124,
                      vehicleId: selectedVehicleId || 'taxi',
                      accepted: false,
                      acceptedBy: null,
                      acceptedByName: null,
                      started: false,
                      passengers: [],
                      amenities: [],
                      sosActive: false
                    };
                    
                    setFeedbackSubmitted(true);
                    setFeedbackRating(5);
                    setFeedbackComments('');
                    setSelectedFeedbackTags([]);
                    setSelectedTip(0);

                    setActiveTripState(resetTrip);
                    await saveActiveTripToFirestore(resetTrip);

                    alert(`Operational review successfully registered! Chauffeur's record grading is recalculated, and tip value is synced directly.`);
                  } catch (err) {
                    console.error("Failed to complete direct dispatch rating post-trip sync:", err);
                  }
                }}
                className="w-full bg-primary text-[#0c0f0f] font-bold py-3.5 rounded-xl uppercase tracking-widest text-[#0c0f0f] text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                Submit Performance Grading & Close Voyage
              </button>
            </div>
          ) : (
            <div className={`lg:col-span-2 glass-panel p-8 rounded-xl relative overflow-hidden group border transition-all duration-500 space-y-6 ${activeTripState.sosActive ? 'border-red-600 bg-red-950/20 shadow-[0_0_25px_rgba(220,38,38,0.25)] animate-pulse' : 'amber-glow border-white/5 bg-transparent'}`}>
              <div className="absolute top-0 right-0 p-6 flex items-center gap-2">
                {activeTripState.sosActive ? (
                  <span className="flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                  </span>
                ) : activeTripState.status === 'transit' ? (
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                ) : (
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                )}
              </div>

              {/* SOS Intensive Warning Header Banner */}
              {activeTripState.sosActive && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="h-10 w-10 bg-red-600/20 border border-red-500/40 rounded-full flex items-center justify-center shrink-0 text-red-500 animate-pulse">
                    <span className="material-symbols-outlined text-xl select-none leading-none">warning</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest font-mono select-none">🚨 PRIORITY ENHANCED SECURITY BROADCAST ON-AIR 🚨</p>
                    <p className="text-xs font-semibold text-white mt-0.5 leading-snug">Monrovia tactical dispatch network has locked your GPS coordinate path. Armed escort emergency teams standby synchronized. Stay calm, driver expects contact.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="space-y-4 flex-grow w-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-primary uppercase font-bold tracking-widest font-mono">[ Active Ride Registry ]</span>
                        <span className="text-[10px] text-gray-500 font-bold">•</span>
                        <TripStatusBadge status={activeTripState.status} accepted={activeTripState.accepted} size="md" />
                      </div>

                      {/* Map View Toggle Tabs: Static Route Preview vs Live Tracking */}
                      <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5 text-[9px] font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => setMapViewMode('static')}
                          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                            mapViewMode === 'static'
                              ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">route</span>
                          <span>Static Route Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapViewMode('live')}
                          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                            mapViewMode === 'live'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Live GPS Tracking</span>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bodoni text-2xl font-bold text-on-surface">
                      {!activeTripState.accepted 
                        ? getTranslation(language, 'waiting_approval') 
                        : `${activeTripState.acceptedByName || 'Driver'} ${getTranslation(language, 'driver_partner')}`}
                    </h3>
                    
                    {/* Vehicle profile details & Driver rating (rifting) */}
                    {activeTripState.accepted && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2 my-2">
                        <div 
                          onClick={() => {
                            const found = (drivers || []).find((d: any) => d.id === activeTripState.acceptedBy);
                            if (found) setSelectedProfileDriver(found);
                          }}
                          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/40 p-2 rounded-xl cursor-pointer transition-all duration-300"
                          title="Click to view partner profile & registered fleet"
                        >
                          <div className="w-10 h-10 rounded-full border border-[#e9c349]/30 overflow-hidden shrink-0">
                            <img src={activeDriver?.avatar} alt={activeDriver?.name || 'Driver'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <p className="text-[9px] text-[#e9c349] uppercase tracking-widest font-bold">{activeDriver?.role || 'Partner'}</p>
                            <p className="text-xs font-bold text-on-surface leading-tight">{activeDriver?.name}</p>
                            <p className="text-[10px] text-[#e9c349] font-mono flex items-center gap-0.5 mt-0.5 font-bold">
                              <span className="material-symbols-outlined text-[11px] text-[#e9c349]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span>{activeDriver?.rating || '4.98'} Active Rating</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
                        
                        <div 
                          onClick={() => {
                            const found = (drivers || []).find((d: any) => d.id === activeTripState.acceptedBy);
                            if (found) setSelectedProfileDriver(found);
                          }}
                          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/40 p-2 rounded-xl cursor-pointer transition-all duration-300"
                          title="Click to view vehicle specification & presets"
                        >
                          <img src={getVehicleDetails(activeDriver).image} alt={getVehicleDetails(activeDriver).name} className="h-10 object-contain max-w-[80px]" />
                          <div>
                            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-60 leading-none">Vehicle Profile</p>
                            <p className="text-xs font-bold text-on-surface mt-0.5">{getVehicleDetails(activeDriver).name || activeDriver?.vehicle || currentVehicleObj?.name}</p>
                            <p className="font-mono text-[9px] text-[#e9c349] font-bold">{activeDriver?.plate || 'OBS-101'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live ETA section */}
                    {activeTripState.accepted && (
                      <div className="flex flex-wrap gap-3 py-1 items-center animate-in fade-in duration-300">
                        <div className="bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-bold font-sans">
                          <span className="material-symbols-outlined text-sm animate-bounce text-[#e9c349]">schedule</span>
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#e9c349]">
                            Estimated Arrival: {etaMinutes !== null ? `${etaMinutes} mins` : '5 mins'} ({etaDistance !== null ? `${etaDistance.toFixed(1)} km` : '1.8 km'} left)
                          </span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant font-mono opacity-60">
                          Matched via Leaflet Routing Engine
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Map Display: Static Route Preview vs Live Tracking */}
                  {mapViewMode === 'static' ? (
                    <StaticRouteMapPreview
                      pickup={activeTripState.pickup || pickupLoc}
                      destination={activeTripState.destination || destLoc}
                      pickupLat={activeTripState.pickupLat || 6.3156}
                      pickupLng={activeTripState.pickupLng || -10.8074}
                      destinationLat={activeTripState.destinationLat || 6.3006}
                      destinationLng={activeTripState.destinationLng || -10.8124}
                      vehicleType={activeTripState.vehicleId || selectedVehicleId || (activeDriver?.role === 'Rider' ? 'bike' : 'car')}
                      onSwitchToLive={() => setMapViewMode('live')}
                    />
                  ) : (
                    <div className="h-[280px] w-full rounded-xl overflow-hidden border border-[#e9c349]/20 relative bg-surface-container-low shadow-xl">
                      <InteractiveMap
                        pickupLat={activeTripState.pickupLat || 6.3156}
                        pickupLng={activeTripState.pickupLng || -10.8074}
                        destinationLat={activeTripState.destinationLat || 6.3006}
                        destinationLng={activeTripState.destinationLng || -10.8124}
                        hasActiveTrip={true}
                        tripStatus={activeTripState.status}
                        tripAccepted={activeTripState.accepted}
                        driverId={activeTripState.acceptedBy || activeDriver?.id || PRODUCTION_DRIVERS[0]?.id || ''}
                        vehicleType={activeTripState.vehicleId || selectedVehicleId || (activeDriver?.role === 'Rider' ? 'bike' : 'car')}
                        markerImage={getVehicleDetails(activeDriver).image}
                        isPassiveTracking={true}
                      />
                      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-primary/20 text-[9px] uppercase tracking-widest font-mono font-bold flex items-center gap-1.5 z-[1000] text-[#e9c349]">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Live Chauffeur Tracking
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5 text-xs">
                    <p className="text-on-surface-variant font-light flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      <span><strong>Pickup Identity:</strong> {activeTripState.pickup}</span>
                    </p>
                    <p className="text-on-surface-variant font-light flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">flag</span>
                      <span><strong>Destination Terrain:</strong> {activeTripState.destination}</span>
                    </p>
                  </div>

                  {/* Ride Pooling & Fare Splitting Widget */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-primary font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">diversity_3</span>
                          Obsidian Co-Voyage Ride Pooling
                        </h4>
                        <p className="text-[10px] text-on-surface-variant opacity-60">Share your passage route with up to 3 select peers and split fares equally.</p>
                      </div>
                      <span className="text-[9px] bg-primary/15 border border-primary/25 text-primary tracking-widest uppercase font-extrabold px-2.5 py-1 rounded">
                        Active Pool: {((activeTripState.passengers || []).length + 1)} Passengers
                      </span>
                    </div>

                    {/* Passenger Roster */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Host / Primary Client */}
                        <div className="bg-[#111] border border-primary/25 p-3 rounded-lg flex items-center justify-between shadow-md relative overflow-hidden">
                          <div className="absolute right-0 top-0 bg-primary/20 text-primary text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-bl">
                            Host
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full border border-primary/30 overflow-hidden bg-neutral-900 shrink-0">
                              <img src={user.avatar} alt="Host Profile" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                              <p className="text-[9px] text-[#e9c349]/75 font-mono mt-0.5">Primary Billing</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-primary font-mono">{formatUSD((5 + (activeTripState.elapsedTime || 0) * 0.05) / ((activeTripState.passengers || []).length + 1))}</p>
                            <p className="text-[9px] text-gray-400 font-mono">{formatLRD(((5 + (activeTripState.elapsedTime || 0) * 0.05) / ((activeTripState.passengers || []).length + 1)) * 195)}</p>
                          </div>
                        </div>

                        {/* Co-passengers */}
                        {(activeTripState.passengers || []).map((passenger: any, idx: number) => {
                          const splitAmt = (5 + (activeTripState.elapsedTime || 0) * 0.05) / ((activeTripState.passengers || []).length + 1);
                          return (
                            <div key={passenger.name + idx} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between hover:border-red-500/30 group/pool transition-all shadow-sm">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-neutral-900 flex items-center justify-center shrink-0">
                                  {passenger.avatar ? (
                                    <img src={passenger.avatar} alt={passenger.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="material-symbols-outlined text-xs text-primary">person</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-on-surface leading-tight">{passenger.name}</p>
                                  <p className="text-[9px] text-emerald-400 font-mono mt-0.5">Joined Pool</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-xs font-black text-on-surface font-mono">{formatUSD(splitAmt)}</p>
                                  <p className="text-[9px] text-gray-400 font-mono">{formatLRD(splitAmt * 195)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const updatedPassengers = (activeTripState.passengers || []).filter((_: any, pIdx: number) => pIdx !== idx);
                                    const updatedTrip = {
                                      ...activeTripState,
                                      passengers: updatedPassengers
                                    };
                                    setActiveTripState(updatedTrip);
                                    await saveActiveTripToFirestore(updatedTrip);
                                  }}
                                  className="w-6 h-6 rounded-full bg-red-500/10 hover:bg-rose-600 hover:text-white border border-red-500/20 flex items-center justify-center text-red-400 sm:opacity-0 group-hover/pool:opacity-100 transition-all cursor-pointer"
                                  title="Opt user out of pool"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Controls to add passengers & simulated requests */}
                    <div className="pt-2 flex flex-col md:flex-row gap-4 items-stretch justify-between text-xs">
                      {/* Manual / Preset Peer Pool Addition */}
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[9px] text-primary uppercase font-bold tracking-wider font-mono">Add Companion Sharepayer Preset</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter coworker or friend name..."
                            value={customPoolName}
                            onChange={(e) => setCustomPoolName(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && customPoolName.trim()) {
                                e.preventDefault();
                                const updatedTrip = {
                                  ...activeTripState,
                                  passengers: [...(activeTripState.passengers || []), { name: customPoolName.trim(), joinedAt: new Date().toISOString() }]
                                };
                                setCustomPoolName('');
                                setActiveTripState(updatedTrip);
                                await saveActiveTripToFirestore(updatedTrip);
                              }
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 flex-1 min-w-[120px]"
                          />
                          <button
                            onClick={async () => {
                              if (customPoolName.trim()) {
                                const updatedTrip = {
                                  ...activeTripState,
                                  passengers: [...(activeTripState.passengers || []), { name: customPoolName.trim(), joinedAt: new Date().toISOString() }]
                                };
                                setCustomPoolName('');
                                setActiveTripState(updatedTrip);
                                await saveActiveTripToFirestore(updatedTrip);
                              }
                            }}
                            className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary hover:border-transparent rounded-lg px-3.5 py-1.5 text-xs font-bold font-sans uppercase tracking-widest active:scale-95 transition-transform cursor-pointer"
                          >
                            Pool
                          </button>
                        </div>
                        {/* Preset Companion Quick-buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {POOL_PRESETS.map((preset) => {
                            const isAlreadyPooled = (activeTripState.passengers || []).some((p: any) => p.name === preset.name);
                            return (
                              <button
                                key={preset.name}
                                disabled={isAlreadyPooled || (activeTripState.passengers || []).length >= 3}
                                onClick={async () => {
                                  const updatedTrip = {
                                    ...activeTripState,
                                    passengers: [...(activeTripState.passengers || []), { 
                                      name: preset.name, 
                                      avatar: preset.avatar,
                                      joinedAt: new Date().toISOString() 
                                    }]
                                  };
                                  setActiveTripState(updatedTrip);
                                  await saveActiveTripToFirestore(updatedTrip);
                                }}
                                className="text-[9px] px-2 py-1 rounded bg-[#1c1c1f] hover:bg-primary/20 hover:text-primary transition-colors border border-white/5 disabled:opacity-45 h-7 cursor-pointer"
                              >
                                + {preset.name.split(' ')[0] || preset.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cool simulated pool requests trigger */}
                      <div className="border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center shrink-0">
                        {simulatedPoolRequest ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg max-w-[240px] space-y-2">
                            <p className="text-[10px] text-primary font-bold uppercase leading-none">Incoming Co-Voyager</p>
                            <p className="text-xs text-on-surface font-semibold truncate leading-tight">{simulatedPoolRequest.name} wants to join co-transit</p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={async () => {
                                  const updatedTrip = {
                                    ...activeTripState,
                                    passengers: [...(activeTripState.passengers || []), { 
                                      name: simulatedPoolRequest.name, 
                                      avatar: simulatedPoolRequest.avatar,
                                      joinedAt: new Date().toISOString() 
                                    }]
                                  };
                                  setSimulatedPoolRequest(null);
                                  setActiveTripState(updatedTrip);
                                  await saveActiveTripToFirestore(updatedTrip);
                                }}
                                className="bg-emerald-500 text-neutral-900 border border-emerald-400 text-[9px] py-1 px-2.5 rounded font-bold uppercase cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => setSimulatedPoolRequest(null)}
                                className="bg-red-500/10 border border-red-500/30 text-red-00 text-[9px] py-1 px-2.5 rounded font-bold uppercase cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            disabled={(activeTripState.passengers || []).length >= 3}
                            onClick={() => {
                              const availablePresets = POOL_PRESETS.filter(
                                preset => !(activeTripState.passengers || []).some((p: any) => p.name === preset.name)
                              );
                              if (availablePresets.length > 0) {
                                const selected = availablePresets[Math.floor(Math.random() * availablePresets.length)];
                                setSimulatedPoolRequest(selected);
                              } else {
                                alert("All premium Monrovia companion preset slots are currently occupied in your pooled transit.");
                              }
                            }}
                            className="bg-[#cba21e]/20 border border-[#cba21e]/40 hover:bg-[#cba21e] hover:text-[#0c0f0f] text-[#cba21e] hover:border-transparent px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center self-center disabled:opacity-40 cursor-pointer"
                          >
                            Simulate Join Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Premium Cab Amenities & SOS Sentinel Widget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    {/* In-Cab Amenities */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                      <div>
                        <h4 className="text-primary font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-[#e9c349]">local_cafe</span>
                          Premium In-Route Amenities
                        </h4>
                        <p className="text-[10px] text-on-surface-variant opacity-60">Tick items below to request premium in-cab luxury items in real-time.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'wifi', name: 'Premium Pocket Wi-Fi', icon: 'wifi' },
                          { id: 'water', name: 'AquaLife Chilled Water', icon: 'local_drinking_water' },
                          { id: 'newspaper', name: 'Daily Observer News', icon: 'newspaper' },
                          { id: 'purifier', name: 'Ozone Cabin Purifier', icon: 'filter_alt' },
                          { id: 'espresso', name: 'Hot Monrovia Espresso', icon: 'local_cafe' },
                          { id: 'charger', name: 'Multiport Device Charger', icon: 'battery_charging_full' }
                        ].map((amenity) => {
                          const requestedAmenities = activeTripState.amenities || [];
                          const isRequested = requestedAmenities.includes(amenity.id);
                          return (
                            <button
                              key={amenity.id}
                              onClick={async () => {
                                const nextAmenities = isRequested
                                  ? requestedAmenities.filter((id: string) => id !== amenity.id)
                                  : [...requestedAmenities, amenity.id];
                                const updatedTrip = {
                                  ...activeTripState,
                                  amenities: nextAmenities
                                };
                                setActiveTripState(updatedTrip);
                                await saveActiveTripToFirestore(updatedTrip);
                              }}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all active:scale-95 duration-200 cursor-pointer ${
                                isRequested 
                                  ? 'bg-[#e9c349]/20 border-[#e9c349] text-[#e9c349] font-bold' 
                                  : 'bg-[#111] border-white/10 text-on-surface-variant hover:border-white/25 hover:text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">{amenity.icon}</span>
                              <span className="text-[10px] leading-tight select-none">{amenity.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SOS Emergency Dispatcher & Intermediate Stopovers */}
                    <div className="space-y-4">
                      {/* Intermediate Stopover */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-primary font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-[#e9c349]">alt_route</span>
                            VIP Intermediate Stopover
                          </h4>
                        </div>
                        <p className="text-[10px] text-on-surface-variant opacity-60">Add a high-profile location below to modify your chauffeur route list on the fly.</p>
                        
                        <div className="flex gap-2">
                          <select
                            value={customStopover}
                            onChange={async (e) => {
                              const stopover = e.target.value;
                              if (stopover) {
                                setCustomStopover('');
                                const nextDestination = `${stopover} ➔ ${activeTripState.destination}`;
                                const updatedTrip = {
                                  ...activeTripState,
                                  destination: nextDestination.substring(0, 95)
                                };
                                setActiveTripState(updatedTrip);
                                await saveActiveTripToFirestore(updatedTrip);
                                alert(`Routing Updated! Your voyage destination sequence is appended with intermediate stop: ${stopover}. Chauffeur will update pathing.`);
                              }
                            }}
                            className="bg-[#111] border border-white/10 rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 flex-1 cursor-pointer"
                          >
                            <option value="">Select Stopover Presets...</option>
                            <option value="Capitol Hill Complex">Capitol Hill Complex (VIP Gate)</option>
                            <option value="UN Drive Embassy Row">UN Drive Embassy Row</option>
                            <option value="Broad Street Business Hub">Broad Street Business District</option>
                            <option value="Sinkor Boulevard Market">Sinkor Boulevard Premium Market</option>
                            <option value="Monrovia Marina Port">Monrovia Marina Executive Pier</option>
                          </select>
                        </div>
                      </div>

                      {/* SOS Sentinel Option */}
                      <div className={`border rounded-xl p-5 space-y-2.5 transition-all duration-300 relative overflow-hidden ${
                        activeTripState.sosActive 
                          ? 'bg-red-500/10 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                          : 'bg-[#1a0a0a]/30 border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base select-none animate-pulse">emergency_home</span>
                            VIP SOS Security Sentinel
                          </h4>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
                            activeTripState.sosActive ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/25'
                          }`}>
                            {activeTripState.sosActive ? 'SIGNAL ACTIVE' : 'LOCKED'}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant opacity-60">Triggers instantaneous localized GPS coordinate lock to Monrovia Diplomatic Security Forces.</p>
                        
                        <button
                          onClick={async () => {
                            const isCurrentlyActive = !!activeTripState.sosActive;
                            if (!isCurrentlyActive) {
                              const confirmSOS = window.confirm("WARNING: You are about to initiate an emergency SOS signal to Monrovia Premium Private Protection. Proceed?");
                              if (!confirmSOS) return;
                            }
                            const updatedTrip = {
                              ...activeTripState,
                              sosActive: !isCurrentlyActive
                            };
                            setActiveTripState(updatedTrip);
                            await saveActiveTripToFirestore(updatedTrip);
                          }}
                          className={`w-full py-2.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                            activeTripState.sosActive
                              ? 'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-lg'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-[#0c0f0f] hover:border-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{activeTripState.sosActive ? 'cancel' : 'notification_important'}</span>
                          {activeTripState.sosActive ? 'Deactivate Emergency Beacon' : 'Engage Tactical SOS Beacon'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-0 text-center sm:text-left">
                      <p className="text-[10px] text-outline uppercase tracking-widest font-bold opacity-50">
                        {activeTripState.status === 'transit' ? 'Transit Active Elapsed Chrono' : 'Awaiting Chauffeur Release'}
                      </p>
                      <p className="font-mono text-5xl text-[#e9c349] font-bold tracking-tighter tabular-nums" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatTime(activeTripState.elapsedTime || 0)}
                      </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => {
                          setActiveChatDriverId(activeDriver?.id || (drivers && drivers[0] ? drivers[0].id : ''));
                          onNavigate('chat');
                        }}
                        className="flex-1 sm:flex-initial bg-[#1a1a1a] hover:bg-[#252525] text-white border border-white/10 font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-sm">chat_bubble</span>
                        <span>Dispatch Chat</span>
                      </button>

                      <button 
                        onClick={() => onNavigate('trip')}
                        className="flex-1 sm:flex-initial bg-[#e9c349] text-[#0c0f0f] font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform hover:brightness-110 shadow-lg text-xs uppercase tracking-widest"
                      >
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span>Trip status screen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Stats/Info */}
          <div className="glass-panel p-6 rounded-xl flex flex-col justify-between border border-white/5">
            <div className="space-y-4">
              <p className="text-[10px] text-outline uppercase font-bold tracking-widest opacity-60">Next Milestone</p>
              <h4 className="font-bodoni text-xl font-bold text-on-surface">Obsidian Gala Access</h4>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-primary h-full shadow-[0_0_10px_rgba(255,191,116,0.3)]" style={{ width: '75%' }}></div>
              </div>
              <p className="text-[10px] text-on-surface-variant font-bold opacity-40 mt-2 uppercase tracking-[0.2em]">12 trips remaining to unlock Gala access.</p>
            </div>
            <button className="mt-8 text-primary border border-primary/20 hover:bg-primary/5 py-3 rounded-xl transition-colors font-bold text-[10px] uppercase tracking-widest">
              View Benefits
            </button>
          </div>
        </section>

        {/* Standard Fare Matrix Section */}
        <section className="space-y-6 animate-in fade-in duration-300">
          <FareMatrixTable 
            onSelectDestination={(dest, vehicleType) => {
              setDestLoc(dest);
              if (vehicleType) {
                setSelectedVehicleId(vehicleType);
              }
            }}
          />
        </section>

        {/* Elite Drivers & Riders Guild Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bodoni text-3xl font-bold text-on-surface tracking-wide">Elite Drivers & Riders Guild</h3>
              <p className="text-xs text-on-surface-variant opacity-60 mt-1 font-sans">Direct real-time link to the certified premium transit fleet in Monrovia</p>
            </div>
            <span className="text-[10px] text-primary border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-full uppercase font-bold tracking-widest w-fit">
              {(drivers || []).filter((d: any) => d.role?.toLowerCase() !== 'client').length} Partners Active Online
            </span>
          </div>
          
          {actualDriversOnly.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-primary/40">directions_car</span>
              <p className="text-sm font-bodoni text-on-surface font-bold">No Active Chauffeurs or Commercial Riders Online</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto opacity-75 font-sans">
                All accounts have been completely removed. New partners can onboard directly through the Chauffeur and Rider portals to create real accounts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {actualDriversOnly.map((driver: any, idx: number) => (
                <div key={driver.id || driver.uid || driver.email || `driver-${idx}`} className="glass-panel group relative overflow-hidden rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 p-0.5 relative shrink-0 group-hover:border-primary transition-colors">
                        <img alt={driver.name} className="w-full h-full object-cover rounded-full" src={driver.avatar} referrerPolicy="no-referrer" />
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-surface flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bodoni text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{driver.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">{driver.role}</span>
                          <div className="flex items-center text-primary text-xs font-bold font-mono">
                            <span className="material-symbols-outlined text-sm text-primary mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {driver.rating}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dispatched Vehicle Preview (Car / Bike / Kekeh) */}
                    <div className="w-full h-28 bg-black/40 rounded-xl border border-white/10 p-2.5 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-primary/30 transition-all">
                      <img 
                        src={getVehicleDetails(driver).image} 
                        alt={driver.vehicle || 'Assigned Transit'} 
                        className="h-20 w-auto max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                        <span className="text-[8px] font-mono uppercase tracking-wider bg-black/80 text-primary px-1.5 py-0.5 rounded border border-white/10 font-bold">
                          {getVehicleDetails(driver).type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-3 text-sm text-on-surface-variant border-t border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-50 font-cinzel text-[9px] uppercase tracking-wider">Elite Vessel</span>
                        <span className="font-bold text-on-surface">{driver.vehicle}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-50 font-cinzel text-[9px] uppercase tracking-wider">Plate / Reg</span>
                        <span className="font-mono font-bold text-primary/80">{driver.plate}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-50 font-cinzel text-[9px] uppercase tracking-wider">Direct Hotline</span>
                        <span className="font-mono font-bold text-on-surface">{driver.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 pt-0 flex flex-col sm:flex-row gap-2.5">
                    <button 
                      onClick={() => {
                        setActiveChatDriverId(driver.id);
                        onNavigate('chat');
                      }}
                      className="flex-1 bg-primary/10 hover:bg-primary hover:text-on-primary text-primary font-bold py-3 px-2 rounded-xl border border-primary/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[10px] uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-xs">chat</span>
                      <span>Text Partner</span>
                    </button>
                    <button 
                      onClick={() => setSelectedProfileDriver(driver)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface hover:text-primary font-bold py-3 px-2 rounded-xl border border-white/10 hover:border-primary/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[10px] uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-xs">badge</span>
                      <span>Visit Account</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fleet Status Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bodoni text-2xl font-bold text-on-surface">Live Fleet Status</h3>
            <span className="text-[10px] text-outline uppercase font-bold tracking-widest opacity-50">Updated 2m ago</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Luxury Sedan */}
            <div className="glass-panel group overflow-hidden rounded-xl transition-all hover:-translate-y-1 border border-white/5 hover:border-primary/20 cursor-pointer">
              <div className="h-48 overflow-hidden relative">
                <img alt="Luxury Sedan" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7neX6YAFhsdJLQ4m6s8ShZ3pMmo6jrZ-YFKhI5m7g8HsgwYVweh3ZuRagiAx8Dv4xZl9nmd4ma5O_SEG0JRks2Q3YalsZqCnThg54lkNNDGza03OClYGZOUuasU3c7k9v4bzLUxRKyOCOs1qwFzDHgbxXe46K8rAsF_nnGuxzbEDV47P1hYi_J52wVL3w9BuMBJrntaoYWiyT8O5FsLoMkBpTrqNerXh1NaMO48RRuCUSiVOHu9umjWOoOrEOikdv8HacwhuHrTU" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bodoni text-lg font-bold text-on-surface">Luxury Sedan</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest opacity-50">S-Class or Equiv.</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Available</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">Request Now</p>
                  <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </div>

            {/* Bike Express */}
            <div className="glass-panel group overflow-hidden rounded-xl transition-all hover:-translate-y-1 border border-white/5 hover:border-primary/20 cursor-pointer">
              <div className="h-48 overflow-hidden relative">
                <img alt="Bike Express" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFRJN8M7ytpU8UnOEVOYsAzpUVnlQM4BrNR4aPv6K3cED3jtmOfTWxSxuFgkKWz7kHpdjsBo2av7CkDPl2PDDs0hmvoKit2uNbF1_x6_DtTjQnhwAx6J-7pi05WntAytpwBW1CfSRtjTLK3B7cz7coELRRFHPiyIzuTyelF5RKylSrTEx9J1qsc_zoiWaQc0gA-3omaYqsulImkeMMLnyKUhKfseGXyDcLivTWLe2vCsmjjRExvoxX23sXSG9XZSZr1xag27vXHOk" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bodoni text-lg font-bold text-on-surface">Bike Express</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest opacity-50">Electric Stealth</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Available</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">Request Now</p>
                  <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </div>

            {/* Kekeh Exec */}
            <div className="glass-panel group overflow-hidden rounded-xl transition-all hover:-translate-y-1 border border-white/5 hover:border-primary/20 cursor-pointer">
              <div className="h-48 overflow-hidden relative">
                <img alt="Kekeh Exec" className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110" src="https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png" />
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bodoni text-lg font-bold text-on-surface">Kekeh Exec</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest opacity-50">Urban Navigator</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Available</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">Request Now</p>
                  <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Monrovia Route Intelligence Map replacing Google Sheets Sync Hub */}
        <section className="space-y-4 pt-4">
          <div>
            <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block font-bold">Interactive Route Tracker</span>
            <h3 className="text-2xl font-bodoni font-bold text-on-surface">Monrovia Route Intelligence Map</h3>
            <p className="text-xs text-on-surface-variant opacity-60 mt-1 font-sans">Monitor your dynamic chauffeur movements and search destination locks live on the terrain</p>
          </div>
          <div className="glass-panel rounded-xl overflow-hidden border border-white/5 relative h-[500px] w-full">
            <InteractiveMap 
              lat={activeDriver?.lat || 6.3156} 
              lng={activeDriver?.lng || -10.8074} 
              destinationLat={activeTripState?.status === 'ready' ? (activeTripState.pickupLat || 6.3156) : (activeTripState?.destinationLat || 6.3006)}
              destinationLng={activeTripState?.status === 'ready' ? (activeTripState.pickupLng || -10.8074) : (activeTripState?.destinationLng || -10.8124)}
              popupText={`${getVehicleDetails(activeDriver).name || 'Active Vehicle'} - Monrovia Live Tracking`}
              markerImage={getVehicleDetails(activeDriver).image}
              vehicleType={activeTripState?.vehicleId || selectedVehicleId || (activeDriver?.role === 'Rider' ? 'bike' : 'car')}
              hasActiveTrip={activeTripState?.isActive || activeTripState?.status === 'transit'}
              tripStatus={activeTripState?.status}
              tripAccepted={activeTripState?.accepted}
              height="100%"
              driverId={activeDriver?.id}
              onCoordsChange={(lat, lng, placeName) => {
                if (placeName) {
                  setDestLoc(placeName);
                }
                if (activeTripState && (activeTripState.isActive || activeTripState.status === 'ready' || activeTripState.status === 'transit')) {
                  const updated = {
                    ...activeTripState,
                    destinationLat: lat,
                    destinationLng: lng,
                    destination: placeName || activeTripState.destination
                  };
                  setActiveTripState(updated);
                  saveActiveTripToFirestore(updated);
                }
              }}
              onEtaUpdate={(mins, kms) => {
                setEtaMinutes(mins);
                setEtaDistance(kms);
              }}
            />
          </div>
        </section>
      </main>

      {/* Driver/Rider Account Detail Modal */}
      {selectedProfileDriver && (() => {
        const vehicleSpecs = getVehicleDetails(selectedProfileDriver);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              onClick={() => setSelectedProfileDriver(null)} 
              className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
            ></div>
            
            <div className="bg-[#0e0e0e] border border-white/10 w-full max-w-lg rounded-2xl relative z-10 overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header banner */}
              <div className="h-32 bg-gradient-to-r from-primary/15 via-transparent to-transparent relative border-b border-white/5">
                <button 
                  onClick={() => setSelectedProfileDriver(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-colors focus:outline-none z-10"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
                
                {/* Profile Main Badge */}
                <div className="absolute -bottom-12 left-6 flex items-end gap-4 z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden bg-[#0e0e0e] p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
                    <img 
                      src={selectedProfileDriver.avatar} 
                      alt={selectedProfileDriver.name} 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="pb-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-md">
                      {vehicleSpecs.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 pt-16 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <h3 className="font-bodoni text-2xl font-bold text-on-surface">{selectedProfileDriver.name}</h3>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">Verified Liberia Ride Premium Guild Member</p>
                  
                  {/* Driver stats row */}
                  <div className="flex items-center gap-6 mt-4 py-3 border-y border-white/5">
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-65 font-bold">Active Rating</p>
                      <p className="text-primary font-mono text-sm font-bold flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span>{selectedProfileDriver.rating || '4.98'}</span>
                      </p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10"></div>
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-65 font-bold">Hotline Connection</p>
                      <p className="text-on-surface font-mono text-sm font-bold mt-0.5">{selectedProfileDriver.phone}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10"></div>
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-65 font-bold">Current Status</p>
                      <p className="text-emerald-400 font-bold text-xs mt-0.5 uppercase tracking-wider">{selectedProfileDriver.status || 'Available'}</p>
                    </div>
                  </div>
                </div>

                {/* ACTIVE DISPATCHED VEHICLE SHOWCASE - Large & Gorgeous Image representation */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden group/showcase hover:border-primary/20 transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-md tracking-wider font-bold">
                        Transit Classification
                      </span>
                      <h4 className="font-bodoni text-lg font-bold text-on-surface mt-1">{vehicleSpecs.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60 font-bold">License Plate</p>
                      <p className="text-primary font-mono text-xs font-bold mt-0.5">{selectedProfileDriver.plate || '12-KK-442'}</p>
                    </div>
                  </div>

                  {/* Stunning, Large centered view of the vehicle */}
                  <div className="w-full h-44 bg-black/40 rounded-xl border border-white/5 p-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-60"></div>
                    <img 
                      src={vehicleSpecs.image} 
                      alt={vehicleSpecs.name} 
                      className="h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] group-hover/showcase:scale-105 transition-transform duration-500 relative z-10"
                    />
                  </div>

                  {/* Amenities & Performance specs */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-60 font-bold mb-1">Performance Details</p>
                      <p className="text-xs text-on-surface opacity-85">{vehicleSpecs.specs}</p>
                    </div>
                    
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest opacity-60 font-bold mb-1.5">Registered Specifications & Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vehicleSpecs.amenities.map((amenity: string, idx: number) => (
                          <span key={idx} className="bg-white/5 text-[9px] uppercase tracking-wider text-on-surface border border-white/5 px-2.5 py-1 rounded-md flex items-center gap-1 font-bold">
                            <span className="h-1 w-1 bg-primary rounded-full"></span>
                            <span>{amenity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registered Account Fleet & alternative list */}
                <div className="space-y-3">
                  <h4 className="font-bodoni text-sm font-bold text-on-surface tracking-wider">Registered Secondary Fleet</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto pr-1">
                    {(selectedProfileDriver.vehiclesList && selectedProfileDriver.vehiclesList.length > 0) ? (
                      selectedProfileDriver.vehiclesList.map((vehicle: any, idx: number) => (
                        <div 
                          key={vehicle.id || `vehicle-${idx}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                            vehicle.active 
                              ? 'bg-primary/5 border-primary/30 shadow-[0_4px_20px_rgba(255,191,116,0.05)]' 
                              : 'bg-white/5 border-white/5 opacity-65'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-12 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                              <img 
                                src={vehicle.image || vehicleSpecs.image} 
                                alt={vehicle.name} 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-on-surface">{vehicle.name}</p>
                                {vehicle.active && (
                                  <span className="text-[8px] bg-primary text-on-primary font-bold uppercase px-1 rounded">Active</span>
                                )}
                              </div>
                              <p className="font-mono text-[9px] text-on-surface-variant opacity-60">Plate: {vehicle.plate}</p>
                            </div>
                          </div>

                          {vehicle.active ? (
                            <div className="flex items-center text-primary text-xs font-bold shrink-0">
                              <span className="material-symbols-outlined text-base">check_circle</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-[#8e8e8e] font-serif italic shrink-0">Standby</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center p-1 border border-white/5 shrink-0">
                            <img 
                              src={vehicleSpecs.image} 
                              alt={selectedProfileDriver.vehicle || 'Standard Vessel'} 
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">{selectedProfileDriver.vehicle || 'Standard Vessel'}</p>
                            <p className="font-mono text-[9px] text-on-surface-variant opacity-60">Plate: {selectedProfileDriver.plate || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center text-primary text-xs font-bold shrink-0">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => {
                    setActiveChatDriverId(selectedProfileDriver.id);
                    onNavigate('chat');
                    setSelectedProfileDriver(null);
                  }}
                  className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(255,191,116,0.15)]"
                >
                  <span className="material-symbols-outlined text-sm">chat_bubble</span>
                  <span>Send Dispatch Request</span>
                </button>
                <button 
                  onClick={() => setSelectedProfileDriver(null)}
                  className="px-5 bg-white/5 hover:bg-white/10 text-on-surface border border-white/10 font-bold rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Post-Trip Summary & Shareable Receipt Modal */}
      {activeTripState && (
        <PostTripSummaryModal
          isOpen={showPostTripModal}
          onClose={() => {
            setShowPostTripModal(false);
          }}
          tripData={{
            id: activeTripState?.id || `LR-${Math.floor(100000 + Math.random() * 900000)}`,
            driverName: activeDriver?.name || activeTripState?.acceptedByName || 'Executive Chauffeur',
            driverRole: activeDriver?.role || 'Executive Chauffeur',
            driverAvatar: activeDriver?.avatar,
            driverRating: activeDriver?.rating || '4.98',
            vehicleName: activeDriver?.vehicle || currentVehicleObj?.name || 'Mercedes-Benz S-Class Prestige',
            vehicleType: activeTripState?.vehicleId || selectedVehicleId || 'car',
            vehiclePlate: activeDriver?.plate || '12-KK-442',
            pickup: activeTripState?.pickup || pickupLoc || 'Sinkor 12th Street, Monrovia',
            destination: activeTripState?.destination || destLoc || 'Mamba Point Hotel, Monrovia',
            elapsedTime: activeTripState?.elapsedTime || (etaMinutes ? etaMinutes * 60 : 840),
            distanceKm: parseFloat((etaDistance || 6.8).toFixed(1)),
            fareUSD: 5 + (activeTripState.elapsedTime || 0) * 0.05 + (selectedTip || 0),
            fareLRD: (5 + (activeTripState.elapsedTime || 0) * 0.05 + (selectedTip || 0)) * 195,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            amenities: activeTripState?.amenities || [],
            clientName: user.name || 'Passenger',
            passengers: activeTripState?.passengers || []
          }}
          onSubmitRating={async (rating, tip, feedback) => {
            try {
              const activeDriverDocId = activeTripState.acceptedBy || (drivers && drivers[0] ? drivers[0].id : '');
              const driverToUpdate = (drivers || []).find((d: any) => d.id === activeDriverDocId);
              
              if (driverToUpdate) {
                const currentRatingVal = parseFloat(driverToUpdate.rating) || 5.0;
                const currentVotes = driverToUpdate.ratingCount || 50;
                const nextRatingVal = ((currentRatingVal * currentVotes) + rating) / (currentVotes + 1);
                const currentTips = parseFloat(driverToUpdate.tipsAccumulated) || 0.0;
                const nextTipsVal = currentTips + tip;
                
                const updatedDriver = {
                  ...driverToUpdate,
                  rating: nextRatingVal.toFixed(2),
                  ratingCount: currentVotes + 1,
                  tipsAccumulated: nextTipsVal,
                  updatedAt: new Date().toISOString()
                };
                await saveDriverToFirestore(updatedDriver);
              }

              const resetTrip = {
                status: 'ready',
                isActive: false,
                elapsedTime: 0,
                clientName: user.name || 'Passenger',
                clientId: user.uid || user.id || 'passenger_guest',
                pickup: pickupLoc,
                pickupLat: 6.3156,
                pickupLng: -10.8074,
                destination: destLoc,
                destinationLat: 6.3006,
                destinationLng: -10.8124,
                vehicleId: selectedVehicleId || 'taxi',
                accepted: false,
                acceptedBy: null,
                acceptedByName: null,
                started: false,
                passengers: [],
                amenities: [],
                sosActive: false
              };
              
              setFeedbackSubmitted(true);
              setShowPostTripModal(false);
              setActiveTripState(resetTrip);
              await saveActiveTripToFirestore(resetTrip);
            } catch (err) {
              console.error("Failed to complete post-trip modal rating:", err);
            }
          }}
        />
      )}

      </div>
    </div>
  );
};

const ClientProfile = ({ onExit, onNavigate, currentUser, onLogout, setCurrentUser, language, setLanguage }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = currentUser || {
    name: 'Passenger',
    rating: 'Member',
    email: '',
    avatar: ''
  };

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary/30 pb-16">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-gutter h-16">
        <div className="flex items-center gap-3">
          <button 
            onClick={onLogout} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 duration-200 shadow-[0_0_15px_rgba(255,191,116,0.1)] font-sans text-[10px] font-bold uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-sm leading-none">logout</span>
            <span>Logout</span>
          </button>
          <button 
            onClick={onExit} 
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95 duration-200 font-sans text-[9px] font-bold uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-xs leading-none">arrow_back</span>
            <span>Back</span>
          </button>
        </div>
        <h1 className="text-xl md:text-2xl font-bodoni font-bold tracking-[0.2em] text-primary uppercase hidden xs:block">OBSIDIAN</h1>
        
        {/* Dropdown Menu Toggle */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 pr-3 rounded-full border border-primary/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/30 bg-surface-container-high flex items-center justify-center">
              {user.avatar ? (
                <img alt="client portrait" className="w-full h-full object-cover" src={user.avatar} referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[10px] font-bold text-primary">{(user.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e9c349] hidden xs:block">Menu</span>
            <span className={`material-symbols-outlined text-xs text-[#e9c349] transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-high/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-white/5 mb-2">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Obsidian Access</p>
                  <p className="text-xs text-on-surface font-bold truncate mt-0.5">{user.name}</p>
                </div>
                
                <button 
                  onClick={() => {
                    onNavigate('client-portal');
                    setIsMenuOpen(false);
                  }}
                  className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                >
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                  <span className="uppercase tracking-wider text-[10px]">Fleet Discovery</span>
                </button>

                <button 
                  onClick={() => {
                    onNavigate('chat');
                    setIsMenuOpen(false);
                  }}
                  className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                >
                  <span className="material-symbols-outlined text-primary">chat_bubble</span>
                  <span className="uppercase tracking-wider text-[10px]">Direct Dispatch</span>
                </button>

                <button 
                  onClick={() => {
                    onNavigate('trip');
                    setIsMenuOpen(false);
                  }}
                  className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                >
                  <span className="material-symbols-outlined text-primary">timer</span>
                  <span className="uppercase tracking-wider text-[10px]">Trip Status</span>
                </button>

                <button 
                  onClick={() => {
                    onNavigate('profile');
                    setIsMenuOpen(false);
                  }}
                  className="w-full h-11 px-4 flex items-center gap-3 text-sm text-primary hover:bg-white/5 transition-all text-left font-bold"
                >
                  <span className="material-symbols-outlined text-primary">person</span>
                  <span className="uppercase tracking-wider text-[10px]">Client Profile</span>
                </button>

                <div className="h-[1px] bg-white/5 my-2"></div>

                <button 
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full h-11 px-4 flex items-center gap-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left font-bold"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span className="uppercase tracking-wider text-[10px]">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 max-w-4xl mx-auto">
        {/* Profile Identity Section */}
        <section className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative group mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface-container-high backdrop-blur-xl flex items-center justify-center p-1 border border-primary/30 relative overflow-hidden shadow-[0_0_30px_rgba(233,195,73,0.15)]">
              {user.avatar ? (
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img alt="User Profile" className="w-full h-full object-cover" src={user.avatar} referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-surface-container flex flex-col items-center justify-center text-primary">
                  <span className="text-4xl md:text-5xl font-bodoni font-bold">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-on-surface-variant mt-1 opacity-70">Upload Photo</span>
                </div>
              )}
            </div>
            <label className="absolute bottom-2 right-2 bg-primary text-[#0c0f0f] w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer hover:brightness-110" title="Upload custom profile photo">
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      compressImage(reader.result as string, 200, 200, 0.6).then((compressed) => {
                        if (setCurrentUser) {
                          setCurrentUser((prev: any) => {
                            const updated = {
                              ...prev,
                              avatar: compressed
                            };
                            saveDriverToFirestore(updated).catch(() => {});
                            return updated;
                          });
                        }
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
                className="hidden" 
              />
            </label>
          </div>
          <div className="text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-bodoni font-bold text-on-surface mb-2">{user.name}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{user.rating}</span>
            </div>
            <p className="text-on-surface-variant text-sm mt-4 tracking-wider opacity-60 font-bold">{user.email}</p>
            <p className="text-[11px] text-primary/80 mt-2 font-medium">Click camera icon to add or change your personal profile picture</p>
          </div>
        </section>

        {/* Profile Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Travel History */}
          <div className="bg-surface-container/30 backdrop-blur-xl p-6 rounded-xl border border-white/5 group hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg border border-white/10 group-hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-primary">history</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
            <h3 className="text-xl font-bodoni font-bold text-on-surface mb-2">Travel History</h3>
            <p className="text-on-surface-variant text-sm font-bold opacity-50">Review your past travel in Monrovia and Liberia routes.</p>
            <div className="mt-6 flex items-center gap-4">
              <div className="text-left font-bold">
                <div className="text-primary text-2xl font-bodoni">14</div>
                <div className="text-[8px] uppercase tracking-widest text-on-surface-variant">Journeys</div>
              </div>
              <div className="h-8 w-[1px] bg-white/10"></div>
              <div className="text-left font-bold">
                <div className="text-primary text-2xl font-bodoni">3.2k</div>
                <div className="text-[8px] uppercase tracking-widest text-on-surface-variant">Miles</div>
              </div>
            </div>
          </div>

          {/* Preferred Fleet */}
          <div className="bg-surface-container/30 backdrop-blur-xl p-6 rounded-xl border border-white/5 group hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg border border-white/10 group-hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-primary">directions_car</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
            <h3 className="text-xl font-bodoni font-bold text-on-surface mb-2">Preferred Fleet</h3>
            <p className="text-on-surface-variant text-sm font-bold opacity-50">Manage your favorite vehicles from our obsidian collection.</p>
            <div className="mt-6 flex -space-x-3 overflow-hidden">
              {[1, 2].map(i => (
                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-surface-container-high overflow-hidden border border-white/10">
                  <img src={FLEET[i].image} alt="Vehicle" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-background bg-primary/20 text-[10px] font-bold text-primary border border-primary/30">+3</div>
            </div>
          </div>

          {/* Secure Payments */}
          <div className="md:col-span-2 bg-surface-container/30 backdrop-blur-xl p-6 rounded-xl border border-white/5 group hover:border-primary/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
              <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg border border-white/10 mb-4 group-hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-primary">payments</span>
              </div>
              <h3 className="text-xl font-bodoni font-bold text-on-surface mb-2">Secure Payments</h3>
              <p className="text-on-surface-variant text-sm font-bold opacity-50">Mobile Money (Lonestar MTN & Orange Money) and Card Payments.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-surface-container-high px-4 py-3 rounded-lg border border-white/10 flex items-center gap-3">
                <div className="w-8 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-[8px] font-bold tracking-tighter">MOMO</div>
                <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Liberia Mobile Money</span>
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
            </div>
          </div>

          {/* Language Settings Card */}
          <div className="md:col-span-2 bg-surface-container/30 backdrop-blur-xl p-6 rounded-xl border border-white/5 group hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
              <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg border border-white/10 mb-4 group-hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-primary">language</span>
              </div>
              <h3 className="text-xl font-bodoni font-bold text-on-surface mb-2">Language</h3>
              <p className="text-on-surface-variant text-sm font-bold opacity-50">The platform is configured to English for all riders and drivers across Liberia.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border bg-primary text-[#0c0f0f] border-primary shadow-[0_0_15px_rgba(255,191,116,0.3)] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">check</span>
                <span>English (Liberia)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Logout Section */}
        <div className="mt-16 text-center">
          <button 
            onClick={onLogout}
            className="text-red-400/60 font-bold text-xs hover:text-red-400 transition-colors flex items-center gap-2 mx-auto uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign out of Julian's Portal
          </button>
        </div>
      </main>
    </div>
  );
};

const ClientChat = ({ onExit, onNavigate, currentUser, activeChatDriverId, setActiveChatDriverId, chatMessages, setChatMessages, onLogout, drivers }: any) => {
  const [message, setMessage] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Safe defaults
  const activeDriverId = activeChatDriverId || (drivers && drivers.length > 0 ? drivers[0].id : '');
  const driver = drivers?.find((d: any) => d.id === activeDriverId);
  const user = currentUser || {
    name: 'Passenger',
    rating: 'Member',
    avatar: ''
  };

  const currentChatMessages = driver?.messages || [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !driver) return;

    const newMsg = {
      id: Date.now(),
      text: message,
      sender: 'client',
      senderName: user.name,
      senderId: 'client',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...(driver.messages || []), newMsg];

    await saveDriverToFirestore({
      ...driver,
      messages: updatedMessages,
      hasNotification: true,
      notificationText: "A client texted you today!",
      notificationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    setMessage('');
  };

  return (
    <div className="bg-background min-h-screen flex flex-col items-center overflow-hidden">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-gutter h-16">
        <div className="flex items-center gap-3">
          {/* Dropdown Menu Toggle */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 duration-200 shadow-[0_0_15px_rgba(255,191,116,0.1)] font-sans text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">menu</span>
              <span>Menu</span>
              <span className={`material-symbols-outlined text-xs transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute left-0 mt-2 w-56 bg-surface-container-high/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-white/5 mb-2">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Obsidian Access</p>
                    <p className="text-xs text-on-surface font-bold truncate mt-0.5">{user.name}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      onNavigate('client-portal');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">directions_car</span>
                    <span className="uppercase tracking-wider text-[10px]">Fleet Discovery</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('chat');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">chat_bubble</span>
                    <span className="uppercase tracking-wider text-[10px]">Direct Dispatch</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('trip');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">timer</span>
                    <span className="uppercase tracking-wider text-[10px]">Trip Status</span>
                  </button>

                  <button 
                    onClick={() => {
                      onNavigate('profile');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined text-primary">person</span>
                    <span className="uppercase tracking-wider text-[10px]">Client Profile</span>
                  </button>

                  <div className="h-[1px] bg-white/5 my-2"></div>

                  <button 
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 px-4 flex items-center gap-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left font-bold"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="uppercase tracking-wider text-[10px]">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 duration-200 shadow-[0_0_15px_rgba(255,191,116,0.1)] hover:shadow-[0_0_20px_rgba(255,191,116,0.25)] font-sans text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px] leading-none" style={{ fontVariationSettings: "'wght' 500" }}>logout</span>
              <span>Logout</span>
            </button>
            <button 
              onClick={onExit} 
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95 duration-200 font-sans text-[9px] font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-xs leading-none">arrow_back</span>
              <span>Back</span>
            </button>
          </div>
        </div>
        
        {/* Active Driver Selector Header Tabs */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full max-w-xs md:max-w-md overflow-x-auto scrollbar-none">
          {(drivers || []).map((d: any, idx: number) => (
            <button
              key={d.id || `driver-tab-${idx}`}
              onClick={() => setActiveChatDriverId(d.id)}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${activeDriverId === d.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              {(d.name || d.id || d.role || 'Partner').split(' ')[1] || d.name || d.id || d.role || 'Partner'}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center hidden sm:flex">
          <span className="text-xl font-bodoni font-bold text-primary tracking-wide">{driver?.name || "No Active Partner"}</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-bold opacity-60">{driver?.role || "Status Offline"}</span>
        </div>
        <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 overflow-hidden">
          <img alt="Portrait" className="w-full h-full object-cover rounded-full" src={driver?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"} referrerPolicy="no-referrer" />
        </div>
      </header>

      <main className="w-full max-w-2xl h-screen pt-16 pb-20 flex flex-col relative px-4 md:px-0">
        <div className="bg-surface-container/60 backdrop-blur-xl rounded-xl mt-4 mx-2 p-4 flex items-center justify-between mb-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-high border border-white/5 shadow-inner">
              <span className="material-symbols-outlined text-primary text-3xl">directions_car</span>
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-60">Current Vehicle</h3>
              <p className="text-lg font-bodoni font-bold text-primary">{driver?.vehicle || "N/A"} <span className="text-on-surface-variant font-medium text-sm opacity-40 px-1">|</span> <span className="text-on-surface-variant text-xs opacity-60">{driver?.plate || "-"}</span></p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-60">Hotline</h3>
            <p className="text-base font-mono text-primary font-bold tracking-tight">{driver?.phone || "N/A"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-6 py-4 scrollbar-hide">
          <div className="flex justify-center my-4 animate-pulse">
            <span className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/40 font-bold">Encrypted Direct Link</span>
          </div>
          
          {currentChatMessages.map((m: any, idx: number) => (
            <div key={m.id || `msg-${idx}`} className={`flex flex-col ${m.sender === 'client' ? 'items-end' : 'items-start'} max-w-[85%] ${m.sender === 'client' ? 'ml-auto' : ''}`}>
              <div className={`p-4 rounded-xl font-bold text-sm ${m.sender === 'client' ? 'bg-primary text-on-primary shadow-[0_8px_24px_rgba(245,158,11,0.15)] rounded-br-none' : 'bg-surface-container/60 border border-white/5 text-on-surface rounded-bl-none'}`}>
                {m.text}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 mt-2 font-bold">{m.time} • {m.sender === 'client' ? 'Delivered' : 'Read'}</span>
            </div>
          ))}

          {currentChatMessages.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant/40 italic text-sm">
              No previous dispatches. Send a message to initiate flight clearance.
            </div>
          )}
        </div>

        <div className="bg-background pt-2 pb-6 px-2 w-full absolute bottom-4 left-0 right-0 max-w-2xl mx-auto">
          <form onSubmit={handleSendMessage} className="bg-surface-container-high/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex items-center gap-2 group focus-within:border-primary/40 transition-all">
            <button type="button" className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">add</span>
            </button>
            <input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={driver ? `Send instructions to ${(driver.name || 'Partner').split(' ')[0]}...` : "Send instructions..."} 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30" 
              type="text" 
              disabled={!driver}
            />
            <button type="submit" className="bg-primary text-on-primary w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50" disabled={!message.trim()}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};


const AnimatedTimer = ({ timeString, className = "" }: { timeString: string; className?: string }) => {
  return (
    <span className={`flex items-center justify-center font-mono select-none ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {timeString.split('').map((char, index) => {
        const isColon = char === ':';
        return (
          <span
            key={`timer-char-box-${index}`}
            className="inline-flex items-center justify-center relative overflow-hidden h-[1.25em]"
            style={{ width: isColon ? '0.3em' : '0.62em' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${index}-${char}`}
                initial={{ y: '50%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-50%', opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 26 }}
                className="absolute text-center leading-none"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};

const AnimatedFare = ({ value, className = "" }: { value: string; className?: string }) => {
  return (
    <span className={`inline-flex items-center justify-center font-mono select-none ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value.split('').map((char, index) => {
        const isSpecial = char === '$' || char === '.' || char === ',' || char === '|';
        return (
          <span
            key={`fare-char-box-${index}`}
            className="inline-flex items-center justify-center relative overflow-hidden h-[1.2em]"
            style={{ width: isSpecial ? '0.35em' : '0.58em' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${index}-${char}`}
                initial={{ y: '40%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-40%', opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute leading-none"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};


const TripStatus = ({ 

  selectedVehicleId, 
  selectedVehicleImage, 
  selectedVehicleName, 
  onEndRide, 
  onJoinPartner,
  activeTripState,
  setActiveTripState
}: any) => {
  const [view, setView] = useState<'status' | 'transit'>('status');

  const tripState = activeTripState || {
    status: 'ready',
    isActive: false,
    elapsedTime: 0,
    clientName: 'Passenger',
    pickup: 'Sinkor, Monrovia',
    destination: 'Mamba Point Hotel'
  };

  const isRunning = tripState.status === 'transit';
  const elapsedTime = tripState.elapsedTime;
  
  if (view === 'transit') {
    return (
      <TransitTimer 
        onExit={() => setView('status')} 
        vehicleType={selectedVehicleId} 
        driverName={tripState.acceptedByName || "Captain Voss"} 
        license={tripState.vehiclePlate || "44-OB-21"}
        destination={tripState.destination || "Mamba Point Hotel"}
        tripState={tripState}
      />
    );
  }

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fareUSD = 5 + (elapsedTime * 0.05);
  const fareLRD = fareUSD * 195;

  // Calculate incremental progress over a standard target length
  const projectedDuration = 180; // 3 minutes for simulation
  const progressPercent = tripState.status === 'completed' 
    ? 100 
    : tripState.status === 'ready' 
      ? 0 
      : Math.min((elapsedTime / projectedDuration) * 100, 99.5);

  const distanceVal = isRunning 
    ? Math.min(elapsedTime * 0.045, 12.5).toFixed(1) 
    : (elapsedTime > 0 ? '12.5' : '0.0');

  return (
    <div className="relative w-full max-w-[800px] overflow-hidden rounded-xl bg-slate-900/80 backdrop-blur-xl glass-stroke shadow-2xl p-4 xs:p-6 md:p-12 flex flex-col items-center justify-center group border-[#e9c349]/30 z-10 m-auto mt-10 md:mt-20">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#e9c349]/5 via-transparent to-transparent"></div>
      <div className="relative w-full flex flex-col items-center gap-6">
        <div className="flex items-center justify-center mb-1">
          <TripStatusBadge status={tripState.status} accepted={tripState.accepted} size="lg" />
        </div>

        <div className="w-full flex items-center justify-center gap-4 relative">
          <div 
            onClick={() => setView('transit')}
            className="flex flex-col items-center cursor-pointer group animate-in fade-in duration-500"
          >
            <span className="font-sans font-bold text-[9px] sm:text-xs tracking-[0.25em] sm:tracking-[0.4em] text-gray-400 uppercase mb-4 opacity-70 group-hover:text-primary transition-colors text-center">
              Synchronized Chronometer
            </span>
            <div className="text-4xl min-[360px]:text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white drop-shadow-lg group-hover:scale-105 transition-transform duration-500">
              <AnimatedTimer timeString={formatTime(elapsedTime)} />
            </div>
            <p className="mt-2 text-[10px] text-primary uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Cinematic Map Navigation</p>
          </div>
          
          <div className="hidden md:block absolute right-0 opacity-80 group-hover:scale-105 transition-transform duration-700">
             <img src={selectedVehicleImage} alt={selectedVehicleName} className="h-28 object-contain drop-shadow-2xl" />
             <button 
                onClick={() => {
                  let role = 'rider';
                  if (selectedVehicleId === 'taxi') role = 'chauffeur';
                  else if (selectedVehicleId === 'delivery') role = 'logistics';
                  onJoinPartner(role);
                }}
                className="absolute -bottom-4 right-0 text-[10px] uppercase font-bold text-[#e9c349] border-b border-[#e9c349]/20 hover:border-primary transition-all bg-[#0c0f0f]/80 px-2 py-0.5 rounded font-sans"
              >
                Provider Hub
              </button>
          </div>
        </div>

        <div className="flex items-end gap-6 mt-4">
          <div className="flex flex-col items-center">
             <span className="font-sans font-bold text-[10px] tracking-widest text-[#8e8e8e] uppercase mb-1">Dual-Currency Fare</span>
             <div className="flex items-center gap-1.5 bg-[#1a1c1c]/90 px-4 py-2 rounded-xl border border-white/10 text-xl font-bold text-[#e9c349] shadow-lg">
                <span className="text-[10px] text-[#8e8e8e] font-sans mr-1 tracking-tight select-none font-bold">USD</span>
                <AnimatedFare value={formatUSD(fareUSD)} />
                <span className="text-gray-600 mx-2 select-none">|</span>
                <span className="text-[10px] text-gray-400 font-sans mr-1 tracking-tight select-none font-bold">LRD</span>
                <AnimatedFare value={formatLRD(fareLRD)} className="text-gray-300 text-sm" />
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full mt-6 max-w-md">
          {tripState.status === 'ready' && (
            <div className="w-full text-center space-y-2">
              {!tripState.accepted ? (
                <>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-yellow-500 animate-pulse flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Waiting for Driver Approval
                    </p>
                    <p className="text-[10px] text-gray-400 leading-normal font-light mt-1 font-sans">
                      Your voyage request has been dispatched. Chauffeur approval must be explicitly given before countdown and transit timers initialize.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (setActiveTripState) {
                        setActiveTripState((prev: any) => ({
                          ...prev,
                          accepted: true
                        }));
                      }
                    }}
                    className="w-full mt-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/40 font-sans font-bold text-[11px] tracking-widest py-3 px-6 rounded uppercase hover:bg-yellow-500/30 transition-all font-mono"
                  >
                    Simulate Driver Approving Ride
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#e9c349] animate-pulse flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Awaiting Chauffeur Start
                    </p>
                    <p className="text-[10px] text-gray-400 leading-normal font-light mt-1 font-sans">
                      Ride approved! The dual-chronometer timer will start counting automatically once the operator initializes the ride from the vehicle console.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (setActiveTripState) {
                        setActiveTripState((prev: any) => ({
                          ...prev,
                          status: 'transit',
                          isActive: true
                        }));
                      }
                    }}
                    className="w-full mt-2 bg-primary/20 text-primary border border-primary/40 font-sans font-bold text-[11px] tracking-widest py-3 px-6 rounded uppercase hover:bg-primary/30 transition-all"
                  >
                    Simulate Driver Starting Journey
                  </button>
                </>
              )}
            </div>
          )}

          {tripState.status === 'transit' && (
            <div className="w-full text-center space-y-2">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <p className="text-xs uppercase font-extrabold tracking-widest text-green-400 animate-pulse flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">directions_car</span>
                  Transit Active
                </p>
                <p className="text-[10px] text-gray-400 leading-normal font-light mt-1 font-sans">
                  Timer chronometer actively counting on parent chauffeur-client console. Enjoy your premium Obsidian ride.
                </p>
              </div>
              <button 
                onClick={() => {
                  if (setActiveTripState) {
                    setActiveTripState((prev: any) => ({
                      ...prev,
                      status: 'completed',
                      isActive: false
                    }));
                  }
                }}
                className="w-full mt-2 bg-red-400/10 text-red-400 border border-red-500/20 font-sans font-bold text-[11px] tracking-widest py-3 px-6 rounded uppercase hover:bg-red-400/20 transition-all"
              >
                Simulate Driver Ending Journey
              </button>
            </div>
          )}

          {tripState.status === 'completed' && (
            <button 
              onClick={onEndRide}
              className="w-full bg-[#e9c349] text-[#0c0f0f] font-sans font-bold text-sm tracking-widest py-4 px-8 rounded-lg uppercase hover:opacity-90 active:scale-95 transition-all"
            >
              Arrived: Proceed to Safe Logout
            </button>
          )}
        </div>

        <div className="w-full mt-10 space-y-3">
          <div className="relative h-[3px] w-full bg-gray-600/30 rounded-full overflow-hidden">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-[#e9c349] glow-gold rounded-full" 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 45, damping: 15 }}
            />
          </div>
          <div className="flex justify-center w-full">
            <div className="font-sans text-xs font-bold text-gray-400 tracking-wider opacity-90 uppercase flex items-center justify-center gap-1.5 h-6">
              <span>Distance Traveled:</span> 
              <AnimatedFare value={`${distanceVal} km`} className="text-[#e9c349]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransitTimer = ({ onExit, vehicleType, driverName, license, destination, tripState }: any) => {
  const [timeLeft, setTimeLeft] = useState(255); // 4 minutes 15 seconds
  const totalTime = 300; 

  const elapsedTime = tripState?.elapsedTime || 0;
  const fareUSD = 5 + (elapsedTime * 0.05);
  const fareLRD = fareUSD * 195;
  const distanceVal = tripState?.status === 'transit'
    ? Math.min(elapsedTime * 0.045, 12.5).toFixed(1)
    : (elapsedTime > 0 ? '12.5' : '0.0');

  useEffect(() => {
    if (tripState?.status !== 'transit') {
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tripState?.status]);

  const [showLiveMap, setShowLiveMap] = useState<boolean>(false);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const digitalTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const circumference = 54 * 2 * Math.PI;
  const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[100] bg-[#131313] flex flex-col items-center justify-center p-4 selection:bg-primary/30 selection:text-primary overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 30%, #1a1510 0%, #0a0a0a 70%, #000000 100%)' }}></div>
      
      {/* Top Action Bar */}
      <header className="w-full flex justify-between items-center p-6 md:p-12 absolute top-0 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLiveMap(!showLiveMap)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#111418]/90 backdrop-blur-md border border-[#e9c349]/30 text-white hover:border-[#e9c349] transition-all shadow-xl font-mono text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm text-[#e9c349]">
              {showLiveMap ? 'timer' : 'map'}
            </span>
            <span>{showLiveMap ? 'Show Countdown Ring' : 'Show Live GPS Map'}</span>
          </button>
        </div>

        <button 
          onClick={onExit}
          className="w-12 h-12 rounded-full bg-surface-container-low/50 backdrop-blur-md border border-white/5 flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container-high transition-colors duration-300 group focus:outline-none focus:ring-2 focus:ring-primary/50">
          <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">close</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto mt-16 md:mt-0">
        {showLiveMap ? (
          /* Live Interactive Map Tracking Mode with Dynamic Vehicle Icon */
          <div className="w-full max-w-xl h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#e9c349]/30 shadow-2xl relative mb-6">
            <InteractiveMap
              pickupLat={tripState?.pickupLat || 6.3156}
              pickupLng={tripState?.pickupLng || -10.8074}
              destinationLat={tripState?.destinationLat || 6.3006}
              destinationLng={tripState?.destinationLng || -10.8124}
              popupText={`${driverName || 'Chauffeur'} - Live Transit in Monrovia`}
              vehicleType={vehicleType}
              hasActiveTrip={true}
              tripStatus={tripState?.status}
              tripAccepted={tripState?.accepted}
              driverId={tripState?.acceptedBy || PRODUCTION_DRIVERS[0]?.id || ''}
              height="100%"
            />
            <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30 text-[9px] uppercase tracking-widest font-mono font-bold flex items-center gap-1.5 z-[1000] text-[#e9c349]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live {vehicleType.toUpperCase()} Movement
            </div>
          </div>
        ) : (
          /* Timer Section */
          <div className="relative flex flex-col items-center justify-center mb-8 sm:mb-12">
            {/* SVG Progress Ring */}
            <svg className="w-52 h-52 min-[360px]:w-60 min-[360px]:h-60 md:w-72 md:h-72 lg:w-84 lg:h-84 -rotate-90" viewBox="0 0 120 120">
              {/* Track */}
              <circle className="text-surface-variant stroke-current" cx="60" cy="60" fill="transparent" r="54" strokeWidth="2"></circle>
              {/* Progress */}
              <motion.circle 
                className="text-primary stroke-current drop-shadow-[0_0_8px_rgba(255,193,116,0.5)]" 
                cx="60" cy="60" fill="transparent" r="54" 
                strokeWidth="3"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ type: "spring", stiffness: 45, damping: 15 }}
                strokeLinecap="round"
              />
              {/* Inner Glass Circle */}
              <circle className="fill-surface-container-lowest/40 stroke-white/5" cx="60" cy="60" r="48" strokeWidth="0.5"></circle>
            </svg>
            {/* Digital Countdown Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center group">
              {tripState?.status === 'transit' ? (
                <>
                  <AnimatedTimer 
                    timeString={digitalTime} 
                    className="font-bodoni text-[38px] min-[360px]:text-[46px] min-[400px]:text-[52px] sm:text-[72px] md:text-[88px] lg:text-[104px] text-on-background tracking-tighter leading-none drop-shadow-lg group-hover:scale-105 transition-transform duration-500" 
                  />
                  <span className="font-cinzel text-[10px] sm:text-xs text-primary mt-2 uppercase tracking-[0.2em] opacity-80 font-bold">Estimated Arrival</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.15em] text-[#e9c349] animate-pulse drop-shadow-lg">Awaiting Start</span>
                  <span className="font-cinzel text-[8px] sm:text-[10px] text-gray-400 mt-2 uppercase tracking-[0.15em] opacity-85 text-center px-4 font-bold">Chauffeur preparing ride vehicle</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Details Card */}
        <div className="w-full max-w-md bg-surface-container/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          <div className="w-12 h-12 rounded-full bg-surface-container-high/80 border border-white/5 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-2xl">
              {vehicleType === 'bike' ? 'motorcycle' : (vehicleType === 'kekeh' ? 'electric_rickshaw' : 'directions_car')}
            </span>
          </div>
          <h2 className="text-2xl font-bodoni font-bold text-on-surface mb-1 uppercase tracking-widest">{vehicleType === 'bike' ? 'Royal Enfield' : (vehicleType === 'kekeh' ? 'Golden Rickshaw' : 'Mercedes S-Class')}</h2>
          <p className="text-body-md text-on-surface-variant flex items-center gap-2 font-bold opacity-70">
            <span className={`w-2 h-2 rounded-full animate-pulse ${tripState?.status === 'transit' ? 'bg-primary' : 'bg-yellow-500'}`}></span>
            {tripState?.status === 'transit' ? `En Route to ${destination || 'Mamba Point'}` : 'Boarding / Approval Stage'}
          </p>
          <div className="w-full h-px bg-white/5 my-6"></div>
          
          {/* Spring-animated Distance & Dual-Currency Fare */}
          <div className="grid grid-cols-2 gap-4 w-full mb-6 font-mono text-center">
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/10 border border-white/5 shadow-inner">
              <span className="text-[9px] text-[#e9c349] uppercase tracking-widest font-extrabold mb-1">Distance Driven</span>
              <div className="font-bold text-white text-base">
                <AnimatedFare value={`${distanceVal} km`} className="text-[#e9c349]" />
              </div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/10 border border-white/5 shadow-inner">
              <span className="text-[9px] text-[#e9c349] uppercase tracking-widest font-extrabold mb-1">Fare (USD / LRD)</span>
              <div className="font-bold text-white text-xs flex flex-col items-center gap-0.5 justify-center">
                <AnimatedFare value={formatUSD(fareUSD)} className="text-primary text-sm font-bold" />
                <AnimatedFare value={formatLRD(fareLRD)} className="text-gray-300 text-[10px]" />
              </div>
            </div>
          </div>

          <div className="flex justify-between w-full font-cinzel text-[10px] uppercase tracking-widest font-bold">
            <div className="flex flex-col items-center">
              <span className="text-on-surface-variant opacity-60 mb-1">Operator</span>
              <span className="text-on-surface">{driverName || 'James D.'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-on-surface-variant opacity-60 mb-1">Registry</span>
              <span className="text-on-surface tracking-wider">{license || 'OBS-001'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Area */}
      <footer className="w-full flex justify-center pb-8 pt-4 md:pb-12 z-20">
        <button 
          onClick={onExit}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-transparent border border-white/10 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all duration-300 font-cinzel text-[10px] uppercase tracking-wider font-bold group focus:outline-none focus:ring-2 focus:ring-primary/50">
          <span className="material-symbols-outlined text-lg group-hover:-translate-y-0.5 transition-transform">expand_more</span>
          Minimize
        </button>
      </footer>
    </div>
  );
};

const ChauffeurPortal = ({ 
  onExit, 
  drivers, 
  setDrivers, 
  activeTripState, 
  setActiveTripState, 
  chatMessages, 
  setChatMessages,
  activeChatDriverId,
  setActiveChatDriverId,
  onLogout,
  setIsLoggedIn,
  currentUser,
  setCurrentUser,
  language,
  setLanguage
}: any) => {
  const [view, setView] = useState<'auth' | 'dashboard'>('auth');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [isOnline, setIsOnline] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'command' | 'vessel' | 'chat' | 'momo'>('command');
  const [chatReply, setChatReply] = useState('');
  const [newCarName, setNewCarName] = useState('');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [newCarImage, setNewCarImage] = useState('');

  // Form states
  const [currentDriverId, setCurrentDriverId] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Automatically bypass auth ONLY when currentUser is strictly an authorized Car Driver (Chauffeur)
  useEffect(() => {
    if (!currentUser) {
      setView('auth');
      return;
    }
    const classification = classifyAccount(currentUser);
    if (classification.isCarDriver) {
      setCurrentDriverId(currentUser.id);
      setView('dashboard');
    } else {
      // Prevent cross-role leakage from Rider, Kekeh, Client, or Admin sessions
      setCurrentDriverId('');
      setView('auth');
    }
  }, [currentUser]);

  // Extract logged-in driver's profile strictly for currentDriverId
  const driverProfile = drivers?.find((d: any) => d.id === currentDriverId) || (
    PRODUCTION_DRIVERS.find(d => d.id === currentDriverId) || {
      id: currentDriverId || '',
      name: 'Chauffeur',
      phone: '',
      plate: '',
      role: 'Chauffeur',
      vehicleType: 'car',
      vehicle: 'Executive Sedan',
      rating: '5.00',
      status: 'Available',
      accountStatus: 'active',
      earnings: 0,
      commissionPaid: 0,
      lat: 6.3156,
      lng: -10.8074,
      avatar: '',
      vehiclesList: []
    }
  );

  const updateProfile = async (updatedFields: any) => {
    const updatedDriver = { ...driverProfile, ...updatedFields };
    // Synchronize to Firestore database
    await saveDriverToFirestore(updatedDriver);
  };

  // Automatically clear notification when chat is opened
  useEffect(() => {
    if (activeTab === 'chat' && driverProfile.hasNotification) {
      updateProfile({ hasNotification: false });
    }
  }, [activeTab, driverProfile.hasNotification]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImage(reader.result as string, 200, 200, 0.6).then((compressed) => {
          updateProfile({ avatar: compressed });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCarImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImage(reader.result as string, 350, 200, 0.6).then((compressed) => {
          setNewCarImage(compressed);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const deployCar = (carId: string) => {
    const cars = driverProfile.vehiclesList || [];
    const car = cars.find((c: any) => c.id === carId);
    if (car) {
      updateProfile({
        vehicle: car.name,
        plate: car.plate,
        vehiclesList: cars.map((c: any) => ({
          ...c,
          active: c.id === carId
        }))
      });
    }
  };

  const handleAddCarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCarObj = {
      id: 'car-' + Date.now(),
      name: newCarName || 'Luxury Sedan Custom',
      plate: newCarPlate || 'OBS-999',
      image: newCarImage || 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80',
      active: true
    };
    
    const currentList = driverProfile.vehiclesList || [
      { id: 'car-1', name: 'Mercedes S-Class (Black)', plate: '44-OB-21', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80', active: false }
    ];

    const updatedList = [
      ...currentList.map((c: any) => ({ ...c, active: false })),
      newCarObj
    ];
    
    updateProfile({
      vehicle: newCarObj.name,
      plate: newCarObj.plate,
      vehiclesList: updatedList
    });
    
    setNewCarName('');
    setNewCarPlate('');
    setNewCarImage('');
  };

  const handleSendChatReply = async (text: string) => {
    if (!text.trim()) return;
    const newMsg = {
      id: Date.now(),
      text: text,
      sender: 'driver',
      senderName: driverProfile.name,
      senderId: currentDriverId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    await saveDriverToFirestore({
      ...driverProfile,
      messages: [...(driverProfile.messages || []), newMsg]
    });
    setChatReply('');
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-primary/5 rounded-full -top-1/4 -right-1/4 blur-[120px]"></div>
          <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full -bottom-1/4 -left-1/4 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 glass-panel rounded-2xl p-8 border border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col items-center mb-8 text-center">
            <span className="font-cinzel text-primary tracking-[0.3em] font-bold text-sm mb-2 uppercase">Chauffeur Command</span>
            <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent mb-6"></div>
            <h2 className="text-3xl font-bodoni font-bold text-on-surface mb-2">Commander Login</h2>
            <p className="text-on-surface-variant text-body-md opacity-70">
              Authorized fleet personnel only • Admin provisioned
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-200 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="material-symbols-outlined text-red-500 mt-0.5 shrink-0 select-none">error_outline</span>
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-red-400 font-mono mb-1">Access Restricted</p>
                <p className="font-light leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={async (e) => { 
            e.preventDefault(); 
            setAuthError(null);
            
            // Basic Input Validation
            if (!employeeId || !employeeId.trim()) {
              setAuthError("Validation Error: Registry ID / Phone Number is required.");
              return;
            }
            if (!password || !password.trim()) {
              setAuthError("Validation Error: Access Key / PIN is required.");
              return;
            }

            try {
              // Strictly authenticate against the Chauffeur Car Driver portal
              const authRes = await authenticateWithRoleGuard(
                employeeId.trim(),
                password.trim(),
                'chauffeur',
                drivers
              );

              if (!authRes.success || !authRes.account) {
                setAuthError(authRes.error || "Access Denied: Unrecognized or unauthorized chauffeur credentials.");
                return;
              }

              const authedDriver = authRes.account;
              setCurrentDriverId(authedDriver.id);
              if (setCurrentUser) setCurrentUser(authedDriver);
              if (setIsLoggedIn) setIsLoggedIn(true);
              setView('dashboard');
            } catch (error: any) {
              console.error("Chauffeur authentication error:", error);
              setAuthError(error?.message || "An unexpected error occurred during chauffeur authentication.");
            }
          }}>
            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Employee ID / Phone</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors select-none pointer-events-none w-6 h-6 overflow-hidden flex items-center justify-center">id_card</span>
                <input required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-body-md text-on-surface placeholder:text-surface-variant" placeholder="Registry ID or Phone" type="text" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Access Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors select-none pointer-events-none w-6 h-6 overflow-hidden flex items-center justify-center">vpn_key</span>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-body-md text-on-surface placeholder:text-surface-variant" placeholder="••••••••" type="password" />
              </div>
            </div>

            <button type="submit" className="w-full bg-primary text-on-primary font-bold py-5 rounded-lg uppercase tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all mt-4 cursor-pointer">
              Initialize Command
            </button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              Admin-Managed Fleet
            </p>
            <p className="text-[11px] text-gray-400">
              Chauffeur accounts are created exclusively by management through the Admin Portal.
            </p>
          </div>

          <button onClick={onExit} className="w-full mt-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity cursor-pointer">Exit to Main Landing Dashboard</button>
        </div>
      </div>
    );
  }

  const accountStatus = driverProfile.accountStatus || 'active';

  if (accountStatus === 'hold' || accountStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#0c0f0f] text-on-surface p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary select-none">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="w-full max-w-4xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-500 my-auto">
          <div className="glass-panel p-8 border border-red-500/30 rounded-2xl bg-black/60 relative overflow-hidden shadow-2xl space-y-6 text-center">
            <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-4 text-red-500 animate-pulse">
              <span className="material-symbols-outlined text-4xl leading-none">block</span>
            </div>
            
            {accountStatus === 'hold' ? (
              <div className="space-y-2">
                <span className="font-cinzel text-xs text-primary uppercase tracking-[0.25em] font-bold">Policy Compliance Hold</span>
                <h2 className="text-3xl font-bodoni font-bold text-on-surface">Account Temporarily Restricted</h2>
                <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto my-4"></div>
                <p className="text-sm font-light text-on-surface-variant max-w-2xl mx-auto leading-relaxed opacity-85">
                  Your premium partner account is placed on **Temporary Hold** by administration due to outstanding platform commissions. Under the 10% platform policy guidelines, you are required to submit the due commission sent via MTN Liberia MoMo to <strong className="text-primary font-mono bg-white/5 px-2 py-0.5 rounded">0887510845</strong>.
                </p>
                <p className="text-xs text-amber-500 font-semibold italic mt-2">
                  Once your transfer reference code is filed and validated by admin, your fleet credentials will be automatically restored.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="font-cinzel text-xs text-red-500 uppercase tracking-[0.25em] font-bold">Revocation Completed</span>
                <h2 className="text-3xl font-bodoni font-bold text-red-400">Partner Account Suspended</h2>
                <div className="h-px w-20 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto my-4"></div>
                <p className="text-sm font-light text-on-surface-variant max-w-2xl mx-auto leading-relaxed opacity-85 text-red-200">
                  We regret to inform you that your driver profile has been systematically taken down and suspended for flagrant violation of the 10% commissions and operating policies. All vehicle registries have been unlinked.
                </p>
                <p className="text-xs text-red-400 italic">
                  To appeal this decision, please present your valid MTN Liberia transfer credentials or contact support.
                </p>
              </div>
            )}
            
            <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest pt-2.5">
              <button 
                onClick={onExit}
                className="bg-white/5 border border-white/10 text-on-surface px-5 py-3 rounded-xl hover:bg-white/10 transition-all duration-300 pointer-events-auto"
              >
                Exit Platform
              </button>
            </div>
          </div>
          
          {accountStatus === 'hold' && (
            <div className="bg-black/40 border border-white/5 p-6 rounded-xl relative overflow-hidden glass-panel space-y-6">
              <h3 className="font-bodoni text-xl text-primary font-bold border-b border-white/5 pb-2">Instant Remediation Payment Hub</h3>
              <MomoPaymentHub driverProfile={driverProfile} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary selection:text-on-primary pb-16">
      {/* Drawer Menu */}
      <aside className={`fixed left-0 inset-y-0 w-80 z-[60] bg-[#0e0e0e]/95 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-500 ease-in-out overflow-y-auto ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col min-h-full py-8">
          <div className="px-8 flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-primary/20 overflow-hidden shrink-0">
                <img src={driverProfile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="font-cinzel text-[8px] text-primary uppercase tracking-widest font-bold">Chauffeur</span>
                <h4 className="font-headline-md text-sm text-on-surface">{driverProfile.name}</h4>
                <p className="text-[10px] text-primary font-mono flex items-center gap-0.5 mt-0.5 font-bold">
                  <span className="material-symbols-outlined text-[11px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span>{driverProfile.rating || '4.98'}</span>
                </p>
              </div>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="material-symbols-outlined text-gray-400 hover:text-white">close</button>
          </div>
          
          <div className="h-px bg-white/10 mx-8 mb-6"></div>

          <nav className="flex-1 space-y-2 px-6">
            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('command'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'command' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">dashboard</span>
              Command Center
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('vessel'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'vessel' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">directions_car</span>
              My Vessel
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('chat'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'chat' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <div className="flex items-center">
                <span className="material-symbols-outlined mr-4 text-primary">chat</span>
                Passenger Chat
              </div>
              {driverProfile.hasNotification && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setIsScannerOpen(true); }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all text-sm uppercase tracking-widest font-bold"
            >
              <span className="material-symbols-outlined mr-4 text-primary">qr_code_scanner</span>
              Code Scanner
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('momo'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'momo' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">currency_exchange</span>
              MoMo 10% Policy
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm uppercase tracking-widest font-bold mt-4"
            >
              <span className="material-symbols-outlined mr-4 text-red-400">logout</span>
              Logout Account
            </button>
          </nav>

          <div className="px-8 mt-auto pt-6 divide-y divide-white/5">
            <button 
              onClick={() => { setIsMenuOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }}
              className="w-full flex items-center py-4 text-red-400 hover:text-red-300 transition-colors uppercase tracking-[0.2em] font-bold text-xs justify-center gap-2 border border-red-500/10 bg-red-500/5 rounded mt-4"
            >
              <span className="material-symbols-outlined">logout</span>
              Logout Account
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm animate-in fade-in duration-300"></div>}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-panel rounded-2xl p-6 border border-primary/20 text-center relative overflow-hidden amber-glow">
            <div className="absolute top-4 right-4">
              <button onClick={() => setIsScannerOpen(false)} className="material-symbols-outlined text-gray-400 hover:text-white">close</button>
            </div>
            
            <div className="mb-6 mt-4">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse w-full">qr_code_scanner</span>
              <h3 className="text-xl font-bodoni font-bold text-on-surface mt-2">Biometric Boarding Key</h3>
              <p className="text-xs text-on-surface-variant opacity-75 mt-1">Scan passenger boarding credential or logistics cargo tag.</p>
            </div>

            <div className="relative aspect-square w-full rounded-xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
              
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary/70 shadow-[0_0_10px_rgba(255,193,116,0.8)] animate-[bounce_3s_infinite]"></div>
              
              <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest text-center px-4 animate-pulse">
                [ CAMERA MODULE INITIATED ]<br/>
                <span className="text-white/40 font-sans text-[9px] mt-1 block">Awaiting physical biometric identification</span>
              </div>
            </div>

            <button 
              onClick={() => { setIsScannerOpen(false); alert('Success: Biometric identity verified. Member status: UNLOCKED.'); }}
              className="mt-6 w-full bg-primary text-on-primary font-bold py-3 rounded-lg text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
            >
              Simulate Scan Tag
            </button>
          </div>
        </div>
      )}

      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/5 flex justify-between items-center px-4 md:px-12 h-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-4 cursor-pointer active:scale-95 transition-transform hover:opacity-80"
          >
            <span className="material-symbols-outlined text-primary">menu</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('command')}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'command' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              Center
            </button>
            <button 
              onClick={() => setActiveTab('vessel')}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'vessel' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              My Vessel
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center gap-1.5 ${activeTab === 'chat' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              <span>Passenger Chat</span>
              {driverProfile.hasNotification && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('momo')}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center gap-1.5 ${activeTab === 'momo' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[12px]">currency_exchange</span>
              <span>10% MoMo</span>
            </button>
          </div>
        </div>
        
        <div className="font-cinzel text-xl md:text-2xl tracking-[0.2em] text-primary uppercase font-bold">OBSIDIAN</div>
        
        <div className="flex items-center gap-4">
          <div className="text-primary font-bold text-lg md:text-xl">$2,450.00</div>
          
          {/* Liberia English Badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full py-1.5 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Liberia • EN</span>
          </div>

          <button 
            type="button"
            onClick={() => { setView('auth'); if (onLogout) onLogout(); else onExit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 duration-200 font-sans text-[10px] font-bold uppercase tracking-widest cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs leading-none">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="px-4 md:px-12 max-w-7xl mx-auto space-y-8 pt-24">
        {activeTab === 'command' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Image Section */}
            <section className="relative w-full aspect-[16/7] overflow-hidden rounded-xl border border-white/5 shadow-2xl">
              <img alt="Chauffeur Command Vehicle" className="w-full h-full object-cover" src="https://i.ibb.co/MkFYMj4n/Gemini-Generated-Image-a249fha249fha249.png" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
            </section>

            {/* Header Status Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl md:text-5xl font-bodoni text-primary leading-tight font-bold">Chauffeur Command Portal</h1>
                  <p className="font-body-md text-on-surface-variant opacity-70">Welcome back, Captain. Your vessel is ready.</p>
                </div>
                
                {/* Active Chat Booking Banner Button */}
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="bg-primary/15 hover:bg-primary/25 border border-primary/30 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all self-start text-xs uppercase font-bold tracking-widest text-primary animate-pulse"
                >
                  <span className="material-symbols-outlined text-sm">chat_bubble</span>
                  Passenger Chat Hub
                  {driverProfile.hasNotification && (
                    <span className="h-2 w-2 rounded-full bg-red-500 ml-2" title="New Message"></span>
                  )}
                </button>
              </div>

              {/* Live Dispatch Notification */}
              {driverProfile.hasNotification && (
                <div className="bg-primary/10 border border-primary/50 text-primary p-5 rounded-xl flex items-center justify-between gap-4 animate-bounce">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl animate-pulse">notifications_active</span>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Live dispatch update</p>
                      <p className="text-sm font-sans text-on-surface/90 font-medium mt-1">
                        {driverProfile.notificationText || "A client texted you today!"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('chat')} 
                      className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      Open Chat
                    </button>
                    <button 
                      onClick={async () => {
                        await updateProfile({ hasNotification: false });
                      }} 
                      className="border border-white/20 text-on-surface hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              
              {/* Online Toggle */}
              <div className="glass-panel rounded-xl px-6 py-5 flex items-center justify-between border border-white/5 hover:border-primary/20 transition-all">
                <div className="flex flex-col">
                  <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest mb-1 font-bold">Active Status</span>
                  <span className={`text-2xl md:text-3xl font-bold uppercase tracking-widest font-bodoni ${isOnline ? 'text-primary' : 'text-on-surface'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <button 
                  onClick={() => setIsOnline(!isOnline)}
                  className={`relative inline-flex h-10 w-20 shrink-0 cursor-pointer items-center rounded-full border-2 border-white/10 transition-colors duration-500 ease-in-out focus:outline-none ${isOnline ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <span aria-hidden="true" className={`pointer-events-none inline-block h-8 w-8 rounded-full shadow-xl transition duration-500 ease-in-out ${isOnline ? 'translate-x-10 bg-white' : 'translate-x-1 bg-white/20'}`}></span>
                </button>
              </div>
            </section>

            {/* REAL-TIME TRIP TRANSIT TIMER CONTROL */}
            <section className="animate-in slide-in-from-top-6 duration-700">
              <div className="glass-panel rounded-xl p-8 border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">local_taxi</span>
                    <div>
                      <h3 className="text-2xl font-bodoni font-bold text-on-surface">Transit & Timer Dispatch</h3>
                      <p className="text-xs text-on-surface-variant opacity-60 font-sans mt-0.5">Control live counting of voyage and fare accruals.</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest self-start ${activeTripState.status === 'transit' ? 'bg-primary/20 text-primary pulse font-sans' : (activeTripState.status === 'completed' ? 'bg-green-500/20 text-green-400 font-sans' : 'bg-white/10 text-on-surface-variant font-sans')}`}>
                    {activeTripState.status === 'transit' ? '● In Transit' : (activeTripState.status === 'completed' ? '✓ Completed' : 'Ready / Assigned')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block opacity-60 font-cinzel">Client Passenger</span>
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">person</span>
                      {activeTripState.clientName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block opacity-60 font-cinzel font-bold">Route details</span>
                    <span className="text-xs font-light text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      {activeTripState.pickup} ➔ {activeTripState.destination}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block opacity-60 font-cinzel font-bold">Active Vessel</span>
                    <span className="text-xs font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">directions_car</span>
                      {driverProfile.vehicle} ({driverProfile.plate})
                    </span>
                  </div>
                </div>

                {/* VIP Chauffeur Active Monitoring Panel (Amenities & SOS & Companion list) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* Real-time In-Transit Amenities Checklist */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                    <div>
                      <h4 className="text-primary font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-[#e9c349]">checklist_rtl</span>
                        Client Luxury Amenities
                      </h4>
                      <p className="text-[9px] text-on-surface-variant opacity-60 mt-0.5">Please prepare and provide the following requested items in transit:</p>
                    </div>

                    {!(activeTripState.amenities && activeTripState.amenities.length > 0) ? (
                      <div className="text-[10px] font-mono text-on-surface-variant opacity-50 py-2 italic">
                        No custom amenities requested for this passage.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'wifi', name: 'Pocket Wi-Fi', icon: 'wifi' },
                          { id: 'water', name: 'AquaLife Water', icon: 'local_drinking_water' },
                          { id: 'newspaper', name: 'Daily Observer', icon: 'newspaper' },
                          { id: 'purifier', name: 'Ozone Filter', icon: 'filter_alt' },
                          { id: 'espresso', name: 'Hot Espresso', icon: 'local_cafe' },
                          { id: 'charger', name: 'Device Charger', icon: 'battery_charging_full' }
                        ].map((amenity) => {
                          const isRequested = activeTripState.amenities.includes(amenity.id);
                          if (!isRequested) return null;
                          return (
                            <div 
                              key={amenity.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary"
                            >
                              <span className="material-symbols-outlined text-xs">{amenity.icon}</span>
                              <span className="text-[10px] font-bold select-none leading-none">{amenity.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Operational Emergency SOS / Security Status */}
                  <div className={`border rounded-xl p-5 space-y-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                    activeTripState.sosActive 
                      ? 'bg-red-500/10 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-xs uppercase tracking-widest font-sans flex items-center gap-1.5 ${
                          activeTripState.sosActive ? 'text-red-400' : 'text-primary'
                        }`}>
                          <span className="material-symbols-outlined text-base">emergency_home</span>
                          Rider Safe-Guard Security
                        </h4>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
                          activeTripState.sosActive ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500/10 text-green-400'
                        }`}>
                          {activeTripState.sosActive ? 'SOS SIGNAL FLAGGED' : 'SECURE'}
                        </span>
                      </div>
                      <p className="text-[9px] text-on-surface-variant opacity-60 mt-1">
                        {activeTripState.sosActive 
                          ? 'ALERT: Chauffeur must maintain stable operations. Tactical Security is tracking telemetry coordinates.' 
                          : 'Rider secure beacon initialized. GPS trace is fully encrypted on Monrovia central node.'}
                      </p>
                    </div>

                    {activeTripState.sosActive && (
                      <button
                        onClick={async () => {
                          const resolveSOS = window.confirm("Confirm resolution of security status? This will deactivate the priority distress trigger.");
                          if (!resolveSOS) return;
                          const updatedTrip = {
                            ...activeTripState,
                            sosActive: false
                          };
                          setActiveTripState(updatedTrip);
                          await saveActiveTripToFirestore(updatedTrip);
                        }}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">gavel</span>
                        Acknowledge & Resolve SOS
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-8 bg-black/40 rounded-xl border border-white/5 shadow-inner relative overflow-hidden">
                  <img src="https://i.ibb.co/Y4v55HWW/Gemini-Generated-Image-6oznyy6oznyy6ozn.png" alt="Transit Timer Header" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-[10px] text-white font-bold uppercase tracking-[0.3em] opacity-75 mb-2 font-mono">[ Transit Chronometer ]</span>
                    <span className="text-6xl md:text-7xl font-bold tracking-tight text-white mb-4 drop-shadow-md" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {formatTime(activeTripState.elapsedTime)}
                    </span>
                    <span className="text-xs text-white uppercase tracking-wide font-bold">
                      Dual Fare Accrued: <span className="text-primary">{formatUSD(5 + activeTripState.elapsedTime * 0.05)}</span> | <span className="text-white font-mono">{formatLRD((5 + activeTripState.elapsedTime * 0.05) * 195)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  {activeTripState.status === 'ready' && !activeTripState.accepted && (
                    <button 
                      onClick={async () => {
                        const nextState = {
                          ...activeTripState,
                          accepted: true,
                          acceptedBy: driverProfile.id || PRODUCTION_DRIVERS[0]?.id || 'driver_unassigned',
                          acceptedByName: driverProfile.name || PRODUCTION_DRIVERS[0]?.name || 'Unassigned Chauffeur',
                          vehiclePlate: driverProfile.plate || PRODUCTION_DRIVERS[0]?.plate || '',
                          status: 'ready'
                        };
                        setActiveTripState(nextState);
                        await saveActiveTripToFirestore(nextState);
                      }}
                      className="flex-grow bg-[#e9c349] text-[#0c0f0f] py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 font-sans"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      {getTranslation(language, 'approve_ride')}
                    </button>
                  )}

                  {activeTripState.status === 'ready' && activeTripState.accepted && (
                    <div className="w-full text-center space-y-3">
                      <p className="text-[10px] text-green-400 font-extrabold tracking-[0.2em] uppercase font-sans flex items-center justify-center gap-1.5 animate-pulse">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Booking Accepted! Prepared for client pickup.
                      </p>
                      <button 
                        onClick={async () => {
                          const nextState = {
                            ...activeTripState,
                            status: 'transit',
                            isActive: true,
                            started: true,
                            elapsedTime: 0
                          };
                          setActiveTripState(nextState);
                          await saveActiveTripToFirestore(nextState);
                        }}
                        className="w-full bg-[#1a2e26]/80 text-[#30e38a] border border-[#30e38a]/30 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 font-sans"
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        {getTranslation(language, 'start_ride')}
                      </button>
                    </div>
                  )}

                  {activeTripState.status === 'transit' && (
                    <button 
                      onClick={async () => {
                        const nextState = {
                          ...activeTripState,
                          status: 'completed',
                          isActive: false,
                        };
                        setActiveTripState(nextState);
                        await saveActiveTripToFirestore(nextState);
                      }}
                      className="flex-grow bg-[#2b1717] border border-red-500/40 text-red-400 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 font-sans"
                    >
                      <span className="material-symbols-outlined text-base">stop</span>
                      {getTranslation(language, 'end_ride')}
                    </button>
                  )}

                  {activeTripState.status === 'completed' && (
                    <button 
                      onClick={async () => {
                        const nextState = {
                          status: 'ready',
                          isActive: false,
                          elapsedTime: 0,
                          clientName: 'Passenger',
                          pickup: 'Sinkor, Monrovia',
                          pickupLat: 6.3156,
                          pickupLng: -10.8074,
                          destination: 'Mamba Point Hotel',
                          destinationLat: 6.3006,
                          destinationLng: -10.8124,
                          vehicleId: 'taxi',
                          accepted: false,
                          acceptedBy: null,
                          acceptedByName: null,
                          started: false,
                        };
                        setActiveTripState(nextState);
                        await saveActiveTripToFirestore(nextState);
                      }}
                      className="flex-grow bg-white/5 border border-white/10 text-on-surface py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 font-sans"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Reset Dispatch for Next Passenger
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Earnings Card */}
            <div className="glass-panel rounded-xl p-8 relative overflow-hidden group">
              <div className="absolute top-8 right-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
              </div>
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest font-bold">Performance Summary</span>
                    <h2 className="text-3xl font-bodoni font-bold mt-2">Aggregated Earnings</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 rounded border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest bg-primary/5 pulse">Live Updates</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="font-cinzel text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-60">Weekly Revenue (USD)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[52px] font-bold text-primary tabular-nums" style={{ fontFamily: '"Inter", sans-serif' }}>$1,240</span>
                      <span className="text-xl font-bold text-primary/60">.50</span>
                      <span className="ml-3 text-primary material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-cinzel text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-60">Weekly Revenue (LRD)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[52px] font-bold text-on-surface tabular-nums" style={{ fontFamily: '"Inter", sans-serif' }}>235,600</span>
                      <span className="text-xl font-bold text-on-surface/40">.00</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="font-cinzel text-[10px] text-on-surface-variant/60 uppercase font-bold">Today</span>
                    <span className="font-bold text-primary text-base">$185.20</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-cinzel text-[10px] text-on-surface-variant/60 uppercase font-bold">Sessions</span>
                    <span className="font-bold text-on-surface text-base">14 Total</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-cinzel text-[10px] text-on-surface-variant/60 uppercase font-bold">Avg Tip</span>
                    <span className="font-bold text-primary text-base">$22.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Revenue Growth Chart Widget */}
            <RevenueGrowthChart />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Performance Tier Card */}
              <div className="glass-panel rounded-xl p-8 bg-gradient-to-br from-surface to-primary/5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-8">
                  <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <span className="font-cinzel text-[11px] text-primary uppercase tracking-widest font-bold">98.2% Rating</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bodoni font-bold">Gold Status</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">You are in the top 5% of Liberia chauffeurs. Exclusive airport lounge access unlocked.</p>
                  <div className="mt-8 space-y-4">
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[80%] shadow-[0_0_15px_rgba(255,193,116,0.3)]"></div>
                    </div>
                    <div className="flex justify-between font-cinzel text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                      <span>Gold Tier</span>
                      <span className="text-primary">Diamond Progress</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Widget / Traffic */}
              <div className="rounded-2xl overflow-hidden relative border border-white/10 group shadow-2xl h-[480px] sm:h-[540px] md:h-[580px] w-full">
                <InteractiveMap 
                  lat={driverProfile?.lat || 6.3156} 
                  lng={driverProfile?.lng || -10.8074} 
                  destinationLat={
                    activeTripState && activeTripState.status === 'ready'
                      ? (activeTripState.pickupLat || 6.3156)
                      : (activeTripState && activeTripState.status === 'transit'
                          ? (activeTripState.destinationLat || 6.3006)
                          : (driverProfile?.destinationLat || 6.3006))
                  }
                  destinationLng={
                    activeTripState && activeTripState.status === 'ready'
                      ? (activeTripState.pickupLng || -10.8074)
                      : (activeTripState && activeTripState.status === 'transit'
                          ? (activeTripState.destinationLng || -10.8124)
                          : (driverProfile?.destinationLng || -10.8124))
                  }
                  popupText={`${driverProfile.name || 'Chauffeur Command'} - Monrovia Operations`}
                  markerImage={getVehicleDetails(driverProfile).image}
                  vehicleType="car"
                  hasActiveTrip={activeTripState?.isActive || activeTripState?.status === 'transit'}
                  tripStatus={activeTripState?.status}
                  tripAccepted={activeTripState?.accepted}
                  height="100%"
                  driverId={driverProfile?.id}
                  onCoordsChange={async (newLat, newLng) => {
                    await updateProfile({ lat: newLat, lng: newLng });
                  }}
                />
              </div>
            </div>

            {/* Next Dispatch Queue Section */}
            <div className="glass-panel rounded-xl p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary text-3xl">near_me</span>
                  <h2 className="text-3xl font-bodoni font-bold">Next Dispatch Queue</h2>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Queue Item 1 */}
                <div 
                  className="bg-surface-container rounded-xl p-6 border border-white/5 space-y-6 hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-cinzel text-[10px] text-primary uppercase px-3 py-1 bg-primary/10 rounded-sm font-bold tracking-widest">In 15 Mins</span>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">more_vert</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden border border-primary/20 p-1 font-sans">
                      <img alt="Client" className="h-full w-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdV73pMS1FsIfJtfET6lWraFjH7TXKLx37qXII37tkIUzuirrtrqKgWs9wbf0YItg_RCbpYZudXMpbTEm9dfPimTFV2EYEWQcfLRMhVlsU2BijieUpNCo5JZ0f1g4AV2-v7_aGkfrThuUJOGvYQ7C-pTmWBIZqcJkauaNql4jbYrrzY2-FAZ2qntM3HkqsMdNLx6GM7U_TILbuKvnN_4fEw_sS_mfZS3vW112e_QUQcOAOqqmvhlrBOyvzpJJFp5L5ymLt-FpIfRM" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-on-surface">{activeTripState.clientName}</h4>
                      <p className="text-on-surface-variant text-sm opacity-60">Executive Tier Client</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-3 items-center">
                      <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                      <span className="text-sm font-light text-on-surface-variant">{activeTripState.pickup}</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="material-symbols-outlined text-primary text-xl">flag</span>
                      <span className="text-sm font-light text-on-surface-variant">{activeTripState.destination}</span>
                    </div>
                  </div>
                </div>
                
                {/* Available Slot */}
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="h-14 w-14 rounded-full bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary/40 text-3xl">add_circle</span>
                  </div>
                  <div>
                    <p className="font-cinzel text-on-surface uppercase tracking-widest text-sm font-bold">Available Slot</p>
                    <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mt-1 font-bold opacity-60">Open for Dispatch</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Fare Matrix Section */}
            <div className="space-y-4">
              <FareMatrixTable />
            </div>
          </div>
        )}

        {activeTab === 'vessel' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile pic edit card */}
              <div className="glass-panel rounded-xl p-8 border border-white/5 space-y-6 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block mb-4 font-bold">Chauffeur Information</span>
                  
                  <div className="flex flex-col items-center gap-4 text-center mt-4">
                    <div className="relative group cursor-pointer w-24 h-24 rounded-full border-2 border-primary/40 overflow-hidden flex items-center justify-center bg-surface-container-high">
                      {driverProfile.avatar ? (
                        <img src={driverProfile.avatar} alt={driverProfile.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-primary">
                          <span className="text-2xl font-bodoni font-bold">{(driverProfile.name || 'D').charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-primary uppercase transition-opacity">
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        <span>Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleProfilePicChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bodoni font-bold text-on-surface">{driverProfile.name}</h3>
                      <p className="text-xs text-on-surface-variant opacity-60">Professional Rank: Elite Gold</p>
                      <p className="text-xs text-primary font-bold font-mono tracking-wider flex items-center justify-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-xs text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span>Rating: {driverProfile.rating || '4.98'} ★</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <div className="space-y-1">
                      <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Direct Hotline Phone</label>
                      <input 
                        type="text" 
                        value={driverProfile.phone} 
                        onChange={(e) => updateProfile({ phone: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary font-body-md text-on-surface text-sm" 
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed opacity-55 uppercase tracking-wide">Enter phone number with your local Liberia country code to let client riders text or call you directly during active bookings.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-primary/80 font-medium text-center">Click camera icon on your photo above to upload your chauffeur picture.</p>
                </div>
              </div>

              {/* Vessels registry management and custom uploads */}
              <div className="glass-panel rounded-xl p-8 border border-white/5 space-y-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <div>
                      <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block font-bold">Vessel Registry</span>
                      <h3 className="text-2xl font-bodoni font-bold text-on-surface">My Assigned Vehicles</h3>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded inline-block self-start font-sans">Active: {driverProfile.vehicle} ({driverProfile.plate})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {(driverProfile.vehiclesList || [
                      { id: 'car-1', name: 'Mercedes S-Class (Black)', plate: '44-OB-21', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80', active: true }
                    ]).map((car: any) => (
                      <div 
                        key={car.id}
                        className={`p-4 rounded-xl border flex flex-col gap-3 group relative overflow-hidden transition-all duration-300 ${car.active ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(255,193,116,0.1)]' : 'bg-black/30 border-white/5 hover:border-white/10'}`}
                      >
                        <div className="h-28 rounded-lg overflow-hidden relative">
                          <img src={car.image || 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80'} alt={car.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{car.name}</h4>
                            <p className="text-xs text-primary font-mono">{car.plate}</p>
                          </div>
                          
                          {!car.active ? (
                            <button 
                              onClick={() => deployCar(car.id)}
                              className="px-3 py-1.5 rounded bg-white/5 hover:bg-primary hover:text-on-primary text-[10px] uppercase font-bold tracking-widest transition-colors border border-white/10"
                            >
                              Deploy
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-primary font-sans font-extrabold">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Deployed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Vehicle Form */}
                <form onSubmit={handleAddCarSubmit} className="pt-6 border-t border-white/5 space-y-4">
                  <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block font-bold">Register & Upload New Vessel</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Vehicle Brand & Model</label>
                      <input 
                        type="text" 
                        required
                        value={newCarName}
                        onChange={(e) => setNewCarName(e.target.value)}
                        placeholder="e.g. Mercedes AMG G63" 
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm text-white" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">License Plate Number</label>
                      <input 
                        type="text" 
                        required
                        value={newCarPlate}
                        onChange={(e) => setNewCarPlate(e.target.value)}
                        placeholder="e.g. OBS-882" 
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm font-mono text-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Upload Vessel Image File</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleCarImageFileChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface-variant focus:outline-none focus:border-primary" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Or Select Luxury Preset</label>
                      <div className="flex gap-2">
                        {[
                          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=85',
                          'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=85',
                          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=85',
                          'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=400&q=85'
                        ].map((url, idx) => (
                          <button 
                            type="button"
                            key={idx} 
                            onClick={() => setNewCarImage(url)}
                            className={`w-12 h-10 rounded border overflow-hidden transition-all ${newCarImage === url ? 'border-primary ring-1 ring-primary' : 'border-white/10 hover:border-white/30'}`}
                          >
                            <img src={url} alt="Preset vehicle" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#e9c349] text-[#0c0f0f] py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all mt-2"
                  >
                    Register & Deploy Custom Vessel
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'momo' && (
          <div className="glass-panel rounded-xl border border-white/5 p-6 md:p-8 animate-in fade-in duration-300 shadow-2xl bg-black/40">
            <MomoPaymentHub driverProfile={driverProfile} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="glass-panel rounded-xl border border-white/5 flex flex-col md:flex-row h-[600px] overflow-hidden animate-in fade-in duration-300 shadow-2xl">
            {/* Left column - Active conversations with passengers */}
            <div className="w-full md:w-80 border-r border-white/5 flex flex-col bg-black/20 shrink-0">
              <div className="p-4 border-b border-white/5">
                <span className="font-cinzel text-[10px] text-primary uppercase font-bold tracking-widest block">Dispatch inbox</span>
              </div>
              <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
                <button 
                  className="w-full text-left p-4 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-3 border-l-2 border-l-primary"
                >
                  <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 overflow-hidden shrink-0">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk" alt="Julian" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{activeTripState.clientName}</h5>
                    <p className="text-[10px] text-primary uppercase tracking-[0.1em] font-medium font-sans">Active Booking Transit</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right column - conversation chat area */}
            <div className="flex-grow flex flex-col justify-between bg-black/40 h-full relative">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0e0e0e]/95 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 overflow-hidden">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk" alt="Julian" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{activeTripState.clientName}</h5>
                    <p className="text-[10px] text-green-400 capitalize flex items-center gap-1 font-sans font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Client Online
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-grow p-6 overflow-y-auto space-y-4">
                {(driverProfile.messages || []).map((msg: any) => {
                  const isMe = msg.sender === 'driver';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[9px] text-[#8e8e8e] font-bold uppercase tracking-wider mb-1 opacity-70">
                        <span>{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={`p-4 rounded-xl max-w-md text-sm leading-relaxed ${isMe ? 'bg-primary text-on-primary rounded-tr-none text-right font-medium' : 'bg-white/5 text-on-surface border border-white/5 rounded-tl-none font-light'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatReply.trim()) return;
                  handleSendChatReply(chatReply);
                }}
                className="p-4 border-t border-white/5 bg-[#0e0e0e]/95 flex items-center gap-3"
              >
                <input 
                  type="text" 
                  value={chatReply}
                  onChange={(e) => setChatReply(e.target.value)}
                  placeholder="Type responsive reply to passenger..." 
                  className="flex-grow bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm text-white" 
                />
                <button 
                  type="submit"
                  className="bg-primary text-on-primary h-11 px-6 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const LogisticsPortal = ({ onExit, onLogout, setIsLoggedIn }: any) => {
  const [view, setView] = useState<'auth' | 'dashboard' | 'transit'>('auth');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (view === 'transit') {
    return (
      <TransitTimer 
        onExit={() => setView('dashboard')} 
        vehicleType="delivery" 
        driverName="Emmanuel S." 
        license="LOG-991"
        destination="Sinkor, Monrovia"
      />
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#131313] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-primary/5 rounded-full -top-1/4 -right-1/4 blur-[120px]"></div>
          <div className="absolute w-[600px] h-[600px] bg-primary/10 rounded-full -bottom-1/4 -left-1/4 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 glass-panel rounded-2xl p-8 border border-primary/20 shadow-2xl">
          <div className="flex flex-col items-center mb-8 text-center">
            <span className="font-cinzel text-primary tracking-[0.3em] font-bold text-sm mb-2 uppercase">Obsidian Logistics</span>
            <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent mb-6"></div>
            <h2 className="text-3xl font-bodoni font-bold text-on-surface mb-2">{authType === 'login' ? 'Partner Login' : 'Open Fleet Account'}</h2>
            <p className="text-on-surface-variant text-body-md opacity-70">
              {authType === 'login' ? 'Manage your corporate outgoing shipments' : 'Become a trusted logistics partner'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (setIsLoggedIn) setIsLoggedIn(true); setView('dashboard'); }}>
            {authType === 'signup' && (
              <div className="space-y-2">
                <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Entity Name</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">business</span>
                  <input required className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-all font-body-md text-on-surface" placeholder="Company or Individual Name" type="text" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Partner ID / Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">mail</span>
                <input required className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-all font-body-md text-on-surface" placeholder="your@email.com" type="email" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Security Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
                <input required className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-all font-body-md text-on-surface" placeholder="••••••••" type="password" />
              </div>
            </div>

            <button type="submit" className="w-full bg-primary text-on-primary font-bold py-5 rounded-lg uppercase tracking-[0.2em] shadow-[0_8px_24px_rgba(245,158,11,0.2)] hover:brightness-110 active:scale-95 transition-all mt-4">
              {authType === 'login' ? 'Enter Portal' : 'Establish Partnership'}
            </button>
          </form>

          <p className="mt-8 text-center text-on-surface-variant text-sm">
            {authType === 'login' ? "New to logistics?" : "Already a partner?"}
            <button 
              onClick={() => setAuthType(authType === 'login' ? 'signup' : 'login')}
              className="text-primary font-bold ml-2 hover:underline"
            >
              {authType === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>

          <button onClick={onExit} className="w-full mt-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity">Exit to Main Landing Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131313] text-[#e2e2e2] font-body-md overflow-x-hidden pb-32 selection:bg-primary/30">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl border-b border-white/5 shadow-sm">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDrawerOpen(true)}>
              <span className="material-symbols-outlined text-primary">menu</span>
            </button>
            <h1 className="font-headline-md text-xl md:text-2xl text-primary tracking-[0.1em] font-bold">OBSIDIAN LOGISTICS</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container-high px-4 py-2 rounded-full border border-white/5">
              <span className="font-label-sm text-primary font-bold">$1,240.00</span>
              <button 
                onClick={() => setView('transit')}
                className="ml-3 pl-3 border-l border-white/10 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">schedule</span>
              </button>
            </div>
            <button 
              type="button"
              onClick={() => { setView('auth'); if (onLogout) onLogout(); else onExit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 duration-200 font-sans text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs leading-none">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer */}
      <aside className={`fixed left-0 inset-y-0 w-80 z-[60] bg-[#0e0e0e]/95 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-500 ease-in-out overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col min-h-full py-8">
          <div className="px-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <img className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhfCBXHEYIY4rW-xkruMALqMjK1y3UJ4lO3my9Pejy0t7XH2K5OgqeWHz2_u74bL9XJq95a7RNUtROgs_xD-Nf8yP2vJ4MpBbo_oRbNL9fqims0jJxfYGd1m4QY5aRLl2-Z5_bE5IQPdJpfADaFv4gAMDzu6T2AkvQyruBfqVbLn-fNg0FODDe7qe3_iWNyy-o9IdqNM3WPej6XL6hbQ6gMJPZVqm19H93yTflWnQ1kFsqMSMduVaDTytS6pB1wvfUf9sOZSq46DM" />
              <div>
                <h4 className="font-headline-md text-lg text-on-surface">Alexander Thorne</h4>
                <p className="text-primary text-sm font-bold">Black Tier Partner</p>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest">Partner ID: #880921</p>
          </div>
          <nav className="flex-1 divide-y divide-white/5">
            <div className="py-2">
              {[
                { icon: 'settings', label: 'Dashboard Config' },
                { icon: 'credit_card', label: 'Payment Accounts' },
                { icon: 'shield', label: 'Vetting & Security' },
                { icon: 'support_agent', label: 'Concierge Partner Support' }
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center px-8 py-4 text-on-surface-variant hover:bg-white/5 transition-all text-sm uppercase tracking-widest font-bold">
                  <span className="material-symbols-outlined mr-4 text-primary">{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <button 
                onClick={() => { setIsDrawerOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }}
                className="w-full flex items-center px-8 py-4 text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm uppercase tracking-widest font-bold mt-4"
              >
                <span className="material-symbols-outlined mr-4 text-red-500">logout</span>
                Logout Account
              </button>
            </div>
          </nav>
          <div className="px-8 mt-auto flex flex-col gap-2 pt-6">
            <button onClick={() => { setIsDrawerOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }} className="w-full flex items-center py-4 text-red-400 hover:text-red-300 transition-colors uppercase tracking-[0.2em] font-bold text-xs ring-1 ring-red-400/20 rounded px-4 justify-center">
              <span className="material-symbols-outlined mr-2">logout</span>
              Exit/Logout Portal
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isDrawerOpen && <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm animate-in fade-in duration-300"></div>}

      <main className="mt-20 px-6 max-w-7xl mx-auto space-y-8">
        {/* Active Delivery Card */}
        <section>
          <h2 className="font-headline-md text-2xl text-on-surface mb-6 uppercase tracking-widest">Active Outgoing Shipments</h2>
          <div 
            onClick={() => setView('transit')}
            className="glass-panel rounded-xl p-8 relative overflow-hidden group cursor-pointer hover:border-primary/20 transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] text-on-surface-variant opacity-60 mb-2 uppercase tracking-widest font-bold">Tracking: #LX-8809</p>
                <h3 className="font-headline-md text-3xl text-primary uppercase font-bold">Executive Package</h3>
              </div>
              <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] text-primary uppercase font-extrabold tracking-widest">Out for Delivery</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <div>
                  <p className="text-[10px] text-on-surface-variant opacity-60 uppercase font-bold tracking-widest">Destination</p>
                  <p className="text-lg font-medium">Sinkor, Monrovia</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <div>
                  <p className="text-[10px] text-on-surface-variant opacity-60 uppercase font-bold tracking-widest">Est. Arrival</p>
                  <p className="text-lg font-medium">14:20 (12 mins remaining)</p>
                </div>
              </div>
            </div>
            <button className="w-full bg-gradient-to-b from-[#ffc174] to-[#f59e0b] text-[#2a1700] font-bold py-5 rounded-lg shadow-[0_8px_24px_rgba(245,158,11,0.2)] hover:opacity-90 transition-all flex justify-center items-center gap-3 uppercase tracking-[0.2em] text-sm">
              <span className="material-symbols-outlined font-bold">send</span>
              Dispatch New Courier
            </button>
          </div>
        </section>

        {/* Logistics Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Active Deliveries', val: '3', color: 'text-on-surface' },
            { label: 'Secured Deliveries', val: '1,248', color: 'text-primary' },
            { label: 'Client Satisfaction', val: '4.9', color: 'text-on-surface', stars: true }
          ].map((stat, idx) => (
            <div key={idx} className="glass-panel p-8 rounded-xl flex flex-col items-center text-center hover:border-primary/20 transition-all cursor-default">
              <p className="text-[10px] text-on-surface-variant mb-4 uppercase tracking-widest font-extrabold opacity-60">{stat.label}</p>
              <p className={`text-5xl font-bodoni font-bold ${stat.color}`}>{stat.val}</p>
              {stat.stars && (
                <div className="flex text-primary gap-1 mt-4">
                  {[1, 2, 3, 4].map(s => <span key={s} className="material-symbols-aligned text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Bento Grid: Route & Queue */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Route Overview */}
          <div className="space-y-4">
            <h2 className="font-headline-md text-xl text-on-surface uppercase tracking-widest font-bold">Route Intelligence</h2>
            <div className="glass-panel rounded-xl h-80 relative overflow-hidden group border-white/5">
              <InteractiveMap 
                lat={6.3156} 
                lng={-10.8074} 
                destinationLat={6.3006}
                destinationLng={-10.8124}
                popupText="Active Courier Dispatch - Downtown Monrovia"
                markerImage={FLEET.find(f => f.id === 'delivery')?.image || 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png'}
                height="100%"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent pointer-events-none z-10"></div>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 400">
                <path d="M50,300 Q150,250 200,200 T350,100" fill="none" stroke="#ffc174" strokeDasharray="10,5" strokeWidth="3" className="animate-[dash_20s_linear_infinite]"></path>
                <circle cx="50" cy="300" r="6" fill="#f59e0b" className="animate-pulse shadow-lg"></circle>
                <circle cx="350" cy="100" r="6" fill="#f59e0b"></circle>
              </svg>
              
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20">
                <div className="bg-[#131313]/80 backdrop-blur-md p-4 rounded-lg border border-white/10">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1 opacity-60">CURRENT POSITION</p>
                  <p className="text-sm font-bold">Downtown Boulevard, Monrovia</p>
                </div>
                <button className="bg-surface p-3 rounded-full border border-white/10 text-primary hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
            </div>
          </div>

          {/* Next in Queue */}
          <div className="space-y-4">
            <h2 className="font-headline-md text-xl text-on-surface uppercase tracking-widest font-bold">Scheduled Pickups</h2>
            <div className="glass-panel rounded-xl divide-y divide-white/5 bg-surface-container-low/30 overflow-hidden">
              {[
                { icon: 'description', title: 'Corporate Documents', sub: 'Hub: Financial District' },
                { icon: 'redeem', title: 'Luxury Hamper', sub: 'Hub: Gourmet Cellars' },
                { icon: 'watch', title: 'Timepiece Service', sub: 'Hub: Horology House' }
              ].map((item, idx) => (
                <div key={idx} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all shadow-lg">
                      <span className="material-symbols-outlined text-primary text-3xl">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-on-surface uppercase tracking-tight">{item.title}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60 mt-1">{item.sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standard Fare Matrix Section */}
        <section className="space-y-4">
          <FareMatrixTable />
        </section>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl border-t border-white/5 rounded-t-xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)] max-w-7xl mx-auto left-0 right-0">
        <div className="flex justify-around items-center h-20 px-6">
          <button className="flex flex-col items-center justify-center text-primary group transition-all">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Shipments</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant opacity-60 hover:opacity-100 transition-all group">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">map</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Intelligence</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant opacity-60 hover:opacity-100 transition-all group">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">payments</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Accounts</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant opacity-60 hover:opacity-100 transition-all group">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">person</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Partner</span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dash {
          to { stroke-dashoffset: -200; }
        }
      `}} />
    </div>
  );
};


const RiderPortal = ({ 
  onExit, 
  drivers, 
  setDrivers, 
  activeTripState, 
  setActiveTripState, 
  chatMessages, 
  setChatMessages,
  activeChatDriverId,
  setActiveChatDriverId,
  initialVehicleId,
  onLogout,
  setIsLoggedIn,
  currentUser,
  setCurrentUser,
  language,
  setLanguage
}: any) => {
  const [view, setView] = useState<'auth' | 'dashboard'>('auth');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [riderType, setRiderType] = useState<'bike' | 'kekeh'>(() => {
    if (initialVehicleId === 'kekeh') return 'kekeh';
    return 'bike';
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'command' | 'unit' | 'chat' | 'momo'>('command');
  const [chatReply, setChatReply] = useState('');
  
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitPlate, setNewUnitPlate] = useState('');
  const [newUnitImage, setNewUnitImage] = useState('');

  // Form states and active rider ID hook
  const [currentRiderId, setCurrentRiderId] = useState<string>('');

  // Automatically bypass auth ONLY when currentUser is strictly authorized for this rider portal
  useEffect(() => {
    if (!currentUser) {
      setView('auth');
      return;
    }
    const classification = classifyAccount(currentUser);
    const isValid = (riderType === 'bike' && classification.isBikeRider) ||
                    (riderType === 'kekeh' && classification.isKekehOperator);
    if (isValid) {
      setCurrentRiderId(currentUser.id);
      setView('dashboard');
    } else {
      // Prevent cross-role or cross-vehicle type leakage
      setCurrentRiderId('');
      setView('auth');
    }
  }, [currentUser, riderType]);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const riderId = currentRiderId;
  const riderProfile = drivers?.find((d: any) => d.id === currentRiderId) || (
    PRODUCTION_DRIVERS.find(d => d.id === currentRiderId) || {
      id: currentRiderId || '',
      name: 'Rider',
      phone: '',
      plate: '',
      role: 'Rider',
      vehicleType: riderType === 'bike' ? 'bike' : 'kekeh',
      vehicle: riderType === 'bike' ? 'Luxury Bike Express' : 'Kekeh Executive',
      rating: '5.00',
      status: 'Available',
      accountStatus: 'active',
      earnings: 0,
      commissionPaid: 0,
      lat: 6.3100,
      lng: -10.8050,
      avatar: '',
      vehiclesList: []
    }
  );

  const updateProfile = async (updatedFields: any) => {
    const updatedRider = { ...riderProfile, ...updatedFields };
    // Synchronize target updates to Firestore
    await saveDriverToFirestore(updatedRider);
  };

  // Automatically clear notification when chat is opened
  useEffect(() => {
    if (activeTab === 'chat' && riderProfile.hasNotification) {
      updateProfile({ hasNotification: false });
    }
  }, [activeTab, riderProfile.hasNotification]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImage(reader.result as string, 200, 200, 0.6).then((compressed) => {
          updateProfile({ avatar: compressed });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUnitImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        compressImage(reader.result as string, 350, 200, 0.6).then((compressed) => {
          setNewUnitImage(compressed);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateVehicleImage = (vehicleId: string, imageSrc: string) => {
    const currentList = riderProfile.vehiclesList || [];
    const updatedList = currentList.map((v: any) => {
      if (v.id === vehicleId) {
        return { ...v, image: imageSrc };
      }
      return v;
    });
    
    const activeUnit = updatedList.find((v: any) => v.id === vehicleId);
    if (activeUnit && activeUnit.active) {
      updateProfile({
        vehicle: activeUnit.name,
        plate: activeUnit.plate,
        vehiclesList: updatedList
      });
    } else {
      updateProfile({
        vehiclesList: updatedList
      });
    }
  };

  const deployUnit = (unitId: string) => {
    const currentList = riderProfile.vehiclesList || [];
    const matchedUnit = currentList.find((c: any) => c.id === unitId);
    if (matchedUnit) {
      updateProfile({
        vehicle: matchedUnit.name,
        plate: matchedUnit.plate,
        vehiclesList: currentList.map((c: any) => ({
          ...c,
          active: c.id === unitId
        }))
      });
    }
  };

  const handleAddUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName || !newUnitPlate) return;
    
    const newUnitObj = {
      id: 'unit-' + Date.now(),
      name: newUnitName,
      plate: newUnitPlate,
      image: newUnitImage || (riderType === 'bike' ? 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png' : 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png'),
      active: true
    };

    const currentList = riderProfile.vehiclesList || [
      riderType === 'bike'
        ? { id: 'bike-1', name: 'Luxury Bike Express (Red)', plate: 'M4718', image: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png', active: false }
        : { id: 'kekeh-1', name: 'Kekeh Executive (Classic Yellow)', plate: 'A1A2715', image: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png', active: false }
    ];

    const updatedList = [
      ...currentList.map((c: any) => ({ ...c, active: false })),
      newUnitObj
    ];

    updateProfile({
      vehicle: newUnitObj.name,
      plate: newUnitObj.plate,
      vehiclesList: updatedList
    });

    setNewUnitName('');
    setNewUnitPlate('');
    setNewUnitImage('');
  };

  const handleSendChatReply = async (text: string) => {
    if (!text.trim()) return;
    const newMsg = {
      id: Date.now(),
      text: text,
      sender: 'driver',
      senderName: riderProfile.name,
      senderId: riderId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    await saveDriverToFirestore({
      ...riderProfile,
      messages: [...(riderProfile.messages || []), newMsg]
    });
    setChatReply('');
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden animate-in fade-in duration-500">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-primary/5 rounded-full -top-1/4 -right-1/4 blur-[120px]"></div>
          <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full -bottom-1/4 -left-1/4 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 glass-panel rounded-2xl p-8 border border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col items-center mb-8 text-center">
            <span className="font-cinzel text-primary tracking-[0.3em] font-bold text-sm mb-2 uppercase">Obsidian Portal</span>
            <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent mb-6"></div>
            <h2 className="text-3xl font-bodoni font-bold text-on-surface mb-2">{authType === 'login' ? 'Welcome Back' : 'Join the Fleet'}</h2>
            <p className="text-on-surface-variant text-body-md opacity-70">
              {authType === 'login' ? 'Sign in to your rider account' : 'Register as a professional rider in Monrovia'}
            </p>
          </div>

          <div className="flex gap-2 mb-8 p-1 bg-surface-container rounded-lg">
            <button 
              onClick={() => {
                setRiderType('bike');
              }}
              type="button"
              className={`flex-1 py-3 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${riderType === 'bike' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Bike Express
            </button>
            <button 
              onClick={() => {
                setRiderType('kekeh');
              }}
              type="button"
              className={`flex-1 py-3 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${riderType === 'kekeh' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Kekeh Exec
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-200 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="material-symbols-outlined text-red-500 mt-0.5 shrink-0 select-none">error_outline</span>
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-red-400 font-mono mb-1">Access Restricted</p>
                <p className="font-light leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={async (e) => { 
            e.preventDefault(); 
            setAuthError(null);
            
            // Basic Input Validation
            if (!phoneNumber || !phoneNumber.trim()) {
              setAuthError("Validation Error: Phone Number / Registry ID is required.");
              return;
            }
            if (!password || !password.trim()) {
              setAuthError("Validation Error: Access Key / PIN is required.");
              return;
            }

            try {
              const targetPortal = riderType === 'bike' ? 'rider_bike' : 'rider_kekeh';
              const authRes = await authenticateWithRoleGuard(
                phoneNumber.trim(),
                password.trim(),
                targetPortal,
                drivers
              );

              if (!authRes.success || !authRes.account) {
                setAuthError(authRes.error || "Access Denied: Unrecognized or unauthorized operator credentials.");
                return;
              }

              const authedRider = authRes.account;
              setCurrentRiderId(authedRider.id);
              if (setCurrentUser) setCurrentUser(authedRider);
              if (setIsLoggedIn) setIsLoggedIn(true);
              setView('dashboard');
            } catch (error: any) {
              console.error("Rider authentication error:", error);
              setAuthError(error?.message || "An unexpected error occurred during operator authentication.");
            }
          }}>
            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Phone Number / ID</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">phone</span>
                <input required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-surface-container-lowest/50 border border-white/15 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-body-md text-on-surface placeholder:text-surface-variant" placeholder="Registry ID / Phone" type="text" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Password</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-surface-container-lowest/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-body-md text-on-surface placeholder:text-surface-variant" placeholder="••••••••" type="password" />
              </div>
            </div>

            <button type="submit" className="w-full bg-primary text-on-primary font-bold py-5 rounded-lg uppercase tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all mt-4 cursor-pointer">
              Access Dashboard
            </button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              Admin-Managed Fleet
            </p>
            <p className="text-[11px] text-gray-400">
              Bike and Kekeh accounts are created exclusively by management through the Admin Portal.
            </p>
          </div>

          <button onClick={onExit} className="w-full mt-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity cursor-pointer">Exit to Main Landing Dashboard</button>
        </div>
      </div>
    );
  }

  const accountStatus = riderProfile.accountStatus || 'active';

  if (accountStatus === 'hold' || accountStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#0c0f0f] text-on-surface p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary select-none">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="w-full max-w-4xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-500 my-auto">
          <div className="glass-panel p-8 border border-red-500/30 rounded-2xl bg-black/60 relative overflow-hidden shadow-2xl space-y-6 text-center">
            <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-4 text-red-500 animate-pulse">
              <span className="material-symbols-outlined text-4xl leading-none">block</span>
            </div>
            
            {accountStatus === 'hold' ? (
              <div className="space-y-2">
                <span className="font-cinzel text-xs text-primary uppercase tracking-[0.25em] font-bold">Policy Compliance Hold</span>
                <h2 className="text-3xl font-bodoni font-bold text-on-surface">Account Temporarily Restricted</h2>
                <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto my-4"></div>
                <p className="text-sm font-light text-on-surface-variant max-w-2xl mx-auto leading-relaxed opacity-85">
                  Your premium partner account is placed on **Temporary Hold** by administration due to outstanding platform commissions. Under the 10% platform policy guidelines, you are required to submit the due commission sent via MTN Liberia MoMo to <strong className="text-primary font-mono bg-white/5 px-2 py-0.5 rounded">0887510845</strong>.
                </p>
                <p className="text-xs text-amber-500 font-semibold italic mt-2">
                  Once your transfer reference code is filed and validated by admin, your fleet credentials will be automatically restored.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="font-cinzel text-xs text-red-500 uppercase tracking-[0.25em] font-bold">Revocation Completed</span>
                <h2 className="text-3xl font-bodoni font-bold text-red-400">Partner Account Suspended</h2>
                <div className="h-px w-20 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto my-4"></div>
                <p className="text-sm font-light text-on-surface-variant max-w-2xl mx-auto leading-relaxed opacity-85 text-red-200">
                  We regret to inform you that your driver profile has been systematically taken down and suspended for flagrant violation of the 10% commissions and operating policies. All vehicle registries have been unlinked.
                </p>
                <p className="text-xs text-red-400 italic">
                  To appeal this decision, please present your valid MTN Liberia transfer credentials or contact support.
                </p>
              </div>
            )}
            
            <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest pt-2.5">
              <button 
                onClick={onExit}
                className="bg-white/5 border border-white/10 text-on-surface px-5 py-3 rounded-xl hover:bg-white/10 transition-all duration-300 pointer-events-auto"
              >
                Exit Platform
              </button>
            </div>
          </div>
          
          {accountStatus === 'hold' && (
            <div className="bg-black/40 border border-white/5 p-6 rounded-xl relative overflow-hidden glass-panel space-y-6">
              <h3 className="font-bodoni text-xl text-primary font-bold border-b border-white/5 pb-2">Instant Remediation Payment Hub</h3>
              <MomoPaymentHub driverProfile={riderProfile} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary selection:text-on-primary pb-16 animate-in fade-in duration-500">
      {/* Drawer Menu */}
      <aside className={`fixed left-0 inset-y-0 w-80 z-[60] bg-[#0e0e0e]/95 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-500 ease-in-out overflow-y-auto ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col min-h-full py-8">
          <div className="px-8 mb-8 flex justify-between items-center">
            <div>
              <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest font-bold">Rider Intelligence</span>
              <h4 className="font-headline-md text-xl text-on-surface">Partner {(riderProfile.name || 'Partner').split(' ')[0]}</h4>
              <p className="text-[11px] text-primary font-mono flex items-center gap-0.5 mt-0.5 font-bold">
                <span className="material-symbols-outlined text-[12px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span>{riderProfile.rating || '4.95'}</span>
              </p>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="material-symbols-outlined text-gray-400 hover:text-white">close</button>
          </div>
          
          <div className="h-px bg-white/10 mx-8 mb-6"></div>

          <nav className="flex-1 space-y-2 px-6">
            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('command'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'command' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">dashboard</span>
              Performance Hub
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('unit'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'unit' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">two_wheeler</span>
              My Fleet Unit
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('chat'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'chat' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary hover:bg-white/5'}`}
            >
              <div className="flex items-center">
                <span className="material-symbols-outlined mr-4 text-primary">chat</span>
                Passenger Chat
              </div>
              {riderProfile.hasNotification && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setActiveTab('momo'); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-sm uppercase tracking-widest font-bold ${activeTab === 'momo' ? 'text-primary bg-white/5' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <span className="material-symbols-outlined mr-4 text-primary">currency_exchange</span>
              MoMo 10% Policy
            </button>

            <button 
              onClick={() => { setIsMenuOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm uppercase tracking-widest font-bold mt-4"
            >
              <span className="material-symbols-outlined mr-4 text-red-400">logout</span>
              Logout Account
            </button>

            <div className="pt-4 px-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Dispatch Status</span>
                <button 
                  onClick={() => setIsOnline(!isOnline)} 
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors ${isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </button>
              </div>
            </div>
          </nav>

          <div className="px-8 mt-auto pt-6 divide-y divide-white/5">
            <button 
              onClick={() => { setIsMenuOpen(false); setView('auth'); if (onLogout) onLogout(); else onExit(); }}
              className="w-full flex items-center py-4 text-red-400 hover:text-red-300 transition-colors uppercase tracking-[0.2em] font-bold text-xs justify-center gap-2 border border-red-500/10 bg-red-500/5 rounded mt-4"
            >
              <span className="material-symbols-outlined">logout</span>
              Logout Account
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm animate-in fade-in duration-300"></div>}

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-4 md:px-12 h-20 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-4 cursor-pointer active:scale-95 transition-transform hover:opacity-80"
          >
            <span className="material-symbols-outlined text-primary">menu</span>
            <h1 className="font-cinzel text-xl md:text-2xl tracking-[0.2em] text-primary uppercase font-bold">OBSIDIAN</h1>
          </button>

          {/* Quick tab switchers */}
          <div className="hidden lg:flex items-center bg-black/40 border border-white/5 p-1 rounded-full ml-8">
            <button 
              onClick={() => setActiveTab('command')}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'command' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              Center
            </button>
            <button 
              onClick={() => setActiveTab('unit')}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'unit' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              My Fleet Unit
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'chat' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              Passenger Chat
            </button>
            <button 
              onClick={() => setActiveTab('momo')}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'momo' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-white'}`}
            >
              10% MoMo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-primary font-bold text-lg border border-primary/20 px-4 py-1 rounded-full bg-primary/5 flex items-center gap-3">
            $452.20
            <button 
              onClick={() => setActiveTab('chat')}
              className="pl-2 border-l border-white/10 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
            </button>
          </div>

          {/* Liberia English Badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full py-1.5 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Liberia • EN</span>
          </div>

          <button 
            type="button"
            onClick={() => { setView('auth'); if (onLogout) onLogout(); else onExit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 duration-200 font-sans text-[10px] font-bold uppercase tracking-widest cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs leading-none">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="pt-28 pb-32 px-4 md:px-12 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <p className="font-cinzel text-primary tracking-[0.2em] mb-2 text-xs font-bold uppercase">Welcome Back, Marcus</p>
          <h2 className="text-3xl md:text-5xl font-bodoni font-bold text-on-surface">Rider Performance Portal</h2>
          <div className="h-px w-24 bg-gradient-to-r from-primary to-transparent mt-4"></div>
        </section>

        {activeTab === 'command' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-8 space-y-8">
              {/* Status Section */}
              <div className="glass-panel rounded-xl p-8 shadow-2xl relative overflow-hidden group transition-all duration-700 animate-in fade-in zoom-in-95">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <label className="font-cinzel text-on-surface-variant text-[10px] mb-2 block uppercase tracking-widest" htmlFor="status-dispatch">Current Status</label>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'}`}></div>
                      <span className="text-2xl font-bold text-on-surface uppercase tracking-widest">
                        {isOnline ? 'Available for Dispatch' : 'Offline / Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <button 
                      onClick={() => setIsOnline(!isOnline)} 
                      className={`px-5 py-2.5 rounded-full font-bold text-[10px] tracking-widest uppercase transition-all duration-300 ${isOnline ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'}`}
                    >
                      Go {isOnline ? 'Offline' : 'Online'}
                    </button>
                    <div className="bg-surface-container-low px-6 py-4 rounded-xl border border-white/5">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mb-1">Weekly Target</p>
                      <p className="text-2xl font-bold text-primary">82%</p>
                    </div>
                    <div className="bg-surface-container-low px-6 py-4 rounded-xl border border-white/5">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mb-1">Base Monrovia</p>
                      <p className="text-2xl font-bold text-on-surface">Central</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Incoming Ride Request Alert Block */}
              {activeTripState.status === 'ready' && !activeTripState.accepted && (
                <div className="bg-[#e9c349]/10 border border-[#e9c349]/40 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-bounce shadow-[0_0_25px_rgba(233,195,73,0.15)] mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#e9c349]/20 border border-[#e9c349]/40 rounded-full flex items-center justify-center shrink-0 text-[#e9c349] animate-pulse">
                      <span className="material-symbols-outlined text-2xl">hail</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#e9c349] font-bold uppercase tracking-[0.2em] font-mono">[ INCOMING BOOKING REQUEST DISPATCHED ]</span>
                      <h3 className="text-xl font-bodoni font-bold text-white mt-1">New Voyage Request from {activeTripState.clientName}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        <strong>Pickup:</strong> {activeTripState.pickup} ➔ <strong>Destination:</strong> {activeTripState.destination}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const nextState = {
                        ...activeTripState,
                        accepted: true,
                        acceptedBy: riderProfile.id || '',
                        acceptedByName: riderProfile.name || 'Rider',
                        vehiclePlate: riderProfile.plate || '',
                        status: 'ready'
                      };
                      setActiveTripState(nextState);
                      await saveActiveTripToFirestore(nextState);
                    }}
                    className="bg-[#e9c349] text-[#0c0f0f] text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg font-sans shrink-0"
                  >
                    Approve & Lock Voyage
                  </button>
                </div>
              )}

              {/* Live Dispatch Notification */}
              {riderProfile.hasNotification && (
                <div id="rider-live-notification-banner" className="bg-primary/10 border border-primary/50 text-primary p-5 rounded-xl flex items-center justify-between gap-4 animate-bounce">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl animate-pulse">notifications_active</span>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Live dispatch update</p>
                      <p className="text-sm font-sans text-on-surface/90 font-medium mt-1">
                        A client texted you today!
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('chat')} 
                      className="bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      Open Chat
                    </button>
                    <button 
                      onClick={async () => {
                        await updateProfile({ hasNotification: false });
                      }} 
                      className="border border-white/20 text-on-surface hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Passenger Chat Alert banner */}
              {riderProfile.messages && riderProfile.messages.length > 0 && (
                <div onClick={() => setActiveTab('chat')} className="bg-primary/10 border border-primary/20 p-5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-2xl animate-bounce">chat_bubble</span>
                    <div>
                      <p className="font-bold text-sm text-on-surface">Conversation active with Passenger</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed opacity-80">Last message: "{riderProfile.messages[riderProfile.messages.length - 1].text}"</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary">chevron_right</span>
                </div>
              )}

              {/* Performance Stats */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-cinzel text-on-surface text-lg font-bold uppercase tracking-widest">Service Enclaves</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel p-6 rounded-xl flex flex-col gap-4 hover:bg-white/5 transition-all animate-in fade-in slide-in-from-bottom-4 delay-100 duration-500">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="material-symbols-outlined text-primary">timer</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-xl">42.5 hrs</h4>
                      <p className="text-on-surface-variant text-xs opacity-60 uppercase tracking-widest mt-1">Total Duty Time</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-xl flex flex-col gap-4 hover:bg-white/5 transition-all animate-in fade-in slide-in-from-bottom-4 delay-200 duration-500">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="material-symbols-outlined text-primary">distance</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-xl">188 km</h4>
                      <p className="text-on-surface-variant text-xs opacity-60 uppercase tracking-widest mt-1">Distance Covered</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-xl flex flex-col gap-4 hover:bg-white/5 transition-all animate-in fade-in slide-in-from-bottom-4 delay-300 duration-500">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="material-symbols-outlined text-primary">star</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-xl">{riderProfile.rating}</h4>
                      <p className="text-on-surface-variant text-xs opacity-60 uppercase tracking-widest mt-1">Client Rating</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Synchronized Chronometer / Dispatch Controller */}
              <section className="glass-panel rounded-xl p-8 border border-white/5 space-y-6">
                <div>
                  <span className="font-cinzel text-primary text-[10px] uppercase font-bold tracking-widest block mb-1">Transit Synchronization Control</span>
                  <p className="text-on-surface-variant text-sm font-light leading-relaxed">Direct telemetry feedback link. Manage the active journey time shown on the parent client's console.</p>
                </div>

                <div className="border border-white/5 rounded-xl p-6 bg-black/30 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] block">Synchronized Chronometer</span>
                    <span className="text-4xl md:text-5xl font-extrabold text-white font-mono tracking-wider tabular-nums">{formatTime(activeTripState?.elapsedTime || 0)}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {activeTripState.status === 'ready' && !activeTripState.accepted && (
                      <button 
                        onClick={async () => {
                          const nextState = {
                            ...activeTripState,
                            accepted: true,
                            acceptedBy: riderProfile.id || '',
                            acceptedByName: riderProfile.name || 'Rider',
                            vehiclePlate: riderProfile.plate || '',
                            status: 'ready'
                          };
                          setActiveTripState(nextState);
                          await saveActiveTripToFirestore(nextState);
                        }}
                        className="bg-[#e9c349] text-[#0c0f0f] font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 font-sans"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Approve Ride
                      </button>
                    )}

                    {activeTripState.status === 'ready' && activeTripState.accepted && (
                      <div className="flex flex-col gap-2 items-center">
                        <span className="text-[10px] text-green-400 font-extrabold uppercase font-sans animate-pulse">
                          ✓ Booking Accepted!
                        </span>
                        <button 
                          onClick={async () => {
                            const nextState = {
                              ...activeTripState,
                              status: 'transit',
                              isActive: true,
                              started: true,
                            };
                            setActiveTripState(nextState);
                            await saveActiveTripToFirestore(nextState);
                          }}
                          className="bg-primary hover:brightness-110 text-on-primary font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 font-sans"
                        >
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                          Start Active Journey
                        </button>
                      </div>
                    )}

                    {activeTripState.status === 'transit' && (
                      <button 
                        onClick={async () => {
                          const nextState = {
                            ...activeTripState,
                            status: 'completed',
                            isActive: false,
                          };
                          setActiveTripState(nextState);
                          await saveActiveTripToFirestore(nextState);
                        }}
                        className="bg-red-500 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-lg transition-all shadow-md active:scale-95 animate-pulse flex items-center gap-1.5 font-sans"
                      >
                        <span className="material-symbols-outlined text-sm">stop</span>
                        Conclude Ride (Complete)
                      </button>
                    )}

                    {activeTripState.status === 'completed' && (
                      <div className="flex flex-col gap-2 items-center">
                        <span className="text-green-400 text-xs uppercase font-extrabold flex items-center gap-1.5 font-sans">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Arrived & Finalized
                        </span>
                        <button 
                          onClick={async () => {
                            const nextState = {
                              status: 'ready',
                              isActive: false,
                              elapsedTime: 0,
                              clientName: 'Passenger',
                              pickup: 'Sinkor, Monrovia',
                              pickupLat: 6.3156,
                              pickupLng: -10.8074,
                              destination: 'Mamba Point Hotel',
                              destinationLat: 6.3006,
                              destinationLng: -10.8124,
                              vehicleId: 'taxi',
                              accepted: false,
                              acceptedBy: null,
                              acceptedByName: null,
                              started: false,
                            };
                            setActiveTripState(nextState);
                            await saveActiveTripToFirestore(nextState);
                          }}
                          className="bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded font-sans"
                        >
                          Reset for next Dispatch
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Column */}
            <aside className="lg:col-span-4 space-y-8">
              <div className="relative rounded-xl overflow-hidden amber-glow border border-primary/20 aspect-square flex flex-col group shadow-lg">
                <img alt="Elite Rider" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={riderProfile.avatar} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                <div className="relative mt-auto p-8 z-10">
                  <div className="inline-flex items-center gap-2 bg-primary px-3 py-1 rounded-full text-on-primary font-bold text-[10px] mb-4 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-xs">workspace_premium</span>
                    ELITE RIDER
                  </div>
                  <h3 className="text-2xl font-bodoni font-bold text-white mb-2">{riderProfile.name}</h3>
                  <p className="text-on-surface-variant text-sm mb-6 leading-relaxed opacity-80">Riders of the Diamond tier represent the peak of Monrovia transit excellence.</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                      <span className="text-on-surface-variant uppercase tracking-widest opacity-60">Success Rate</span>
                      <span className="text-primary font-bold">99.8%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                      <span className="text-on-surface-variant uppercase tracking-widest opacity-60">Hotline Number</span>
                      <span className="text-primary font-bold font-mono text-[10px]">{riderProfile.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Widget / Track */}
              <div className="rounded-xl overflow-hidden relative border border-white/5 group shadow-xl h-52">
                <InteractiveMap 
                  lat={riderProfile.lat || 6.3156} 
                  lng={riderProfile.lng || -10.8074} 
                  destinationLat={
                    activeTripState && activeTripState.status === 'ready'
                      ? (activeTripState.pickupLat || 6.3156)
                      : (activeTripState && activeTripState.status === 'transit'
                          ? (activeTripState.destinationLat || 6.3006)
                          : (riderProfile?.destinationLat || 6.3006))
                  }
                  destinationLng={
                    activeTripState && activeTripState.status === 'ready'
                      ? (activeTripState.pickupLng || -10.8074)
                      : (activeTripState && activeTripState.status === 'transit'
                          ? (activeTripState.destinationLng || -10.8124)
                          : (riderProfile?.destinationLng || -10.8124))
                  }
                  popupText={`${riderProfile.name || 'Rider Command'} - Live Route`}
                  markerImage={getVehicleDetails(riderProfile).image}
                  vehicleType={riderProfile?.vehicleType === 'kekeh' || riderProfile?.plate === 'A1A2715' || (riderProfile?.vehicle || '').toLowerCase().includes('kekeh') ? 'kekeh' : 'bike'}
                  hasActiveTrip={activeTripState?.isActive || activeTripState?.status === 'transit'}
                  tripStatus={activeTripState?.status}
                  tripAccepted={activeTripState?.accepted}
                  height="100%"
                  driverId={riderProfile?.id}
                  onCoordsChange={async (newLat, newLng) => {
                    await updateProfile({ lat: newLat, lng: newLng });
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent pointer-events-none z-10"></div>
                <div className="absolute bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-md p-2.5 rounded border border-white/10 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-cinzel">Traffic: Fluid</span>
                  </div>
                  <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-cinzel font-bold">Monrovia Route</span>
                </div>
              </div>

              {/* Active Booking Navigation Card */}
              <div 
                onClick={() => setActiveTab('chat')}
                className="glass-panel rounded-xl p-6 border-l-4 border-l-primary cursor-pointer group hover:bg-primary/5 transition-all"
              >
                <h4 className="font-cinzel text-primary text-[10px] mb-4 uppercase tracking-widest font-bold">Latest Client Dispatch</h4>
                <div className="flex gap-4 items-center mb-6">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-primary/40 p-1">
                    <img alt="Client" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk"/>
                  </div>
                  <div>
                    <p className="text-on-surface font-bold">{activeTripState.clientName}</p>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-widest opacity-70">Active Dispatch Ride</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                    <span className="text-on-surface-variant font-light truncate">{activeTripState.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">flag</span>
                    <span className="text-on-surface-variant font-light truncate">{activeTripState.destination}</span>
                  </div>
                </div>
              </div>
            </aside>
            </div>

            {/* Standard Fare Matrix Section */}
            <div className="space-y-4">
              <FareMatrixTable />
            </div>
          </div>
        )}

        {activeTab === 'unit' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile pic edit card */}
              <div className="glass-panel rounded-xl p-8 border border-white/5 space-y-6 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block mb-4 font-bold">Rider Information</span>
                  
                  <div className="flex flex-col items-center gap-4 text-center mt-4">
                    <div className="relative group cursor-pointer w-24 h-24 rounded-full border-2 border-primary/40 overflow-hidden flex items-center justify-center bg-surface-container-high">
                      {riderProfile.avatar ? (
                        <img src={riderProfile.avatar} alt={riderProfile.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-primary">
                          <span className="text-2xl font-bodoni font-bold">{(riderProfile.name || 'R').charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-primary uppercase transition-opacity">
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        <span>Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleProfilePicChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bodoni font-bold text-on-surface">{riderProfile.name}</h3>
                      <p className="text-xs text-on-surface-variant opacity-60">Elite Diamond Professional Guild</p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <div className="space-y-1">
                      <label className="font-cinzel text-[10px] text-primary uppercase tracking-widest block ml-1">Direct Hotline Phone</label>
                      <input 
                        type="text" 
                        value={riderProfile.phone} 
                        onChange={(e) => updateProfile({ phone: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary font-body-md text-on-surface text-sm" 
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed opacity-55 uppercase tracking-wide">Enter hotline phone number to ensure client contact capabilities.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-primary/80 font-medium text-center">Click camera icon on your photo above to upload your rider picture.</p>
                </div>
              </div>

              {/* Vessels registry management and custom uploads */}
              <div className="glass-panel rounded-xl p-8 border border-white/5 space-y-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <div>
                      <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block font-bold">Vessel Registry</span>
                      <h3 className="text-2xl font-bodoni font-bold text-on-surface">Assigned Rider Fleet Units</h3>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded inline-block self-start font-sans">Active: {riderProfile.vehicle} ({riderProfile.plate})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {(riderProfile.vehiclesList || [
                      { id: 'bike-1', name: 'Luxury Bike Express (Red)', plate: '77-BR-902', image: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png', active: true }
                    ]).map((car: any) => (
                      <div 
                        key={car.id}
                        className={`p-4 rounded-xl border flex flex-col gap-3 group relative overflow-hidden transition-all duration-300 ${car.active ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(255,193,116,0.1)]' : 'bg-black/30 border-white/5 hover:border-white/10'}`}
                      >
                        <div className="h-28 rounded-lg overflow-hidden relative group">
                          <img src={car.image || (car.name?.includes('Bike') ? 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png' : 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png')} alt={car.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-primary uppercase tracking-wider transition-opacity cursor-pointer">
                            <span className="material-symbols-outlined text-sm mb-1">photo_camera</span>
                            <span>Upload New Image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    compressImage(reader.result as string, 350, 200, 0.6).then((compressed) => {
                                      handleUpdateVehicleImage(car.id, compressed);
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{car.name}</h4>
                            <p className="text-xs text-primary font-mono">{car.plate}</p>
                          </div>
                          
                          {!car.active ? (
                            <button 
                              onClick={() => deployUnit(car.id)}
                              className="px-3 py-1.5 rounded bg-white/5 hover:bg-primary hover:text-on-primary text-[10px] uppercase font-bold tracking-widest transition-colors border border-white/10"
                            >
                              Deploy
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-primary font-sans font-extrabold">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Deployed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Vehicle Form */}
                <form onSubmit={handleAddUnitSubmit} className="pt-6 border-t border-white/5 space-y-4">
                  <span className="font-cinzel text-[10px] text-primary uppercase tracking-widest block font-bold">Register & Upload New Vessel</span>
                  
                  {newUnitImage && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between gap-4 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 rounded overflow-hidden bg-black border border-white/10 shrink-0">
                          <img src={newUnitImage} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">Vessel Image Prepped!</p>
                          <p className="text-[10px] text-on-surface-variant opacity-75">Ready to deploy into active Monrovia service.</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setNewUnitImage('')} 
                        className="text-red-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-red-500/10 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Vehicle Brand & Model</label>
                      <input 
                        type="text" 
                        required
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder="e.g. Yamaha R1 / Luxury Kekeh V" 
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm text-white" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">License Plate Number</label>
                      <input 
                        type="text" 
                        required
                        value={newUnitPlate}
                        onChange={(e) => setNewUnitPlate(e.target.value)}
                        placeholder="e.g. LRD-441" 
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm font-mono text-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Upload Vessel Image File</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleUnitImageFileChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface-variant focus:outline-none focus:border-primary file:bg-primary/20 file:border-0 file:text-primary file:text-[10px] file:uppercase file:px-3 file:py-1 file:rounded file:font-bold file:mr-2 cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold font-sans">Or Select Rider Preset</label>
                      <div className="flex gap-2">
                        {[
                          { name: 'Red Bike', url: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png' },
                          { name: 'Kekeh Classic', url: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png' },
                          { name: 'Sports Moto', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80' },
                          { name: 'Cruiser Custom', url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=400&q=80' }
                        ].map((item, idx) => (
                          <button 
                            type="button"
                            key={idx} 
                            onClick={() => setNewUnitImage(item.url)}
                            className={`w-12 h-10 rounded border overflow-hidden transition-all relative ${newUnitImage === item.url ? 'border-primary ring-1 ring-primary' : 'border-white/10 hover:border-white/30'}`}
                            title={item.name}
                          >
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#e9c349] text-[#0c0f0f] py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all mt-4"
                  >
                    Register & Journeyman Deploy
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'momo' && (
          <div className="glass-panel rounded-xl border border-white/5 p-6 md:p-8 animate-in fade-in duration-300 shadow-2xl bg-black/40">
            <MomoPaymentHub driverProfile={riderProfile} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="glass-panel rounded-xl border border-white/5 flex flex-col md:flex-row h-[600px] overflow-hidden animate-in fade-in duration-300 shadow-2xl">
            {/* Left column - Active conversations with passengers */}
            <div className="w-full md:w-80 border-r border-white/5 flex flex-col bg-black/20 shrink-0">
              <div className="p-4 border-b border-white/5">
                <span className="font-cinzel text-[10px] text-primary uppercase font-bold tracking-widest block">Dispatch Inbox</span>
              </div>
              <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
                <button 
                  className="w-full text-left p-4 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-3 border-l-2 border-l-primary"
                >
                  <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 overflow-hidden shrink-0">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk" alt="Julian" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{activeTripState.clientName}</h5>
                    <p className="text-[10px] text-primary uppercase tracking-[0.1em] font-medium font-sans">Active Booking Transit</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right column - conversation chat area */}
            <div className="flex-grow flex flex-col justify-between bg-black/40 h-full relative">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0e0e0e]/95 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 overflow-hidden">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk" alt="Julian" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{activeTripState.clientName}</h5>
                    <p className="text-[10px] text-green-400 capitalize flex items-center gap-1 font-sans font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Client Online
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-grow p-6 overflow-y-auto space-y-4">
                {(riderProfile.messages || []).map((msg: any) => {
                  const isMe = msg.sender === 'driver';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[9px] text-[#8e8e8e] font-bold uppercase tracking-wider mb-1 opacity-70">
                        <span>{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={`p-4 rounded-xl max-w-md text-sm leading-relaxed ${isMe ? 'bg-primary text-on-primary rounded-tr-none text-right font-medium' : 'bg-white/5 text-on-surface border border-white/5 rounded-tl-none font-light'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatReply.trim()) return;
                  handleSendChatReply(chatReply);
                }}
                className="p-4 border-t border-white/5 bg-[#0e0e0e]/95 flex items-center gap-3"
              >
                <input 
                  type="text" 
                  value={chatReply}
                  onChange={(e) => setChatReply(e.target.value)}
                  placeholder="Type responsive reply to passenger..." 
                  className="flex-grow bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-sm text-white" 
                />
                <button 
                  type="submit"
                  className="bg-primary text-on-primary h-11 px-6 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('obsidian_lang') || 'en');
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth' | 'client-portal' | 'profile' | 'chat' | 'trip' | 'rider' | 'chauffeur' | 'logistics' | 'admin-portal' | 'contact' | 'contact-us' | 'live-tracking'>(() => {
    if (typeof window !== 'undefined') {
      const hash = (window.location.hash || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();
      if (hash.includes('admin') || search.includes('admin')) {
        return 'admin-portal';
      }
      if (hash.includes('tracking') || hash.includes('radar')) {
        return 'live-tracking';
      }
      if (hash.includes('auth') || search.includes('auth')) {
        return 'auth';
      }
      if (hash.includes('contact') || search.includes('contact')) {
        return 'contact';
      }
      if (hash.includes('client') || search.includes('client')) {
        return 'client-portal';
      }
      if (hash.includes('rider') || search.includes('rider')) {
        return 'rider';
      }
      if (hash.includes('chauffeur') || search.includes('chauffeur')) {
        return 'chauffeur';
      }
    }
    return 'landing';
  });
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');
  const [authInitialTier, setAuthInitialTier] = useState<'Normal' | 'VIP'>('Normal');

  const navigateTo = (screen: 'landing' | 'auth' | 'client-portal' | 'profile' | 'chat' | 'trip' | 'rider' | 'chauffeur' | 'logistics' | 'admin-portal' | 'contact' | 'contact-us' | 'live-tracking', options?: { tab?: 'login' | 'signup', tier?: 'Normal' | 'VIP' }) => {
    if (options) {
      if (options.tab) setAuthInitialTab(options.tab);
      if (options.tier) setAuthInitialTier(options.tier);
    } else {
      setAuthInitialTab('login');
      setAuthInitialTier('Normal');
    }
    setCurrentScreen(screen);
    if (typeof window !== 'undefined') {
      try {
        if (screen === 'landing') {
          if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          window.location.hash = screen;
        }
      } catch (err) {
        // Safe navigation ignore
      }
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        const hash = (window.location.hash || '').toLowerCase();
        if (hash.includes('admin')) {
          setCurrentScreen('admin-portal');
        } else if (hash.includes('tracking') || hash.includes('radar')) {
          setCurrentScreen('live-tracking');
        } else if (hash.includes('landing') || hash.includes('home') || !hash || hash === '#') {
          setCurrentScreen('landing');
        } else if (hash.includes('auth')) {
          setCurrentScreen('auth');
        } else if (hash.includes('contact')) {
          setCurrentScreen('contact');
        } else if (hash.includes('client')) {
          setCurrentScreen('client-portal');
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('kekeh');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeChatDriverId, setActiveChatDriverId] = useState('');
  const [chatMessages, setChatMessages] = useState<any>({});

  const [drivers, setDrivers] = useState<any[]>([]);
  const driversRef = useRef(drivers);
  driversRef.current = drivers;
  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;

  // Initial one-time purge trigger to ensure all previous accounts are cleanly removed from browser cache
  useEffect(() => {
    const wipedKey = 'obsidian_accounts_clean_slate_v3';
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(wipedKey)) {
      purgeAllAccountsFromFirestore(true).then(() => {
        localStorage.setItem(wipedKey, 'true');
        setCurrentUser(null);
        setIsLoggedIn(false);
      });
    }
  }, []);

  // Establishes real-time real-life Firestore synchronization
  useEffect(() => {
    const unsubscribe = listenToLiveDrivers((liveDriversFromDb) => {
      const filteredDrivers = (liveDriversFromDb || [])
        .filter((d: any) => d.id !== 'active_trip')
        .filter((d: any) => {
          const id = (d.id || '').toLowerCase();
          const name = (d.name || '').toLowerCase();
          return !id.includes('voss') && !id.includes('thorne') && !id.includes('kesselly') &&
                 !name.includes('voss') && !name.includes('thorne') && !name.includes('kesselly');
        });

      setDrivers(filteredDrivers);
    });

    return () => unsubscribe();
  }, []);

  // Listen to active Firebase Auth State Changes and sync with Firestore profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        const userEmail = (firebaseUser.email || '').toLowerCase();
        const userPhonePart = userEmail.split('@')[0];
        const currentDrivers = driversRef.current || [];

        const profile = currentDrivers.find((d: any) => 
          d.id === firebaseUser.uid || 
          (d.email && d.email.toLowerCase() === userEmail) ||
          (d.phone && (
            d.phone.toLowerCase() === userEmail ||
            d.phone.replace(/\D/g, '') === userPhonePart.replace(/\D/g, '')
          ))
        );

        if (profile) {
          const isDriverRole = profile.role === 'Chauffeur' || profile.role === 'Rider' || profile.role?.toLowerCase() === 'chauffeur' || profile.role?.toLowerCase() === 'rider';
          const tier = profile.clientTier || (profile.rating?.toLowerCase().includes('vip') ? 'VIP' : 'Normal');
          const rating = profile.rating || (isDriverRole ? (profile.rating || '5.00') : (tier === 'VIP' ? 'VIP Premium Member' : 'Normal Client Member'));
          localStorage.setItem(`obsidian_tier_${firebaseUser.uid}`, tier);
          localStorage.setItem(`obsidian_rating_${firebaseUser.uid}`, rating);
          setCurrentUser((prev: any) => {
            if (prev && prev.id === profile.id && prev.rating === rating && prev.clientTier === tier) return prev;
            return { ...profile, clientTier: tier, rating };
          });
        } else {
          const savedTier = localStorage.getItem(`obsidian_tier_${firebaseUser.uid}`) || 'Normal';
          const savedRating = localStorage.getItem(`obsidian_rating_${firebaseUser.uid}`) || (savedTier === 'VIP' ? 'VIP Premium Member' : 'Premium Member');
          
          setCurrentUser((prev: any) => {
            if (prev && prev.id === firebaseUser.uid) {
              return prev;
            }
            return {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Member'),
              email: firebaseUser.email || '',
              role: (currentScreenRef.current === 'chauffeur' ? 'Chauffeur' : (currentScreenRef.current === 'rider' ? 'Rider' : 'Client')),
              rating: savedRating,
              clientTier: savedTier,
              avatar: ''
            };
          });
        }
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  const [activeTripState, setActiveTripState] = useState<any>({
    status: 'ready', // 'ready', 'transit', 'completed'
    isActive: false, 
    elapsedTime: 0,
    clientName: 'Passenger',
    pickup: 'Sinkor, Monrovia',
    pickupLat: 6.3156,
    pickupLng: -10.8074,
    destination: 'Mamba Point Hotel',
    destinationLat: 6.3006,
    destinationLng: -10.8124,
    vehicleId: 'taxi',
    accepted: false,
    acceptedBy: null,
    acceptedByName: null,
    started: false,
  });

  // Listen to Firestore active trip in real-time
  useEffect(() => {
    const unsub = listenToActiveTrip((tripFromDb) => {
      if (tripFromDb) {
        setActiveTripState(tripFromDb);
      } else {
        // Automatically initialize the shared state in Firestore if empty
        const defaultTrip = {
          status: 'ready',
          isActive: false, 
          elapsedTime: 0,
          clientName: 'Passenger',
          pickup: 'Sinkor, Monrovia',
          pickupLat: 6.3156,
          pickupLng: -10.8074,
          destination: 'Mamba Point Hotel',
          destinationLat: 6.3006,
          destinationLng: -10.8124,
          vehicleId: 'taxi',
          accepted: false,
          acceptedBy: null,
          acceptedByName: null,
          started: false,
        };
        saveActiveTripToFirestore(defaultTrip);
      }
    });
    return () => unsub();
  }, []);

  const activeTripStateRef = useRef(activeTripState);
  activeTripStateRef.current = activeTripState;

  // master-replica loop: Only the active driver (chauffeur/rider) increments timer and updates Firestore, readers sync automatically.
  useEffect(() => {
    let timer: any = null;
    const isDriverScreen = currentScreen === 'chauffeur' || currentScreen === 'rider';
    const isApproach = activeTripState.status === 'ready' && activeTripState.accepted === true;
    const isTransit = activeTripState.isActive && activeTripState.status === 'transit';
    
    if ((isApproach || isTransit) && isDriverScreen) {
      let tickCount = 0;
      timer = setInterval(() => {
        tickCount++;
        const currentTrip = activeTripStateRef.current;
        const nextTime = (currentTrip.elapsedTime || 0) + 1;
        const updatedTrip = {
          ...currentTrip,
          elapsedTime: nextTime
        };
        setActiveTripState(updatedTrip);

        // Throttle Firestore write to every 5 seconds to eliminate continuous network flooding
        if (tickCount % 5 === 0) {
          saveActiveTripToFirestore(updatedTrip);
        }

        // Smoothly interpolate position data for simulation fallback
        const defaultDriverId = currentScreen === 'chauffeur' ? (drivers[0]?.id || 'chauffeur_active') : (drivers[0]?.id || 'rider_active');
        const activeDriverDocId = currentTrip.acceptedBy || defaultDriverId;
        
        let startLat = 6.3156;
        let startLng = -10.8074;
        let endLat = 6.3006;
        let endLng = -10.8124;
        const totalDuration = 120; // Approach and transit are simulated over 2 minutes for realistic visual progression
        const f = Math.min(nextTime / totalDuration, 1.0);

        if (isApproach) {
          // Approach phase: start at driver's default master location, end at passenger pickup
          const defaultDriver = (driversRef.current || []).find((d: any) => d.id === activeDriverDocId) || PRODUCTION_DRIVERS.find(d => d.id === activeDriverDocId);
          startLat = defaultDriver ? defaultDriver.lat : 6.3156;
          startLng = defaultDriver ? defaultDriver.lng : -10.8074;
          endLat = currentTrip.pickupLat || 6.3156;
          endLng = currentTrip.pickupLng || -10.8074;
        } else {
          // Transit phase: start at client pickup, end at destination
          startLat = currentTrip.pickupLat || 6.3156;
          startLng = currentTrip.pickupLng || -10.8074;
          endLat = currentTrip.destinationLat || 6.3006;
          endLng = currentTrip.destinationLng || -10.8124;
        }

        const nextLat = startLat + (endLat - startLat) * f;
        const nextLng = startLng + (endLng - startLng) * f;

        const matchedDriver = (driversRef.current || []).find((d: any) => d.id === activeDriverDocId) || PRODUCTION_DRIVERS.find(d => d.id === activeDriverDocId);

        // Write live coordinated progression directly to driver storage throttled to every 5s ONLY if driver document exists
        if (tickCount % 5 === 0 && matchedDriver) {
          saveDriverToFirestore({
            ...matchedDriver,
            lat: nextLat,
            lng: nextLng,
            destinationLat: endLat,
            destinationLng: endLng
          }).catch(() => {});
        }

      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTripState.isActive, activeTripState.accepted, activeTripState.status, currentScreen]);

  // Real-life Geolocation tracker: Watches driver's physical device GPS coordinates in real-time
  useEffect(() => {
    const isDriverScreen = currentScreen === 'chauffeur' || currentScreen === 'rider';
    if (!isDriverScreen || !activeTripState.isActive) return;

    const defaultDriverId = currentScreen === 'chauffeur' ? (drivers[0]?.id || 'chauffeur_active') : (drivers[0]?.id || 'rider_active');
    const activeDriverId = activeTripState.acceptedBy || defaultDriverId;
    const matchedDriver = (drivers || []).find((d: any) => d.id === activeDriverId) || PRODUCTION_DRIVERS.find(d => d.id === activeDriverId);
    const existingDriver = matchedDriver || {
      id: activeDriverId,
      name: currentScreen === 'chauffeur' ? 'Chauffeur' : 'Rider',
      role: currentScreen === 'chauffeur' ? 'Chauffeur' : 'Rider'
    };

    let watchId: number | null = null;
    let lastGpsUploadTime = 0;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const rawLat = position.coords.latitude;
          const rawLng = position.coords.longitude;
          const now = Date.now();
          
          if (matchedDriver && rawLat !== 0 && rawLng !== 0 && (now - lastGpsUploadTime > 4000)) {
            lastGpsUploadTime = now;
            saveDriverToFirestore({
              ...matchedDriver,
              lat: rawLat,
              lng: rawLng,
              destinationLat: activeTripState.destinationLat || 6.3006,
              destinationLng: activeTripState.destinationLng || -10.8124
            }).catch(() => {});
          }
        },
        (error) => {
          console.warn('Real-world GPS streaming encountered error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 4000
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [currentScreen, activeTripState.isActive, activeTripState.acceptedBy, activeTripState.destinationLat, activeTripState.destinationLng]);


  const selectedVehicle = FLEET.find(f => f.id === selectedVehicleId) || FLEET[0];

  const getSelectedVehicleImage = () => {
    const actualDriversOnly = (drivers || []).filter((d: any) => d.role?.toLowerCase() !== 'client');
    const activeDriver = actualDriversOnly.find((d: any) => {
      if (selectedVehicleId === 'taxi') return d.vehicleType === 'taxi' || d.role === 'Chauffeur' || d.plate?.startsWith('T');
      if (selectedVehicleId === 'bike') return d.vehicleType === 'bike' || d.plate === 'M4718' || (d.vehicle || '').toLowerCase().includes('bike');
      if (selectedVehicleId === 'kekeh') return d.vehicleType === 'kekeh' || d.plate === 'A1A2715' || (d.vehicle || '').toLowerCase().includes('kekeh');
      return false;
    }) || actualDriversOnly.find((d: any) => d.role === 'Chauffeur') || actualDriversOnly[0];

    if (activeDriver) {
      const details = getVehicleDetails(activeDriver);
      if (details?.image) return details.image;
    }
    return selectedVehicle.image;
  };

  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Firebase SignOut failed:", err));
    setIsLoggedIn(false);
    setCurrentScreen('landing');
  };

  if (currentScreen === 'admin-portal') {
    return (
      <AdminCompliancePanel drivers={drivers} onExit={() => setCurrentScreen('landing')} onNavigate={navigateTo} />
    );
  }

  if (currentScreen === 'rider') {
    return (
      <RiderPortal 
        onExit={() => setCurrentScreen('landing')} 
        onLogout={handleLogout}
        setIsLoggedIn={setIsLoggedIn}
        drivers={drivers}
        setDrivers={setDrivers}
        activeTripState={activeTripState}
        setActiveTripState={setActiveTripState}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        activeChatDriverId={activeChatDriverId}
        setActiveChatDriverId={setActiveChatDriverId}
        initialVehicleId={selectedVehicleId}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  if (currentScreen === 'chauffeur') {
    return (
      <ChauffeurPortal 
        onExit={() => setCurrentScreen('landing')} 
        onLogout={handleLogout}
        setIsLoggedIn={setIsLoggedIn}
        drivers={drivers}
        setDrivers={setDrivers}
        activeTripState={activeTripState}
        setActiveTripState={setActiveTripState}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        activeChatDriverId={activeChatDriverId}
        setActiveChatDriverId={setActiveChatDriverId}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  if (currentScreen === 'logistics') {
    return <LogisticsPortal onExit={() => setCurrentScreen('landing')} onLogout={handleLogout} setIsLoggedIn={setIsLoggedIn} />;
  }

  if (currentScreen === 'profile') {
    return (
      <>
        <ClientProfile 
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onExit={() => setCurrentScreen('client-portal')} 
          onNavigate={navigateTo} 
          onLogout={handleLogout}
          language={language}
          setLanguage={setLanguage}
        />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  if (currentScreen === 'chat') {
    return (
      <>
        <ClientChat 
          currentUser={currentUser}
          activeChatDriverId={activeChatDriverId}
          setActiveChatDriverId={setActiveChatDriverId}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          onExit={() => setCurrentScreen('client-portal')} 
          onNavigate={navigateTo} 
          onLogout={handleLogout}
          drivers={drivers}
          language={language}
          setLanguage={setLanguage}
        />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  if (currentScreen === 'auth') {
    return (
      <>
        <AuthPage 
          drivers={drivers}
          initialTab={authInitialTab}
          initialTier={authInitialTier}
          onAuthSuccess={(userCredentials: any) => {
            setIsLoggedIn(true);
            setCurrentUser(userCredentials);
            const userRole = (userCredentials?.role || '').toLowerCase();
            if (userRole === 'chauffeur') {
              setCurrentScreen('chauffeur');
            } else if (userRole === 'rider') {
              setCurrentScreen('rider');
            } else if (userRole === 'admin') {
              setCurrentScreen('admin-portal');
            } else {
              setCurrentScreen('client-portal');
            }
          }} 
          onNavigate={navigateTo} 
        />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  if (currentScreen === 'contact' || currentScreen === 'contact-us') {
    return (
      <>
        <ContactUsPage 
          currentUser={currentUser}
          onExit={() => setCurrentScreen('landing')} 
          onNavigate={navigateTo} 
        />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  if (currentScreen === 'live-tracking') {
    return (
      <>
        <LiveVehicleTrackerHub onBack={() => setCurrentScreen('client-portal')} />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  if (currentScreen === 'client-portal') {
    return (
      <>
        <ClientPortal 
          currentUser={currentUser}
          activeChatDriverId={activeChatDriverId}
          setActiveChatDriverId={setActiveChatDriverId}
          onNavigate={navigateTo} 
          onLogout={handleLogout}
          drivers={drivers}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          activeTripState={activeTripState}
          setActiveTripState={setActiveTripState}
          language={language}
          setLanguage={setLanguage}
        />
        <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f0f] text-white flex flex-col overflow-x-hidden relative">
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
        <div className="absolute w-[1000px] h-[600px] bg-[radial-gradient(circle,rgba(16,185,129,0.1)_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[100px]"></div>
        <div className="absolute w-[800px] h-[400px] bg-[radial-gradient(circle,rgba(233,195,73,0.05)_0%,transparent_70%)] -bottom-[100px] -right-[100px] blur-[80px]"></div>
        <div className="absolute w-[120%] h-[300px] border-t border-[#e9c349]/10 rounded-[50%] -left-[10%] top-[40%] -rotate-[5deg]"></div>
        <div className="absolute w-[120%] h-[300px] border-t border-[#e9c349]/10 rounded-[50%] -left-[10%] top-[60%] rotate-[3deg]"></div>
      </div>

      <header className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span 
            onClick={() => setCurrentScreen('landing')}
            className="text-xl font-bold tracking-tight uppercase cursor-pointer" 
            style={{ fontFamily: 'Montserrat' }}
          >
            Liberia Ride<sup className="text-[10px]">®</sup>
          </span>
        </div>
        <nav className="hidden md:flex items-center space-x-10">
          <a className="text-sm font-medium text-gray-400 hover:text-white transition-colors" href="#">Features</a>
          <a className="text-sm font-medium text-gray-400 hover:text-white transition-colors" href="#">Safety</a>
          <button
            onClick={() => setCurrentScreen('contact')}
            className="text-sm font-medium text-[#e9c349] hover:text-white transition-colors flex items-center gap-1 font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">support_agent</span>
            <span>Contact Us</span>
          </button>
          <div className="relative group">
            <button className="text-sm font-bold text-primary hover:text-primary-fixed-dim transition-colors uppercase tracking-[0.2em] flex items-center gap-1">
              Join Fleet <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 py-2 bg-surface border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button 
                onClick={() => setCurrentScreen('rider')}
                className="w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-white/5 transition-colors"
              >
                Bike & Kekeh Rider
              </button>
              <button 
                onClick={() => setCurrentScreen('chauffeur')}
                className="w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-white/5 transition-colors"
              >
                Luxury Chauffeur
              </button>
              <button 
                onClick={() => setCurrentScreen('logistics')}
                className="w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-white/5 transition-colors"
              >
                Logistics Partner
              </button>
            </div>
          </div>
        </nav>
        <div className="flex items-center gap-4">
          {isLoggedIn && (
            <button 
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 duration-200 font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm leading-none">logout</span>
              <span>Logout</span>
            </button>
          )}
          <button 
            onClick={() => setCurrentScreen(isLoggedIn ? 'client-portal' : 'auth')}
            className="bg-[#e9c349] text-[#0c0f0f] px-6 py-2 rounded-full font-bold text-sm tracking-wide hover:opacity-90 transition-opacity">
            Dashboard
          </button>
        </div>
      </header>

      <div className="relative z-10 w-full h-full flex flex-col flex-1">
        {currentScreen === 'landing' ? (
          <LandingPage 
            selectedVehicleId={selectedVehicleId} 
            onSelectVehicle={setSelectedVehicleId} 
            onNavigate={(scr: any) => setCurrentScreen(scr)}
            onJoinPartner={(role: string) => setCurrentScreen(role as any)}
          />
        ) : (
          <div className="flex-1 flex w-full p-4 items-center justify-center pt-24 pb-20">
            <TripStatus 
              selectedVehicleId={selectedVehicleId}
              selectedVehicleImage={getSelectedVehicleImage()} 
              selectedVehicleName={selectedVehicle.name} 
              onEndRide={() => setCurrentScreen('client-portal')}
              onJoinPartner={(role: string) => setCurrentScreen(role as any)}
              activeTripState={activeTripState}
              setActiveTripState={setActiveTripState}
            />
          </div>
        )}
      </div>
      <AIAssistant onNavigate={navigateTo} isLoggedIn={isLoggedIn} currentUser={currentUser} />
    </div>
  );
}
