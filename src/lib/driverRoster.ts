import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebaseService';

export interface ProductionDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  password: string;
  email: string;
  role: 'Chauffeur' | 'Rider';
  vehicleType: 'taxi' | 'bike' | 'kekeh';
  vehicle: string;
  rating: string;
  status: 'Available' | 'On Trip' | 'Unavailable';
  accountStatus: 'active' | 'hold' | 'suspended';
  earnings: number;
  commissionPaid: number;
  lat: number;
  lng: number;
  avatar: string;
  vehiclesList: Array<{
    id: string;
    name: string;
    plate: string;
    image: string;
    active: boolean;
  }>;
}

// All accounts removed from website - empty roster until users/drivers register fresh accounts
export const PRODUCTION_DRIVERS: ProductionDriver[] = [];

// Helper to normalize phone numbers (e.g., removing spaces, dashes, +231 prefix vs 0 prefix)
export function normalizePhone(phoneStr: string): string {
  if (!phoneStr) return '';
  let digits = phoneStr.replace(/\D/g, '');
  if (digits.startsWith('231') && digits.length > 9) {
    digits = '0' + digits.substring(3);
  }
  return digits;
}

// Find a driver by phone, plate, email, or id
export function findProductionDriver(identifier: string): ProductionDriver | undefined {
  if (!identifier) return undefined;
  const raw = identifier.trim();
  const lower = raw.toLowerCase();
  const digits = normalizePhone(raw);
  const cleanPlate = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return PRODUCTION_DRIVERS.find(d => {
    if (d.id.toLowerCase() === lower) return true;
    if (d.email.toLowerCase() === lower) return true;
    if (d.name.toLowerCase() === lower) return true;
    if (d.plate.toLowerCase() === lower) return true;
    if (d.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate) return true;

    const dDigits = normalizePhone(d.phone);
    if (d.phone === raw || dDigits === digits) return true;
    if (dDigits.endsWith(digits) && digits.length >= 7) return true;
    if (digits.endsWith(dDigits) && dDigits.length >= 7) return true;

    return false;
  });
}

/**
 * Authenticates a driver dynamically or against registered profiles.
 */
export async function authenticateProductionDriver(
  identifier: string,
  passwordAttempt: string
): Promise<{ success: boolean; driver?: ProductionDriver; error?: string }> {
  const driver = findProductionDriver(identifier);

  if (!driver) {
    return {
      success: false,
      error: 'Unrecognized Driver Identity. Enter your registered Phone Number or License Plate.'
    };
  }

  // Strict Password Verification
  if (driver.password !== passwordAttempt) {
    return {
      success: false,
      error: 'Invalid Access Key for driver account ' + driver.name + '. Please verify your credentials.'
    };
  }

  // Attempt seamless Firebase Auth integration in background
  try {
    try {
      await signInWithEmailAndPassword(auth, driver.email, driver.password);
    } catch (signInErr: any) {
      if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, driver.email, driver.password);
        } catch {
          // Ignored if user creation requires different parameters
        }
      }
    }
  } catch (fbErr) {
    console.warn('Firebase Auth synchronization notice:', fbErr);
  }

  // Ensure driver profile is persisted in Firestore
  try {
    const docRef = doc(db, 'drivers', driver.id);
    await setDoc(docRef, {
      ...driver,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.warn('Firestore driver persistence notice:', dbErr);
  }

  return {
    success: true,
    driver
  };
}

let isPurgeDone = false;

/**
 * Purges ALL accounts from Firestore and local caches completely.
 * Cleans up driver, rider, client profiles, payments, and active user sessions.
 */
export async function purgeAllAccountsFromFirestore(force: boolean = false): Promise<{ success: boolean; count: number }> {
  if (!force && isPurgeDone) return { success: true, count: 0 };

  try {
    let deletedCount = 0;

    // 1. Wipe all accounts from 'drivers' collection
    try {
      const colRef = collection(db, 'drivers');
      const snapshot = await getDocs(colRef);

      for (const docSnap of snapshot.docs) {
        if (docSnap.id === 'active_trip') {
          try {
            await setDoc(docSnap.ref, {
              isActive: false,
              status: 'ready',
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
              updatedAt: new Date().toISOString()
            });
          } catch {
            // safe
          }
        } else {
          try {
            await deleteDoc(docSnap.ref);
            deletedCount++;
          } catch {
            // safe
          }
        }
      }
    } catch (driverErr) {
      console.warn('Driver collection purge notice:', driverErr);
    }

    // 2. Wipe all records from 'payments' collection
    try {
      const payRef = collection(db, 'payments');
      const paySnap = await getDocs(payRef);
      for (const docSnap of paySnap.docs) {
        try {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        } catch {
          // safe
        }
      }
    } catch (payErr) {
      console.warn('Payments collection purge notice:', payErr);
    }

    // 3. Terminate any active Firebase Auth session
    try {
      await auth.signOut();
    } catch (signOutErr) {
      console.warn('Auth sign out notice:', signOutErr);
    }

    // 4. Clear all cached accounts and sessions in localStorage & sessionStorage
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('obsidian_') || key.startsWith('firebase:authUser:'))) {
          // Keep language preference if set
          if (key !== 'obsidian_lang') {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    isPurgeDone = true;
    return { success: true, count: deletedCount };
  } catch (error) {
    console.warn('Account roster purge notice:', error);
    return { success: false, count: 0 };
  }
}

export const purgeAndSeedProductionDrivers = purgeAllAccountsFromFirestore;
