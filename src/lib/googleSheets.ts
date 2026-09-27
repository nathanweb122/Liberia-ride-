import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider Config with Google Sheets Scopes and Gmail Scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize oauth state and register a callback for auth success/failure.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Handle Google Sign-In with popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to capture Google Sheets access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
      console.warn('Sign-in cancelled: Google connection popup closed by the user.');
    } else {
      console.error('Sign-in failed:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Handle standard logout
 */
export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

interface SyncData {
  clients: Array<{
    name: string;
    email: string;
    rating: string;
    avatar: string;
  }>;
  drivers: Array<{
    id: string;
    name: string;
    role: string;
    phone: string;
    rating: string;
    vehicle: string;
    plate: string;
    status: string;
  }>;
  riders: Array<{
    id: string;
    name: string;
    role: string;
    phone: string;
    rating: string;
    vehicle: string;
    plate: string;
    status: string;
  }>;
}

/**
 * High-performance Google Sheets creation and batch sync action
 */
export const syncToGoogleSheets = async (data: SyncData, onLog: (msg: string) => void): Promise<string> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No valid Google Sheets session. Please authenticate first.');
  }

  // 1. Create Spreadsheet
  onLog('Initiating secure Google Sheets creation...');
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Liberia Ride Registry - Sync'
      },
      sheets: [
        { properties: { title: 'Clients', gridProperties: { rowCount: 100, columnCount: 10 } } },
        { properties: { title: 'Drivers', gridProperties: { rowCount: 100, columnCount: 15 } } },
        { properties: { title: 'Riders', gridProperties: { rowCount: 100, columnCount: 15 } } }
      ]
    })
  });

  if (!createResponse.ok) {
    const errorDetails = await createResponse.text();
    console.error('Create error API detail:', errorDetails);
    throw new Error(`Failed to create spreadsheet: ${createResponse.statusText}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;
  onLog(`Spreadsheet created successfully! ID: ${spreadsheetId.substring(0, 8)}...`);

  // 2. Prepare grid-update data payloads
  onLog('Assembling clients and registry payload metadata...');
  
  const clientRows = [
    ['Client Name', 'Email', 'Tier/Rating', 'Avatar URL'],
    ...data.clients.map(c => [c.name, c.email, c.rating, c.avatar])
  ];

  const driverRows = [
    ['ID', 'Name', 'Role', 'Phone Number', 'Rating', 'Active Vehicle', 'Plate Number', 'Status'],
    ...data.drivers.map(d => [d.id, d.name, d.role, d.phone, d.rating, d.vehicle, d.plate, d.status])
  ];

  const riderRows = [
    ['ID', 'Name', 'Role', 'Phone/Hotline', 'Rating', 'Active Vessel', 'License Plate', 'Current Status'],
    ...data.riders.map(r => [r.id, r.name, r.role, r.phone, r.rating, r.vehicle, r.plate, r.status])
  ];

  onLog('Deploying datasets into Clients, Drivers, and Riders grids...');

  const batchUpdateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Clients!A1',
          values: clientRows
        },
        {
          range: 'Drivers!A1',
          values: driverRows
        },
        {
          range: 'Riders!A1',
          values: riderRows
        }
      ]
    })
  });

  if (!batchUpdateResponse.ok) {
    const errorDetails = await batchUpdateResponse.text();
    console.error('Batch Update API error detail:', errorDetails);
    throw new Error(`Failed to populate spreadsheet: ${batchUpdateResponse.statusText}`);
  }

  onLog('Formatting active sheet headers and properties...');
  // Optional formatting of headers with styling for standard premium interface
  const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        // Style Header rows (Row 0 of each sheet) with beautiful dark-gold background
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.05, green: 0.06, blue: 0.06 },
                textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.91, green: 0.76, blue: 0.29 } },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        },
        // Auto fit cols on sheet 0, 1 and 2
        { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 } } },
        { autoResizeDimensions: { dimensions: { sheetId: spreadsheet.sheets[1]?.properties?.sheetId || 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 } } },
        { autoResizeDimensions: { dimensions: { sheetId: spreadsheet.sheets[2]?.properties?.sheetId || 2, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 } } }
      ]
    })
  }).catch(e => {
    console.warn('Optional header styling step skipped:', e);
  });

  onLog('Google Sheets synchronization completely prepped and published!');
  return spreadsheetUrl;
};
