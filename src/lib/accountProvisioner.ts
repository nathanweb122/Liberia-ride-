import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth, saveDriverToFirestore, deleteDriverFromFirestore } from './firebaseService';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { authenticateWithRoleGuard, PortalType } from './roleAccessSecurity';

export interface ProvisionAccountParams {
  name: string;
  role: 'Chauffeur' | 'Rider' | 'Kekeh';
  vehicleType: 'car' | 'bike' | 'kekeh';
  phone: string;
  password: string;
  email?: string;
  vehicle?: string;
  plate?: string;
  color?: string;
  station?: string;
  commissionRate?: number;
  avatar?: string;
  vehicleImage?: string;
}

export interface ProvisionedAccountResult {
  success: boolean;
  account?: any;
  error?: string;
  dispatchMemo?: string;
}

/**
 * Normalizes a phone number to standard digits for matching.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('231') && digits.length > 9) {
    digits = '0' + digits.substring(3);
  }
  return digits;
}

/**
 * Generates a clean internal email from phone/id if not provided.
 */
export function formatOperatorEmail(phoneOrId: string, role: string): string {
  const clean = phoneOrId.trim().replace(/[^a-zA-Z0-9]/g, '');
  return `${role.toLowerCase()}-${clean}@liberiaride.lr`;
}

/**
 * Returns role-appropriate default avatars.
 */
export function getDefaultAvatarForRole(role: string, vehicleType: string): string {
  if (role === 'Chauffeur') {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
  }
  if (role === 'Rider' || vehicleType === 'bike') {
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80';
  }
  if (role === 'Kekeh' || vehicleType === 'kekeh') {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';
  }
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
}

/**
 * Returns role-appropriate vehicle default images.
 */
export function getDefaultVehicleImage(role: string, vehicleType: string): string {
  if (role === 'Chauffeur' || vehicleType === 'car') {
    return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80';
  }
  if (role === 'Rider' || vehicleType === 'bike') {
    return 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png';
  }
  if (role === 'Kekeh' || vehicleType === 'kekeh') {
    return 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png';
  }
  return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80';
}

/**
 * Provisions a new driver, commercial rider, kekeh, or client account directly from the Admin Portal.
 * Creates Firebase Auth identity without signing out the current admin session, and persists complete
 * profile to Firestore.
 */
export async function provisionAccountByAdmin(params: ProvisionAccountParams): Promise<ProvisionedAccountResult> {
  const {
    name,
    role,
    vehicleType,
    phone,
    password,
    email: customEmail,
    vehicle,
    plate,
    color,
    station,
    commissionRate = 10,
    avatar
  } = params;

  if ((role as string) === 'Client' || (role as string) === 'client') {
    return { success: false, error: 'Administrators cannot create Client accounts. Clients create and manage their own accounts via the Client Sign-Up portal.' };
  }
  if (!name || !name.trim()) {
    return { success: false, error: 'Full Legal Name is required.' };
  }
  if (!phone || !phone.trim()) {
    return { success: false, error: 'Phone Number / Login ID is required.' };
  }
  if (!password || password.trim().length < 4) {
    return { success: false, error: 'Access Key or PIN must be at least 4 characters.' };
  }

  const cleanPhone = phone.trim();
  const operatorEmail = (customEmail && customEmail.trim()) 
    ? customEmail.trim().toLowerCase() 
    : formatOperatorEmail(cleanPhone, role);

  // Generate or obtain Firebase UID using a isolated secondary app instance to preserve Admin session
  let uid = '';
  const secondaryAppName = `Provisioner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, operatorEmail, password);
      uid = userCred.user.uid;
      await signOut(secondaryAuth);
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-in-use') {
        // Fallback UID generation if identity already in Auth
        uid = `fleet_${role.toLowerCase()}_${normalizePhoneNumber(cleanPhone)}_${Date.now().toString(36)}`;
      } else {
        uid = `fleet_${role.toLowerCase()}_${normalizePhoneNumber(cleanPhone)}_${Date.now().toString(36)}`;
      }
    }
  } catch (appErr) {
    console.warn('Isolated auth app notice:', appErr);
    uid = `fleet_${role.toLowerCase()}_${normalizePhoneNumber(cleanPhone)}_${Date.now().toString(36)}`;
  }

  const finalAvatar = avatar || getDefaultAvatarForRole(role, vehicleType);
  const defaultVehicleName = 
    role === 'Chauffeur' ? (vehicle || 'Toyota Prado Executive') :
    role === 'Kekeh' ? (vehicle || 'TVS King Tricycle') :
    role === 'Rider' ? (vehicle || 'Bajaj Boxer 150') :
    'Personal Vessel';

  const defaultPlate = plate && plate.trim() ? plate.trim().toUpperCase() : (
    role === 'Chauffeur' ? 'TX-' + Math.floor(1000 + Math.random() * 9000) :
    role === 'Kekeh' ? 'KK-' + Math.floor(1000 + Math.random() * 9000) :
    role === 'Rider' ? 'MB-' + Math.floor(1000 + Math.random() * 9000) :
    'CLI-' + Math.floor(100 + Math.random() * 900)
  );

  const vehicleImg = params.vehicleImage || getDefaultVehicleImage(role, vehicleType);

  const accountDoc = {
    id: uid,
    uid: uid,
    name: name.trim(),
    role: role, // 'Chauffeur', 'Rider', 'Kekeh', or 'Client'
    vehicleType: vehicleType, // 'car', 'bike', 'kekeh', or 'none'
    phone: cleanPhone,
    email: operatorEmail,
    password: password.trim(),
    pin: password.trim(),
    vehicle: defaultVehicleName,
    plate: defaultPlate,
    color: color || (role === 'Kekeh' ? 'Classic Yellow' : 'Executive Black'),
    station: station || 'Central Monrovia & Sinkor',
    commissionRate: commissionRate,
    commissionPaid: 0,
    rating: '5.00',
    status: 'Available',
    accountStatus: 'active',
    avatar: finalAvatar,
    vehicleImage: vehicleImg,
    image: vehicleImg,
    vehiclesList: [
      {
        id: `${vehicleType}-${Date.now()}`,
        name: defaultVehicleName,
        plate: defaultPlate,
        image: vehicleImg,
        active: true
      }
    ],
    isAdminCreated: true,
    createdBy: 'Platform Administrator (africahowe@gmail.com)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await saveDriverToFirestore(accountDoc);

    const dispatchMemo = 
`🇱🇷 LIBERIA RIDE OFFICIAL DISPATCH
=================================
Operator: ${accountDoc.name}
Role: ${accountDoc.role} (${accountDoc.vehicleType.toUpperCase()})
Vehicle: ${accountDoc.vehicle} [${accountDoc.plate}]
Operating Base: ${accountDoc.station}

OFFICIAL LOGIN CREDENTIALS:
Phone / Login ID: ${accountDoc.phone}
Access Key / PIN: ${accountDoc.password}

Login Portal: https://liberiaride.lr
Please keep your credentials safe. You are authorized to go online immediately.`;

    return {
      success: true,
      account: accountDoc,
      dispatchMemo
    };
  } catch (dbErr: any) {
    console.error('Firestore save failed:', dbErr);
    return {
      success: false,
      error: dbErr?.message || 'Failed to save account to database.'
    };
  }
}

/**
 * Permanently deletes any account created in the Admin Portal or registered in the fleet.
 * Removes the Firestore record, cleans local caches, and ensures full erasure.
 */
export async function deleteAccountPermanently(accountOrId: any): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = typeof accountOrId === 'string' ? accountOrId : (accountOrId?.id || accountOrId?.uid);
    if (!targetId) {
      return { success: false, error: 'Invalid account ID provided for deletion.' };
    }
    await deleteDriverFromFirestore(accountOrId);

    // Clean up local cache if applicable
    try {
      localStorage.removeItem(`obsidian_tier_${targetId}`);
    } catch {
      // ignore
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to permanently delete account:', err);
    return { success: false, error: err?.message || 'Database error occurred during account deletion.' };
  }
}

/**
 * Bulletproof authentication for Driver, Rider, Kekeh, and Client accounts.
 * Checks Firestore live collection and matches PIN/password directly, with fallback
 * to Firebase Auth.
 */
export async function authenticateOperator(
  identifier: string,
  passwordAttempt: string,
  liveDrivers: any[] = [],
  expectedPortal?: PortalType
): Promise<{ success: boolean; account?: any; error?: string }> {
  if (expectedPortal) {
    return authenticateWithRoleGuard(identifier, passwordAttempt, expectedPortal, liveDrivers);
  }

  if (!identifier || !identifier.trim()) {
    return { success: false, error: 'Phone Number, Registry ID, or Email is required.' };
  }
  if (!passwordAttempt || !passwordAttempt.trim()) {
    return { success: false, error: 'Password or Access PIN is required.' };
  }

  const raw = identifier.trim();
  const lower = raw.toLowerCase();
  const digits = normalizePhoneNumber(raw);
  const cleanPlate = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // Search liveDrivers first
  let match = liveDrivers.find((d: any) => {
    if (d.id === 'active_trip') return false;
    if (d.id && d.id.toLowerCase() === lower) return true;
    if (d.phone && d.phone.trim() === raw) return true;
    if (d.phone && normalizePhoneNumber(d.phone) === digits) return true;
    if (d.email && d.email.toLowerCase() === lower) return true;
    if (d.plate && d.plate.toLowerCase() === lower) return true;
    if (d.plate && d.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate) return true;
    return false;
  });

  // If not found in in-memory list, fetch from Firestore
  if (!match) {
    try {
      const snap = await getDocs(collection(db, 'drivers'));
      for (const docSnap of snap.docs) {
        if (docSnap.id === 'active_trip') continue;
        const d: any = docSnap.data();
        if (docSnap.id.toLowerCase() === lower ||
            (d.phone && normalizePhoneNumber(d.phone) === digits) ||
            (d.phone && d.phone.trim() === raw) ||
            (d.email && d.email.toLowerCase() === lower)) {
          match = { id: docSnap.id, ...d };
          break;
        }
      }
    } catch (e) {
      console.warn('Firestore fallback lookup notice:', e);
    }
  }

  if (match) {
    // Check credentials
    const storedPass = match.password || match.pin;
    const isPasswordValid = storedPass ? (storedPass === passwordAttempt.trim()) : true;

    if (!isPasswordValid) {
      // Attempt Firebase Auth sign-in to check if password matches Auth
      try {
        await signInWithEmailAndPassword(auth, match.email, passwordAttempt.trim());
      } catch {
        return {
          success: false,
          error: `Invalid Access PIN or Password for account "${match.name}". Please re-enter your credentials.`
        };
      }
    }

    // Check account status
    if (match.accountStatus === 'suspended') {
      return {
        success: false,
        error: `This account (${match.name}) has been suspended by Administration for policy compliance. Contact dispatch support.`
      };
    }

    return {
      success: true,
      account: match
    };
  }

  return {
    success: false,
    error: 'Unrecognized operator identity. Only administration-provisioned accounts can sign in. Contact your administrator.'
  };
}
