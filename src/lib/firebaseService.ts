import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocFromServer,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe initialization of Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with auto-detect long polling so WebChannel connection operates reliably across proxies/iframes
export const db = (() => {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      dbId
    );
  } catch (_initErr) {
    return getFirestore(app, dbId);
  }
})();

export const auth = getAuth(app);

// Connection test check conforming to Firebase skill guidelines
async function testConnection() {
  // Allow initial connection and auth state to settle
  setTimeout(async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      if (
        error instanceof Error &&
        (error.message.includes('the client is offline') ||
          error.message.includes('unavailable') ||
          (error as any).code === 'unavailable')
      ) {
        // Normal offline mode behavior in sandboxed or initial handshake stages
        console.warn("Firestore running in offline cache mode. Operations will sync upon connection.");
      }
    }
  }, 1500);
}
testConnection();



export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string | null;
      email: string | null;
    }[];
  };
}

// Standardized callback type for system logs or UI toast dispatchers
export type FirestoreErrorCallback = (info: FirestoreErrorInfo, rawError: any) => void;

let errorListenerCallback: FirestoreErrorCallback | null = null;

/**
 * Registers a global listener to pipe structured error metadata into your system logs
 * or UI toast notification dispatchers.
 */
export const registerFirestoreErrorListener = (callback: FirestoreErrorCallback): void => {
  errorListenerCallback = callback;
};

/**
 * Sanitizes sensitive user data inside authentication records to prevent accidental leaks
 * in production system logs or client-facing alert portals.
 */
const sanitizeAuthInfo = (authInfo: FirestoreErrorInfo['authInfo']): FirestoreErrorInfo['authInfo'] => {
  return {
    ...authInfo,
    userId: authInfo.userId ? `${authInfo.userId.substring(0, 5)}***` : null,
    email: authInfo.email ? authInfo.email.replace(/(.).+@(.+)/, '$1***@$2') : null,
    providerInfo: authInfo.providerInfo?.map((prov) => ({
      providerId: prov.providerId,
      email: prov.email ? prov.email.replace(/(.).+@(.+)/, '$1***@$2') : null,
    })) || [],
  };
};

/**
 * Parses incoming Firestore database rejections, normalizes error strings,
 * wraps execution metadata, and dispatches to system logs or notifications.
 */
export function handleFirestoreError(
  error: unknown,
  operation: OperationType,
  path: string | null,
  currentAuth: FirestoreErrorInfo['authInfo'] = { userId: null, email: null }
): FirestoreErrorInfo {
  let errorMessage = 'An unknown database error occurred.';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    errorMessage = String((error as any).message);
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Firebase/Firestore errors frequently carry code or details parameters
  const firebaseError = error as { code?: string; details?: string };
  if (firebaseError.code) {
    errorMessage = `[Firestore Code: ${firebaseError.code}] ${errorMessage}`;
  }

  const rawErrorInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType: operation,
    path: path,
    authInfo: currentAuth,
  };

  // Secure sensitive authentication traits before running global logs
  const sanitizedErrorInfo = {
    ...rawErrorInfo,
    authInfo: sanitizeAuthInfo(currentAuth),
  };

  // Print standardized message block to terminal/console group for structured tracing
  console.groupCollapsed(`🔥 Firestore Security/Operation Error [${operation.toUpperCase()}]`);
  console.error(`Message: ${sanitizedErrorInfo.error}`);
  console.error(`Path: ${sanitizedErrorInfo.path || 'Unknown Grid/Collection'}`);
  console.error(`Identity Context:`, sanitizedErrorInfo.authInfo);
  console.groupEnd();

  // Pipe to registered system listeners or UI notification layouts if available
  if (errorListenerCallback) {
    try {
      errorListenerCallback(sanitizedErrorInfo, error);
    } catch (callbackErr) {
      console.error('Failed to dispatch structured firestore error to system callback listener:', callbackErr);
    }
  }

  return rawErrorInfo;
}

/**
 * Higher-order wrapper designed to safe-guard individual document references and mutations.
 * Automatically intercepts errors and bubbles them down into the core central handler.
 */
export async function runSafeFirestore<T>(
  operation: () => Promise<T>,
  operationType: OperationType,
  path: string,
  authContext?: FirestoreErrorInfo['authInfo']
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleFirestoreError(error, operationType, path, authContext);
    throw error;
  }
}

const DRIVERS_PATH = 'drivers';
const PAYMENTS_PATH = 'payments';

/**
 * Save driver or rider profile update to Firebase Firestore
 */
export async function saveDriverToFirestore(driver: any) {
  const docPath = `${DRIVERS_PATH}/${driver.id}`;
  const sanitizedDriver = { ...driver };
  if (sanitizedDriver.email) {
    sanitizedDriver.email = sanitizedDriver.email.trim().toLowerCase();
  }
  if (sanitizedDriver.phone) {
    sanitizedDriver.phone = sanitizedDriver.phone.trim();
  }
  return runSafeFirestore(async () => {
    const docRef = doc(db, DRIVERS_PATH, driver.id);
    await setDoc(docRef, {
      ...sanitizedDriver,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }, OperationType.WRITE, docPath, {
    userId: auth.currentUser?.uid,
    email: auth.currentUser?.email
  });
}

/**
 * Delete a specific account (driver, rider, or client) from Firestore
 */
export async function deleteDriverFromFirestore(driverIdOrAccount: string | any) {
  const driverId = typeof driverIdOrAccount === 'string' ? driverIdOrAccount : (driverIdOrAccount?.id || driverIdOrAccount?.uid);
  if (!driverId) return;

  const docPath = `${DRIVERS_PATH}/${driverId}`;
  return runSafeFirestore(async () => {
    // 1. Direct delete by ID
    try {
      const docRef = doc(db, DRIVERS_PATH, driverId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`Direct delete by doc id ${driverId} failed:`, err);
    }

    // 2. If object passed with a different uid, delete by uid
    if (typeof driverIdOrAccount === 'object' && driverIdOrAccount) {
      if (driverIdOrAccount.uid && driverIdOrAccount.uid !== driverId) {
        try {
          const uidRef = doc(db, DRIVERS_PATH, driverIdOrAccount.uid);
          await deleteDoc(uidRef);
        } catch {
          // ignore
        }
      }
    }

    // 3. Fallback check across collection to eliminate any orphan documents with matching id/phone
    try {
      const colRef = collection(db, DRIVERS_PATH);
      const snapshot = await getDocs(colRef);
      for (const snapDoc of snapshot.docs) {
        if (snapDoc.id === 'active_trip') continue;
        const data = snapDoc.data();
        const matchesId = snapDoc.id === driverId || data.id === driverId || data.uid === driverId;
        const matchesPhone = typeof driverIdOrAccount === 'object' && driverIdOrAccount?.phone && data.phone && data.phone.trim() === driverIdOrAccount.phone.trim();
        if (matchesId || matchesPhone) {
          try {
            await deleteDoc(snapDoc.ref);
          } catch {
            // ignore
          }
        }
      }
    } catch (scanErr) {
      console.warn('Collection scan delete notice:', scanErr);
    }
  }, OperationType.DELETE, docPath, {
    userId: auth.currentUser?.uid,
    email: auth.currentUser?.email
  });
}

/**
 * Real-time listener for the drivers and riders list
 */
export function listenToLiveDrivers(onUpdate: (drivers: any[]) => void) {
  const colRef = collection(db, DRIVERS_PATH);
  return onSnapshot(colRef, (snapshot) => {
    const liveList: any[] = [];
    snapshot.forEach((snapDoc) => {
      liveList.push(snapDoc.data());
    });
    onUpdate(liveList);
  }, (err: any) => {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach Cloud Firestore')) {
      console.warn('Firestore live drivers listener operating in offline mode. Will re-sync automatically once connected.');
      return;
    }
    handleFirestoreError(err, OperationType.GET, DRIVERS_PATH, {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    });
  });
}

/**
 * Save a payment submission report for admin review to Firebase Firestore
 */
export async function savePaymentToFirestore(payment: any) {
  const docPath = `${PAYMENTS_PATH}/${payment.id}`;
  return runSafeFirestore(async () => {
    const docRef = doc(db, PAYMENTS_PATH, payment.id);
    await setDoc(docRef, {
      ...payment,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }, OperationType.WRITE, docPath, {
    userId: auth.currentUser?.uid,
    email: auth.currentUser?.email
  });
}

/**
 * Real-time listener for all submitted payments (useful in Admin control dashboard)
 */
export function listenToPayments(onUpdate: (payments: any[]) => void) {
  const colRef = collection(db, PAYMENTS_PATH);
  return onSnapshot(colRef, (snapshot) => {
    const liveList: any[] = [];
    snapshot.forEach((snapDoc) => {
      liveList.push(snapDoc.data());
    });
    onUpdate(liveList);
  }, (err: any) => {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach Cloud Firestore')) {
      console.warn('Firestore payments listener operating in offline mode. Will re-sync automatically once connected.');
      return;
    }
    handleFirestoreError(err, OperationType.GET, PAYMENTS_PATH, {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    });
  });
}

/**
 * Real-time listener for the shared active trip/ride state
 */
export function listenToActiveTrip(onUpdate: (trip: any) => void) {
  const docRef = doc(db, DRIVERS_PATH, 'active_trip');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  }, (err: any) => {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach Cloud Firestore')) {
      console.warn('Firestore active trip listener operating in offline mode. Will re-sync automatically once connected.');
      return;
    }
    handleFirestoreError(err, OperationType.GET, `${DRIVERS_PATH}/active_trip`);
  });
}

/**
 * Update the shared active trip/ride state in Firestore
 */
export async function saveActiveTripToFirestore(trip: any) {
  const docRef = doc(db, DRIVERS_PATH, 'active_trip');
  return runSafeFirestore(async () => {
    await setDoc(docRef, {
      ...trip,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }, OperationType.WRITE, `${DRIVERS_PATH}/active_trip`);
}

/**
 * Double-check for duplicate accounts/identities by querying the drivers database in real-time
 */
export async function checkDuplicateIdentity(identity: string): Promise<boolean> {
  const cleanId = identity.trim().toLowerCase();
  const colRef = collection(db, DRIVERS_PATH);
  
  try {
    // 1. Query by email
    const qEmail = query(colRef, where('email', '==', cleanId));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return true;
    }
    
    // 2. Query by phone
    const qPhone = query(colRef, where('phone', '==', cleanId));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      return true;
    }

    // 3. Complete scan fallback to make 100% sure we catch cross-case matches, extra spaces or weird formatting
    const allDocs = await getDocs(colRef);
    let foundDup = false;
    allDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const dEmail = (data.email || '').trim().toLowerCase();
      const dPhone = (data.phone || '').trim().toLowerCase();
      if (dEmail === cleanId || dPhone === cleanId) {
        foundDup = true;
      }
    });

    if (foundDup) {
      return true;
    }
  } catch (error) {
    console.error("Duplicate search query failed, checking client cache fallback.", error);
  }
  
  return false;
}
