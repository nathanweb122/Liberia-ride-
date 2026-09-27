import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken, 
  syncToGoogleSheets 
} from '../lib/googleSheets';

interface GoogleSheetsSyncHubProps {
  currentUser: any;
  drivers: any[];
}

export const GoogleSheetsSyncHub = ({ currentUser, drivers }: GoogleSheetsSyncHubProps) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showVerificationGuide, setShowVerificationGuide] = useState(false);

  useEffect(() => {
    // Listen to Firebase auth state matching Google Sheets login
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setGoogleUser(user);
        setToken(cachedToken);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        setSyncLogs(prev => [...prev, `Successfully linked Google Account: ${result.user.email}`]);
      }
    } catch (err: any) {
      const errStr = (err?.code || "") + " " + (err?.message || "");
      if (errStr.includes('popup-closed-by-user')) {
        console.warn('Google connection popup was closed before completing the sign-in.');
        setErrorMsg('Connection cancelled. The Google authentication popup was closed before linking.');
      } else {
        console.error('Sign-in Error:', err);
        setErrorMsg(err.message || 'Authentication with Google failed.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setToken(null);
      setSpreadsheetUrl(null);
      setSyncLogs([]);
    } catch (err: any) {
      setErrorMsg('Failed to disconnect Google account.');
    }
  };

  const handleSyncData = async () => {
    if (!token) return;
    setIsSyncing(true);
    setSyncLogs([]);
    setErrorMsg(null);
    setSpreadsheetUrl(null);

    // Prepare client registry dataset
    const clientData = [
      ...(currentUser ? [{
        name: currentUser.name || 'Registered Client',
        email: currentUser.email || '',
        rating: currentUser.rating || 'Client Member',
        avatar: currentUser.avatar || ''
      }] : []),
      ...drivers
        .filter((d: any) => d.role === 'Client' && d.id !== currentUser?.id && d.email !== currentUser?.email)
        .map((d: any) => ({
          name: d.name,
          email: d.email || '',
          rating: d.rating || 'Premium Member',
          avatar: d.avatar || ''
        }))
    ];

    // Prepare driver (Chauffeur) dataset
    const chauffeurData = drivers
      .filter((d: any) => d.role === 'Chauffeur')
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        phone: d.phone || '+231 88 500 2931',
        rating: d.rating || '4.98',
        vehicle: d.vehicle || 'Mercedes S-Class',
        plate: d.plate || '44-OB-21',
        status: d.status || 'Available'
      }));

    // Prepare rider (Bikes & Kekehs) dataset
    const riderData = drivers
      .filter((d: any) => d.role === 'Rider')
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        phone: d.phone || '+231 77 900 4421',
        rating: d.rating || '4.95',
        vehicle: d.vehicle || 'Luxury Vessel',
        plate: d.plate || '77-BR-902',
        status: d.status || 'Available'
      }));

    try {
      const url = await syncToGoogleSheets(
        {
          clients: clientData,
          drivers: chauffeurData,
          riders: riderData
        },
        (msg) => {
          setSyncLogs(prev => [...prev, msg]);
        }
      );
      setSpreadsheetUrl(url);
    } catch (err: any) {
      console.error('Synchronization Error:', err);
      setErrorMsg(err?.message || 'Sync failed. Please ensure Sheets API access is valid and authorized.');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalClients = (currentUser ? 1 : 0) + drivers.filter((d: any) => d.role === 'Client' && d.id !== currentUser?.id).length;
  const totalChauffeurs = drivers.filter((d: any) => d.role === 'Chauffeur').length;
  const totalRiders = drivers.filter((d: any) => d.role === 'Rider').length;

  return (
    <div id="google-sheets-sync-hub" className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden bg-gradient-to-br from-black/40 to-[#0e0e0e]/95 shadow-2xl">
      {/* Visual top border styling */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-[#e9c349] to-amber-500"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5 mb-6">
        <div>
          <span className="text-[10px] text-emerald-400 font-sans font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Google Sheets Workspace Integration
          </span>
          <h4 className="font-bodoni text-2xl font-bold text-on-surface mt-1">Live Registry Sync</h4>
          <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">Secure cloud synchronization of your active fleet data</p>
        </div>

        {/* Sync target metadata counters */}
        <div className="flex gap-4 self-center md:self-auto">
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-center shrink-0">
            <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest">Clients</p>
            <p className="text-sm font-bold text-[#e9c349] font-mono">{totalClients}</p>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-center shrink-0">
            <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest">Drivers</p>
            <p className="text-sm font-bold text-primary font-mono">{totalChauffeurs}</p>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-center shrink-0">
            <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest">Riders</p>
            <p className="text-sm font-bold text-primary font-mono">{totalRiders}</p>
          </div>
        </div>
      </div>

      {!googleUser ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <span className="material-symbols-outlined text-2xl">grid_on</span>
          </div>
          <h5 className="font-bodoni text-lg text-on-surface mb-1">Spreadsheet Hub is Offline</h5>
          <p className="text-xs text-on-surface-variant opacity-60 max-w-sm mb-6">
            Link your Google Account to automatically provision and sync a multi-tab workspace containing active clients, drivers, and riders metadata.
          </p>
          
          <button 
            type="button"
            onClick={handleSignIn}
            className="gsi-material-button hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 transition-all w-full sm:w-auto"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-sans font-bold text-xs uppercase tracking-wider text-slate-800">Sign in with Google</span>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              .gsi-material-button {
                -moz-user-select: none;
                -webkit-user-select: none;
                -ms-user-select: none;
                -webkit-appearance: none;
                background-color: WHITE;
                background-image: none;
                border: 1px solid #dadce0;
                -webkit-border-radius: 4px;
                border-radius: 4px;
                -webkit-box-sizing: border-box;
                box-sizing: border-box;
                color: #3c4043;
                cursor: pointer;
                font-family: 'Roboto', arial, sans-serif;
                font-size: 14px;
                height: 40px;
                letter-spacing: 0.25px;
                outline: none;
                overflow: hidden;
                padding: 0 12px;
                position: relative;
                text-align: center;
                vertical-align: middle;
                white-space: nowrap;
                width: auto;
                max-width: 100%;
                min-width: 90px;
              }
              .gsi-material-button .gsi-material-button-icon {
                height: 18px;
                margin-right: 8px;
                min-width: 18px;
                width: 18px;
              }
              .gsi-material-button .gsi-material-button-content-wrapper {
                -webkit-align-items: center;
                align-items: center;
                display: -webkit-box;
                display: -webkit-flex;
                display: flex;
                -webkit-flex-direction: row;
                flex-direction: row;
                height: 100%;
                position: relative;
                width: 100%;
              }
              .gsi-material-button .gsi-material-button-contents {
                -webkit-flex-grow: 1;
                flex-grow: 1;
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                overflow: hidden;
                text-overflow: ellipsis;
                vertical-align: top;
                color: #202425;
              }
            `}} />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Authenticated user top bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30">
                <img 
                  src={googleUser.photoURL || undefined} 
                  alt="Google Account" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface">{googleUser.displayName}</p>
                <p className="text-[10px] text-emerald-400 font-mono font-medium">{googleUser.email}</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handleSignOut}
              className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Sync Trigger and Spreadsheet Url */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="font-cinzel text-[10px] text-primary uppercase font-bold tracking-wider block">Registry Synchronization Actions</span>
              <p className="text-xs text-on-surface-variant opacity-75 leading-relaxed">
                Updating statistics will build a complete Google Drive Sheet called <strong className="text-on-surface font-semibold">"Liberia Ride Registry - Sync"</strong> with separate tabs listing all live clients, chauffeurs, and active vehicle riders.
              </p>
              <button 
                type="button"
                onClick={handleSyncData}
                disabled={isSyncing}
                className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSyncing ? 'bg-primary/50 text-on-primary/60 cursor-not-allowed' : 'bg-primary text-[#0c0f0f] hover:brightness-110 shadow-[0_0_15px_rgba(255,191,116,0.1)] active:scale-95'}`}
              >
                {isSyncing ? (
                  <>
                    <span className="h-4 w-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Synchronizing Data...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span>Deploy to Google Sheets</span>
                  </>
                )}
              </button>
            </div>

            {/* Sync Console Ticker Logs */}
            <div className="flex flex-col bg-black/60 rounded-xl border border-white/5 p-4 min-h-[140px] max-h-[180px] overflow-hidden">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold border-b border-white/15 pb-2 mb-2 flex items-center justify-between">
                <span>Deployment Console Ticker</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              </span>
              <div className="flex-1 overflow-y-auto space-y-1 text-[10px] font-mono text-emerald-500/80 scrollbar-thin text-left">
                {syncLogs.length === 0 && (
                  <p className="text-white/20 italic">No logs active. Tap "Deploy to Google Sheets" to begin...</p>
                )}
                {syncLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed animate-in fade-in duration-300">
                    <span className="text-emerald-500/40 mr-1.5">&gt;</span>{log}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Success Link to Sheet */}
          {spreadsheetUrl && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-500 text-left">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-3xl shrink-0">check_circle</span>
                <div>
                  <p className="text-xs font-bold text-on-surface">Data Registry Upload Terminated Successfully!</p>
                  <p className="text-[10px] text-emerald-300/80">Sheet contains Clients, Drivers, & Riders categories.</p>
                </div>
              </div>
              
              <a 
                href={spreadsheetUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-[#0c0f0f] py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] shrink-0"
              >
                <span>View Google Sheet ↗</span>
              </a>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-3 text-left">
          <span className="material-symbols-outlined text-red-400 text-lg shrink-0">warning</span>
          <p className="flex-grow">{errorMsg}</p>
        </div>
      )}

      {/* Production Verification Guide - Only shown to the site owner/developer */}
      {currentUser?.email?.toLowerCase() === 'africahowe@gmail.com' && (
        <div className="mt-6 border-t border-white/5 pt-6 text-left">
          <button
            type="button"
            onClick={() => setShowVerificationGuide(!showVerificationGuide)}
            className="flex items-center justify-between w-full text-left focus:outline-none group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500/80 group-hover:text-amber-400 transition-colors select-none">verified_user</span>
              <div>
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                  Production Release Guide: Removing "Unverified App" Warning
                </span>
                <p className="text-[10px] text-on-surface-variant opacity-60 mt-0.5">
                  Essential configuration steps to support a large volume of active public clients
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-300 select-none group-hover:text-on-surface" style={{ transform: showVerificationGuide ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </button>

          {showVerificationGuide && (
            <div className="mt-4 p-5 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Google displays the <strong className="text-amber-400">"Google hasn't verified this app"</strong> screen because your OAuth Client ID is currently registered under a development/testing environment. Since this website is going to be used by a lot of consumers & clients, follow this checklist to permanently clear this screen and establish complete trust:
              </p>

              <div className="space-y-4 text-xs">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <div>
                    <h6 className="font-bold text-on-surface">Publish the App to Production</h6>
                    <p className="text-on-surface-variant opacity-75 leading-relaxed mt-0.5">
                      Navigate to your <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer" className="text-primary hover:underline italic font-medium">Google Cloud Console → OAuth Consent Screen ↗</a>. Under the <strong>"Publishing status"</strong> card, change the status from <strong>"Testing"</strong> to <strong>"In Production"</strong> by clicking the <strong>"Publish App"</strong> button. This unlocks general sign-ins.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <div>
                    <h6 className="font-bold text-on-surface">Publish your Privacy Policy & Terms</h6>
                    <p className="text-on-surface-variant opacity-75 leading-relaxed mt-0.5">
                      Fill out the consent screen configuration details. Ensure you provide URLs to your public <strong>Privacy Policy</strong> and <strong>Terms of Service</strong>. These must be hosted on your public web domain.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <div>
                    <h6 className="font-bold text-on-surface">Submit for Consent Verification</h6>
                    <p className="text-on-surface-variant opacity-75 leading-relaxed mt-0.5">
                      Because this application accesses Google Sheets & Drive to synchronize active registries, these are classified as <em>sensitive scopes</em>. Click the <strong>"Submit for Verification"</strong> button near the top. Google's Trust & Safety team will review and approve your application within 2-3 business days, removing the warning screen entirely.
                    </p>
                  </div>
                </div>

                {/* Tip */}
                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-300 leading-relaxed flex gap-2.5 items-start">
                  <span className="material-symbols-outlined text-emerald-400 shrink-0 select-none text-[16px] mt-0.5">info</span>
                  <span>
                    <strong>Immediate Access Checklist:</strong> While review is pending or for staging, any user can continue signing in by clicking <strong>"Advanced"</strong> and then <strong>"Go to unverified app (unsafe)"</strong>. This is normal and standard for self-managed private/production deployment systems.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
