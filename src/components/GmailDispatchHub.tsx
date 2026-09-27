import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken 
} from '../lib/googleSheets';
import { 
  sendGmailMessage, 
  listGmailMessages, 
  getGmailMessageDetails, 
  parseMessageHeaders 
} from '../lib/gmailService';

interface GmailDispatchHubProps {
  currentUser: any;
  drivers: any[];
}

export const GmailDispatchHub = ({ currentUser, drivers }: GmailDispatchHubProps) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Form fields
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  // Sent message history logs from active API
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Sync login state using the shared Google auth listener
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setGoogleUser(user);
        setToken(cachedToken);
        if (currentUser?.email) {
          setRecipient(currentUser.email);
        }
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Read message logs when authenticated
  useEffect(() => {
    if (token && googleUser) {
      fetchSentHistory();
    } else {
      setSentMessages([]);
    }
  }, [token, googleUser]);

  const fetchSentHistory = async () => {
    setLoadingHistory(true);
    try {
      // Query specifically for messages with "Liberia Ride" in subject or general messages
      const msgs = await listGmailMessages('subject:"Liberia Ride"', 5);
      const detailedMsgs = [];
      
      for (const m of msgs) {
        if (m.id) {
          try {
            const details = await getGmailMessageDetails(m.id);
            detailedMsgs.push(parseMessageHeaders(details));
          } catch (e) {
            console.warn('Could not load specific message detail:', m.id);
          }
        }
      }
      setSentMessages(detailedMsgs);
    } catch (err) {
      console.warn('Failed to load Gmail sent history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        if (currentUser?.email) {
          setRecipient(currentUser.email);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google account pairing failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setToken(null);
      setSuccessMsg(null);
      setErrorMsg(null);
      setSentMessages([]);
    } catch (err) {
      setErrorMsg('Google Account sign out failed.');
    }
  };

  // Pre-load templates
  const handleTemplateChange = (templateType: string) => {
    setSelectedTemplate(templateType);
    setErrorMsg(null);
    setSuccessMsg(null);

    const clientName = currentUser?.name || 'Valued Passenger';
    const clientTier = currentUser?.rating || 'Black Tier Member';

    if (templateType === 'custom') {
      setSubject('');
      setBodyText('');
      setBodyHtml('');
    } else if (templateType === 'receipt') {
      setSubject('Liberia Ride - Luxury Carriage Trip E-Receipt');
      
      const textContent = `
LIBERIA RIDE REGISTRY - EXCLUSIVE E-RECEIPT
Thank you for riding with Liberia Ride Elite Carriage services.

Client Name: ${clientName}
Membership: ${clientTier}
Vehicle Dispatch: Mercedes-Benz S-Class (Black Edition)
Service Class: Captain Chauffeur Custom Drive
Total Fare Amount: $250.00 USD
Payment Status: Fully Authorized & Settled (MTN MoMo)

Safe travel is our premier signature. Thank you for your partnership.
Registered Office: Snapper Hill, Ashmun St, Monrovia, Liberia.
      `.trim();

      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; background-color: #0c0f0f; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 500px; border: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="text-align: center; border-b: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px;">
            <h1 style="color: #e9c349; font-size: 24px; margin: 0; font-family: Georgia, serif; letter-spacing: 2px;">LIBERIA RIDE</h1>
            <p style="text-transform: uppercase; font-size: 9px; color: #a1a1aa; letter-spacing: 3px; font-weight: bold; margin: 5px 0 0 0;">Elite Carriage Service</p>
          </div>
          
          <div style="margin: 25px 0;">
            <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">Dear <strong>${clientName}</strong>,</p>
            <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">Your premium dispatch trip has officially terminated successfully. Please review your administrative digital ledger receipt below:</p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <tr>
                <td style="padding: 10px; color: #a1a1aa;">Membership Status</td>
                <td style="padding: 10px; text-align: right; color: #e9c349; font-weight: bold;">${clientTier}</td>
              </tr>
              <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: #a1a1aa;">Vehicle Dispatch</td>
                <td style="padding: 10px; text-align: right; color: #f1f5f9;">Mercedes-Benz S-Class</td>
              </tr>
              <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: #a1a1aa;">Authorized Fare</td>
                <td style="padding: 10px; text-align: right; color: #f1f5f9; font-family: monospace; font-weight: bold;">$250.00 USD</td>
              </tr>
              <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: #a1a1aa;">Transaction ID</td>
                <td style="padding: 10px; text-align: right; color: #a1a1aa; font-family: monospace;">TXN-${Date.now().toString().substring(5)}</td>
              </tr>
            </table>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: 15px; text-align: center; font-size: 11px; color: #71717a;">
            <p style="margin: 0;">Safe travel is our premier signature in West Africa.</p>
            <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 9px; color: #e9c349;">Registered: Monrovia Registry Office</p>
          </div>
        </div>
      `.trim();
      
      setBodyText(textContent);
      setBodyHtml(htmlContent);
    } else if (templateType === 'certificate') {
      setSubject('Liberia Ride - Elite Fleet Registry Access Granted');
      
      const textContent = `
LIBERIA RIDE REGISTRY - CERTIFICATE OF PLACEMENT
Congratulations and Welcome back, Member.

This certifies that ${clientName} is officially approved and registered in the Liberia Ride elite system.

Approved Identity: ${currentUser?.email || 'N/A'}
Security Class: ${clientTier}
Permissions Granted: Google Sheets database triggers & Live Monrovia Map tracking GPS locks.
Date of Registry: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Your account profile has been secure-locked in the administrative Firestore.
Monrovia Registry Board, Liberia Ride Office.
      `.trim();

      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; background-color: #0c0f0f; color: #f1f5f9; padding: 35px; border-radius: 12px; max-width: 500px; border: 2px dashed #e9c349; position: relative;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #e9c349; font-size: 26px; margin: 0; font-family: Georgia, serif; letter-spacing: 3px; font-weight: bold;">CERTIFICATE OF PLACEMENT</h1>
            <p style="text-transform: uppercase; font-size: 9px; color: #a1a1aa; letter-spacing: 3px; font-weight: bold; margin: 8px 0 0 0;">Liberia Ride Fleet Registry Board</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 12px; color: #a1a1aa; text-transform: uppercase; tracking: 1px; margin-bottom: 5px;">This document certifies that</p>
            <p style="font-size: 20px; color: #ffffff; font-weight: bold; font-family: Georgia, serif; margin: 5px 0; border-bottom: 1px solid rgba(233, 195, 73, 0.3); padding-bottom: 10px; display: inline-block; min-width: 250px;">${clientName}</p>
            <p style="font-size: 12px; color: #a1a1aa; margin-top: 10px; line-height: 1.6;">is officially registered and ranked as a verified <strong style="color: #e9c349;">${clientTier}</strong> partner within our secure database.</p>
          </div>

          <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); font-size: 11px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #71717a;">Registered Email:</span>
              <strong style="color: #f1f5f9; font-family: monospace;">${currentUser?.email || 'N/A'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #71717a;">GPS Permission Class:</span>
              <strong style="color: #e9c349;">Monrovia Central Grid</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">Authorized On:</span>
              <strong style="color: #f1f5f9;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #52525b; border-t: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <p style="margin: 0;">Verified and cryptographically sealed. Document Ref: CLN-${Date.now().toString().substring(7)}</p>
          </div>
        </div>
      `.trim();

      setBodyText(textContent);
      setBodyHtml(htmlContent);
    } else if (templateType === 'support') {
      setRecipient('africahowe@gmail.com');
      setSubject('Liberia Ride - Administrative Support Inquiry');
      
      const textContent = `
LIBERIA RIDE SUPPORT - DIRECT DISPATCH
From Registry Member: ${clientName}

To: Site Admin (africahowe@gmail.com)
Message inquiry:
(Please replace this line with details of your support query or assistance request regarding the fleet dispatch registry)

Registry Member metadata:
Name: ${clientName}
Email Identifier: ${currentUser?.email || 'N/A'}
Role: ${currentUser?.role || 'Client'}
System Record State: Securely Synced
      `.trim();

      setBodyText(textContent);
      setBodyHtml(''); // Just keep text formatting for raw administrative support queries
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyText.trim()) {
      setErrorMsg('Please fulfill all mandatory fileds (Recipient, Subject, Email content).');
      return;
    }

    const confirmSend = window.confirm(
      `Confirm Dispatch: Send this email to "${recipient}" using your connected Gmail account?`
    );
    if (!confirmSend) return;

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendGmailMessage(recipient, subject, bodyText, bodyHtml || undefined);
      setSuccessMsg(`Gmail dispatched successfully to "${recipient}"! Message logged in Google registry.`);
      if (selectedTemplate === 'custom') {
        setSubject('');
        setBodyText('');
        setBodyHtml('');
      }
      // Re-fetch sent history
      setTimeout(() => fetchSentHistory(), 1500);
    } catch (err: any) {
      console.error('Gmail send error details:', err);
      setErrorMsg(err.message || 'Gmail transmission failed. Check API permission scopes.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="gmail-dispatch-hub" className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden bg-gradient-to-br from-black/40 to-[#0e0e0e]/95 shadow-2xl">
      {/* Top beautiful border using Google Gmail colors (Red, Blue, Yellow, Green) */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ea4335] via-[#4285f4] to-[#fbbc05]"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5 mb-6">
        <div>
          <span className="text-[10px] text-red-400 font-sans font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Google Gmail Workspace Dispatch
          </span>
          <h4 className="font-bodoni text-2xl font-bold text-on-surface mt-1">E-Receipt & Dispatch Centre</h4>
          <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">Draft, format and send professional fleet receipts via connected Gmail account</p>
        </div>

        {/* Gmail status label */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
          <span className={`h-1.5 w-1.5 rounded-full ${googleUser ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
          <span className="text-[9px] font-sans font-bold text-[#f1f5f9] tracking-widest uppercase">{googleUser ? 'Linked API' : 'Unlinked API'}</span>
        </div>
      </div>

      {!googleUser ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mb-4 animate-bounce">
            <span className="material-symbols-outlined text-2xl">mail</span>
          </div>
          <h5 className="font-bodoni text-lg text-on-surface mb-1">Gmail Client Connection Offline</h5>
          <p className="text-xs text-on-surface-variant opacity-60 max-w-sm mb-6">
            Connecting your Google Account allows you to send luxury receipts, registration documents and administrative messages directly via standard Gmail.
          </p>
          
          <button 
            type="button"
            onClick={handleSignIn}
            className="gsi-material-button hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-95 transition-all w-full sm:w-auto"
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
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Linked Google Account status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-red-500/30">
                <img 
                  src={googleUser.photoURL || undefined} 
                  alt="Google Account" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface">{googleUser.displayName}</p>
                <p className="text-[10px] text-red-400 font-mono font-medium">{googleUser.email}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side: Compose and send receipt */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-[10px] text-primary uppercase font-bold tracking-wider">Fast Dispatch templates</span>
              </div>
              
              {/* Template Select buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleTemplateChange('custom')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedTemplate === 'custom' ? 'bg-[#e9c349]/15 border-[#e9c349]/60 text-[#e9c349]' : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'}`}
                >
                  Custom Email
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('receipt')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedTemplate === 'receipt' ? 'bg-[#e9c349]/15 border-[#e9c349]/60 text-[#e9c349]' : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'}`}
                >
                  Luxury Trip Receipt
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('certificate')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedTemplate === 'certificate' ? 'bg-[#e9c349]/15 border-[#e9c349]/60 text-[#e9c349]' : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'}`}
                >
                  System Access Placement
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('support')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${selectedTemplate === 'support' ? 'bg-[#e9c349]/15 border-[#e9c349]/60 text-[#e9c349]' : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'}`}
                >
                  Contact Platform Support
                </button>
              </div>

              {/* Compose message form */}
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant tracking-wider uppercase font-bold ml-1">Recipient Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. client@domain.com"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:border-primary text-xs font-mono text-on-surface font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant tracking-wider uppercase font-bold ml-1">Dispatch Subject</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter subject header..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:border-primary text-xs text-on-surface font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] text-on-surface-variant tracking-wider uppercase font-bold">Email Message Content (MIME Raw Payload)</label>
                    {bodyHtml && (
                      <span className="text-[8px] bg-amber-500/10 text-[#e9c349] px-2 py-0.5 rounded border border-amber-500/20 uppercase font-bold">Premium Rich Template Attached</span>
                    )}
                  </div>
                  <textarea 
                    rows={8}
                    required
                    placeholder="Compose body text details here..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-xs font-mono text-on-surface line-height-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${isSending ? 'bg-primary/50 text-on-primary/60 cursor-not-allowed' : 'bg-primary text-[#0c0f0f] hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(255,191,116,0.1)]'}`}
                >
                  {isSending ? (
                    <>
                      <span className="h-4.5 w-4.5 border-2 border-[#0c0f0f] border-t-transparent rounded-full animate-spin"></span>
                      <span>Dispatching Email via Gmail...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>Dispatch Email via Gmail</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right side: Sent Dispatch logs from actual account */}
            <div className="lg:col-span-5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-cinzel text-[10px] text-primary uppercase font-bold tracking-wider">Live Sent Ledger</span>
                <button
                  type="button"
                  onClick={fetchSentHistory}
                  disabled={loadingHistory}
                  className="flex items-center gap-1 text-[9px] text-[#e9c349] hover:underline uppercase font-bold focus:outline-none"
                >
                  <span className={`material-symbols-outlined text-xs ${loadingHistory ? 'animate-spin' : ''}`}>sync</span>
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest opacity-60">Reading Gmail Logbook...</p>
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-black/30 rounded-xl border border-white/5 text-center px-4">
                  <span className="material-symbols-outlined text-red-400/40 text-xl mb-2">drafts</span>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest leading-relaxed">No dispatched matching records found in this account sent list yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                  {sentMessages.map((msg, index) => (
                    <div key={msg.id || index} className="p-3 bg-black/40 border border-white/5 hover:border-white/10 rounded-xl space-y-1 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-sans text-[10px] text-[#e9c349] font-bold truncate max-w-[70%]">{msg.to}</span>
                        <span className="text-[8px] text-on-surface-variant opacity-50 font-mono shrink-0">{msg.date ? new Date(msg.date).toLocaleDateString() : ''}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-on-surface line-clamp-1">{msg.subject}</p>
                      <p className="font-mono text-[9px] text-on-surface-variant opacity-60 leading-relaxed line-clamp-2">{msg.snippet}</p>
                      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-emerald-400 font-bold font-sans mt-1">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                        <span>Dispatched successfully</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-3 text-left animate-in shake-1 bg-gradient-to-r from-red-500/[0.04]">
          <span className="material-symbols-outlined text-red-400 text-lg shrink-0">warning</span>
          <p className="flex-grow">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-3 text-left animate-in slide-in-from-bottom-2 duration-300">
          <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">check_circle</span>
          <p className="flex-grow">{successMsg}</p>
        </div>
      )}
    </div>
  );
};
