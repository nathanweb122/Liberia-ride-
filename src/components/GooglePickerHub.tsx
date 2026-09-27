import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken 
} from '../lib/googleSheets';
import firebaseConfig from '../../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';

interface GooglePickerHubProps {
  currentUser: any;
  drivers: any[];
}

interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
  iconUrl?: string;
  thumbnailUrl?: string;
}

export const GooglePickerHub = ({ currentUser }: GooglePickerHubProps) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [pickerLogs, setPickerLogs] = useState<string[]>([]);
  const [linkedDriverId, setLinkedDriverId] = useState<string>('general');

  // Listen to the common google auth credentials
  useEffect(() => {
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

  // Dynamically load Google Picker scripts (gapi and picker module)
  const loadGooglePickerScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).gapi && (window as any).google?.picker) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        const gapi = (window as any).gapi;
        if (!gapi) {
          reject(new Error('Google API Loader (GAPI) failed to initialize.'));
          return;
        }

        gapi.load('picker', {
          callback: () => {
            if ((window as any).google?.picker) {
              resolve();
            } else {
              reject(new Error('Google Picker library namespace not loaded.'));
            }
          },
          onerror: () => {
            reject(new Error('Failed to load Google Picker module inside GAPI.'));
          },
          timeout: 12000,
          ontimeout: () => {
            reject(new Error('GAPI load timeout. Please refresh or check connection.'));
          }
        });
      };

      script.onerror = () => {
        reject(new Error('Failed to load GAPI script. Check network rules.'));
      };

      document.body.appendChild(script);
    });
  };

  const handleInitAndOpenPicker = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setErrorMsg('No Google Workspace authentication found. Please Sign In first.');
      return;
    }

    setIsLoadingPicker(true);
    setErrorMsg(null);
    setPickerLogs(prev => [...prev, 'Loading Google Picker client Libraries...']);

    try {
      await loadGooglePickerScripts();
      setIsPickerLoaded(true);
      setPickerLogs(prev => [...prev, 'Libraries verification completed successfully. Initializing Picker viewport...']);
      
      // Initialize layout and open
      openPickerInstance(activeToken);
    } catch (err: any) {
      console.error('Picker Script Loading Failed:', err);
      setErrorMsg(err?.message || 'Failed to initialize the Google Picker scripts. Please ensure third-party cookies or scripts are allowed.');
    } finally {
      setIsLoadingPicker(false);
    }
  };

  const openPickerInstance = (oauthToken: string) => {
    try {
      const gapi = (window as any).gapi;
      const google = (window as any).google;

      if (!google?.picker) {
        throw new Error('Google Picker is not ready.');
      }

      // 1. Build Document View (e.g. PDFs, Sheets, Images, docs)
      const docsView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      // 2. Build Spreadsheet specific View filter as secondary filter
      const sheetsView = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
        .setMode(google.picker.DocsMode.GRID);

      // 3. Launch Google Picker Builder
      const pickerBuilder = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(oauthToken)
        .setDeveloperKey(firebaseConfig.apiKey)
        .addView(docsView)
        .addView(sheetsView)
        .setTitle('Liberia Ride System - Choose Driver Documentation')
        .setCallback((data: any) => {
          if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            const documentList = data[google.picker.Response.DOCUMENTS];
            setPickerLogs(prev => [...prev, `Selected ${documentList.length} files successfully.`]);
            
            const newlyPicked: PickedFile[] = documentList.map((docItem: any) => ({
              id: docItem[google.picker.Document.ID],
              name: docItem[google.picker.Document.NAME],
              mimeType: docItem[google.picker.Document.MIME_TYPE],
              url: docItem[google.picker.Document.URL],
              sizeBytes: docItem[google.picker.Document.SIZE_BYTES],
              lastEditedUtc: docItem[google.picker.Document.LAST_EDITED_UTC],
              iconUrl: docItem[google.picker.Document.ICON_URL],
              thumbnailUrl: docItem[google.picker.Document.THUMBNAIL_URL]
            }));

            setPickedFiles(prev => {
              // Deduplicate files by id
              const combined = [...prev, ...newlyPicked];
              const unique = combined.filter((file, idx, self) =>
                self.findIndex(f => f.id === file.id) === idx
              );
              return unique;
            });
          } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
            setPickerLogs(prev => [...prev, 'User dismissed Picker viewport.']);
          }
        });

      // Set origin cleanly
      pickerBuilder.setOrigin(window.location.origin);

      const pickerInstance = pickerBuilder.build();
      pickerInstance.setVisible(true);
      setPickerLogs(prev => [...prev, 'Google Picker Viewport activated successfully!']);
    } catch (err: any) {
      console.error('Failed to configure picker builder instance:', err);
      setErrorMsg(`Failed to launch Google Picker: ${err?.message || 'Unknown configuration error.'}`);
    }
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        setPickerLogs(prev => [...prev, `Signed in as: ${result.user.displayName}`]);
      }
    } catch (err: any) {
      const errStr = (err?.code || "") + " " + (err?.message || "");
      if (errStr.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in cancelled. Close popup window and click sign-in to retry.');
      } else {
        setErrorMsg(err.message || 'Google Link failed.');
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setPickedFiles(prev => prev.filter(f => f.id !== id));
    setPickerLogs(prev => [...prev, 'Removed associated file from panel list.']);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div id="google-picker-hub" className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden bg-gradient-to-br from-black/40 to-[#0e0e0e]/95 shadow-2xl">
      {/* Visual top border styling */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-500 to-indigo-500"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5 mb-6">
        <div>
          <span className="text-[10px] text-teal-400 font-sans font-bold tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Google Drive Pick Service
          </span>
          <h4 className="font-bodoni text-2xl font-bold text-on-surface mt-1">Google Picker Hub</h4>
          <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">Browse Google Drive documents directly from the admin cockpit</p>
        </div>

        {googleUser && (
          <div className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-xs text-on-surface-variant max-w-[280px] shrink-0">
            <span className="material-symbols-outlined text-teal-400 text-sm">drive_folder_upload</span>
            <span className="truncate max-w-[200px]">{googleUser.email}</span>
          </div>
        )}
      </div>

      {!googleUser ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-xl border border-white/5 p-6">
          <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center text-teal-400 mb-4 animate-pulse">
            <span className="material-symbols-outlined text-2xl animate-spin">cloud_done</span>
          </div>
          <h5 className="font-bodoni text-lg text-on-surface mb-2">Drive Picker is Offline</h5>
          <p className="text-xs text-on-surface-variant opacity-65 max-w-md mb-6 leading-relaxed">
            Link your Google Account to integrate Google Drive Picker views. Once enabled, you can browse, fetch spreadsheets, and query compliance docs dynamically from your workspace.
          </p>

          <button 
            type="button"
            onClick={handleSignIn}
            className="gsi-material-button hover:shadow-[0_0_20px_rgba(20,184,166,0.18)] active:scale-95 transition-all w-full sm:w-auto"
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
              <span className="gsi-material-button-contents font-sans font-bold text-xs uppercase tracking-widest text-[#202425]">Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Control Panel */}
            <div className="md:col-span-6 space-y-4 text-left">
              <span className="font-cinzel text-[10px] text-teal-400 tracking-widest font-bold uppercase block">Google Drive Document Picker</span>
              <p className="text-xs text-on-surface-variant opacity-80 leading-relaxed">
                Unlock native search within your personal or shared Drive files. Click below to launch the modal, query files, and safely select records to link with registry databases.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleInitAndOpenPicker}
                  disabled={isLoadingPicker}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 font-sans font-bold text-[#0c0f0f] text-xs uppercase tracking-widest transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoadingPicker ? (
                    <>
                      <div className="h-4.5 w-4.5 border-2 border-[#0c0f0f] border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">search_activity</span>
                      <span>Launch Google Picker</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Logs console */}
            <div className="md:col-span-6 flex flex-col bg-black/60 border border-white/5 rounded-xl p-4 min-h-[140px] max-h-[160px] overflow-hidden text-left">
              <span className="text-[9px] font-mono text-teal-400 font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
                <span>Google Picker Core Logs</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
              </span>
              <div className="flex-1 overflow-y-auto space-y-1 text-[10px] font-mono text-teal-300/80 scrollbar-thin">
                {pickerLogs.length === 0 && (
                  <p className="text-white/25 italic">Console dormant. Launch the picker to inspect telemetry...</p>
                )}
                {pickerLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed animate-in fade-in duration-200">
                    <span className="text-teal-500/35 mr-1.5">&gt;</span>{log}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Render List of picked files */}
          {pickedFiles.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/5 text-left">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-[10px] text-white/50 tracking-widest font-bold uppercase block">Associated Google Drive Documents ({pickedFiles.length})</span>
                <button 
                  onClick={() => setPickedFiles([])} 
                  className="text-[9px] text-red-400 hover:text-red-300 font-sans font-bold uppercase tracking-widest bg-red-400/5 px-2.5 py-1 rounded border border-red-500/10 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {pickedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="p-4 rounded-xl border border-white/5 bg-[#141516]/80 flex gap-3 relative overflow-hidden text-left h-fit hover:border-teal-500/25 transition-colors group"
                    >
                      {/* Left icon or image snippet */}
                      <div className="w-12 h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center relative shrink-0 overflow-hidden">
                        {file.thumbnailUrl ? (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-teal-400 text-xl">description</span>
                        )}
                      </div>

                      {/* Main text metadata */}
                      <div className="flex-1 min-w-0 pr-6">
                        <h5 className="text-xs font-bold text-on-surface truncate group-hover:text-teal-300 transition-colors duration-200">{file.name}</h5>
                        <p className="text-[10px] text-on-surface-variant opacity-60 font-mono mt-0.5 truncate">{file.mimeType.split('.').pop() || file.mimeType}</p>
                        
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#8a8d90]">
                          <span>ID: {file.id.substring(0, 10)}...</span>
                          <span>|</span>
                          <span>{formatSize(file.sizeBytes)}</span>
                        </div>
                      </div>

                      {/* Remove or View buttons */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="h-6 w-6 rounded hover:bg-red-500/15 flex items-center justify-center text-red-400 transition-colors"
                          title="Remove Association"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 w-6 rounded hover:bg-teal-500/15 flex items-center justify-center text-teal-400 transition-colors"
                          title="Open document in Drive tab"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
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
    </div>
  );
};
