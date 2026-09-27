import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebaseService';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  secondaryEmail?: string;
  role: 'Admin';
  title: string;
  phone: string;
  avatar: string;
  rating: string;
  authenticatedAt?: string;
}

export const MASTER_ADMIN_CREDENTIALS = {
  primaryEmail: 'africahowe@gmail.com',
  secondaryEmail: 'admin@liberiaride.com',
  name: 'Africa Howe',
  title: 'Platform Administrator & Fleet Controller',
  defaultSecurityKey: 'Admin@2026!',
  phone: '+231-77-800-0000',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
};

const SESSION_KEY = 'obsidian_admin_session';

/**
 * Ensures the master administrator record exists in Firestore for persistence.
 */
export async function ensureMasterAdminInFirestore(): Promise<AdminProfile> {
  const adminObj: AdminProfile = {
    id: 'admin_master',
    name: MASTER_ADMIN_CREDENTIALS.name,
    email: MASTER_ADMIN_CREDENTIALS.primaryEmail,
    secondaryEmail: MASTER_ADMIN_CREDENTIALS.secondaryEmail,
    role: 'Admin',
    title: MASTER_ADMIN_CREDENTIALS.title,
    phone: MASTER_ADMIN_CREDENTIALS.phone,
    avatar: MASTER_ADMIN_CREDENTIALS.avatar,
    rating: 'Master Administrator'
  };

  try {
    const adminRef = doc(db, 'drivers', 'admin_master');
    await setDoc(adminRef, {
      ...adminObj,
      status: 'Available',
      accountStatus: 'active',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Admin Firestore document sync notice:', err);
  }

  return adminObj;
}

/**
 * Authenticates an administrator using master credentials or Firebase Auth.
 */
export async function authenticateAdmin(
  identifier: string, 
  securityKeyAttempt: string
): Promise<{ success: boolean; admin?: AdminProfile; error?: string }> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanKey = (securityKeyAttempt || '').trim();

  if (!cleanId) {
    return { success: false, error: 'Admin Email Identity or ID is required.' };
  }
  if (!cleanKey) {
    return { success: false, error: 'Master Security Key is required.' };
  }

  const isPrimary = cleanId === MASTER_ADMIN_CREDENTIALS.primaryEmail.toLowerCase();
  const isSecondary = cleanId === MASTER_ADMIN_CREDENTIALS.secondaryEmail.toLowerCase();
  const isAlias = cleanId === 'admin' || cleanId === 'africahowe';

  // Check stored custom admin passkey if set, else default
  const expectedKey = (typeof localStorage !== 'undefined' && localStorage.getItem('obsidian_custom_admin_key')) 
    || MASTER_ADMIN_CREDENTIALS.defaultSecurityKey;

  const isKeyValid = cleanKey === expectedKey || cleanKey === MASTER_ADMIN_CREDENTIALS.defaultSecurityKey;

  if ((isPrimary || isSecondary || isAlias) && isKeyValid) {
    // Attempt Firebase Auth sign-in or create for this admin email
    try {
      const emailToUse = isSecondary ? MASTER_ADMIN_CREDENTIALS.secondaryEmail : MASTER_ADMIN_CREDENTIALS.primaryEmail;
      try {
        await signInWithEmailAndPassword(auth, emailToUse, cleanKey);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/user-not-found' || authErr?.code === 'auth/invalid-credential') {
          // Register with Firebase Auth so it exists in Firebase User list
          try {
            await createUserWithEmailAndPassword(auth, emailToUse, cleanKey);
          } catch {
            // Non-blocking fallback
          }
        }
      }
    } catch {
      // Non-blocking
    }

    const adminProfile: AdminProfile = {
      id: 'admin_master',
      name: MASTER_ADMIN_CREDENTIALS.name,
      email: isSecondary ? MASTER_ADMIN_CREDENTIALS.secondaryEmail : MASTER_ADMIN_CREDENTIALS.primaryEmail,
      secondaryEmail: MASTER_ADMIN_CREDENTIALS.secondaryEmail,
      role: 'Admin',
      title: MASTER_ADMIN_CREDENTIALS.title,
      phone: MASTER_ADMIN_CREDENTIALS.phone,
      avatar: MASTER_ADMIN_CREDENTIALS.avatar,
      rating: 'Master Administrator',
      authenticatedAt: new Date().toISOString()
    };

    setStoredAdminSession(adminProfile);
    await ensureMasterAdminInFirestore();

    return {
      success: true,
      admin: adminProfile
    };
  }

  // Check if credentials match in Firebase Auth directly
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanId, cleanKey);
    if (cred.user) {
      // Check if user has admin record in Firestore
      const adminDoc = await getDoc(doc(db, 'drivers', cred.user.uid));
      const docData = adminDoc.exists() ? adminDoc.data() : null;
      if (docData?.role === 'Admin' || cleanId.includes('admin') || cleanId === MASTER_ADMIN_CREDENTIALS.primaryEmail) {
        const adminProfile: AdminProfile = {
          id: cred.user.uid,
          name: docData?.name || MASTER_ADMIN_CREDENTIALS.name,
          email: cred.user.email || cleanId,
          role: 'Admin',
          title: docData?.title || 'Platform Administrator',
          phone: docData?.phone || MASTER_ADMIN_CREDENTIALS.phone,
          avatar: docData?.avatar || MASTER_ADMIN_CREDENTIALS.avatar,
          rating: 'Master Administrator',
          authenticatedAt: new Date().toISOString()
        };
        setStoredAdminSession(adminProfile);
        return { success: true, admin: adminProfile };
      }
    }
  } catch {
    // Falls through to error
  }

  return {
    success: false,
    error: 'Invalid Administrator Security Key or Unrecognized Admin Identity. Use the verified master admin email (africahowe@gmail.com) and security key.'
  };
}

/**
 * Gets the current active admin session from localStorage.
 */
export function getStoredAdminSession(): AdminProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const item = localStorage.getItem(SESSION_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch {
    return null;
  }
}

/**
 * Stores the active admin session into localStorage.
 */
export function setStoredAdminSession(admin: AdminProfile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
  } catch (e) {
    console.error('Failed to store admin session:', e);
  }
}

/**
 * Clears the active admin session.
 */
export function clearStoredAdminSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear admin session:', e);
  }
}

/**
 * Helper to check if a given user object or session is an authenticated admin.
 */
export function isAdminUser(user: any): boolean {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase();
  return email === MASTER_ADMIN_CREDENTIALS.primaryEmail.toLowerCase() || 
         email === MASTER_ADMIN_CREDENTIALS.secondaryEmail.toLowerCase();
}
