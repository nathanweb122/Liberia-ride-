import { db, auth } from './firebaseService';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { normalizePhoneNumber } from './accountProvisioner';
import { PRODUCTION_DRIVERS } from './driverRoster';

export type PortalType = 'chauffeur' | 'rider_bike' | 'rider_kekeh' | 'client' | 'admin';

export interface RoleClassification {
  exactRole: 'Chauffeur' | 'Rider' | 'Kekeh' | 'Client' | 'Admin';
  vehicleType: 'car' | 'bike' | 'kekeh' | 'none';
  isCarDriver: boolean;
  isBikeRider: boolean;
  isKekehOperator: boolean;
  isClient: boolean;
  isAdmin: boolean;
  roleTitle: string;
  allowedPortal: PortalType;
  allowedPortalName: string;
}

/**
 * Classifies an account record with absolute certainty into its official archetype.
 */
export function classifyAccount(account: any): RoleClassification {
  if (!account) {
    return {
      exactRole: 'Client',
      vehicleType: 'none',
      isCarDriver: false,
      isBikeRider: false,
      isKekehOperator: false,
      isClient: true,
      isAdmin: false,
      roleTitle: 'Passenger / Client',
      allowedPortal: 'client',
      allowedPortalName: 'Passenger Client Portal'
    };
  }

  const roleRaw = (account.role || '').toString().trim().toLowerCase();
  const vTypeRaw = (account.vehicleType || '').toString().trim().toLowerCase();
  const vehicleName = (account.vehicle || '').toString().trim().toLowerCase();
  const plate = (account.plate || '').toString().trim().toUpperCase();
  const email = (account.email || '').toString().trim().toLowerCase();

  // 1. Master Administrator Check
  if (
    roleRaw === 'admin' ||
    account.id === 'admin_master' ||
    email === 'africahowe@gmail.com' ||
    email === 'admin@liberiaride.com' ||
    (account.rating && account.rating.toString().toLowerCase().includes('master admin'))
  ) {
    return {
      exactRole: 'Admin',
      vehicleType: 'none',
      isCarDriver: false,
      isBikeRider: false,
      isKekehOperator: false,
      isClient: false,
      isAdmin: true,
      roleTitle: 'Master Fleet Administrator',
      allowedPortal: 'admin',
      allowedPortalName: 'Fleet Command & Admin Portal'
    };
  }

  // 2. Kekeh Operator Check (Tricycle / Kekeh)
  if (
    roleRaw === 'kekeh' ||
    vTypeRaw === 'kekeh' ||
    vehicleName.includes('kekeh') ||
    vehicleName.includes('tricycle') ||
    vehicleName.includes('tvs king') ||
    plate.startsWith('KK-') ||
    plate.startsWith('KK')
  ) {
    return {
      exactRole: 'Kekeh',
      vehicleType: 'kekeh',
      isCarDriver: false,
      isBikeRider: false,
      isKekehOperator: true,
      isClient: false,
      isAdmin: false,
      roleTitle: 'Kekeh Executive Operator',
      allowedPortal: 'rider_kekeh',
      allowedPortalName: 'Kekeh Executive Portal'
    };
  }

  // 3. Car Driver (Chauffeur) Check
  if (
    roleRaw === 'chauffeur' ||
    vTypeRaw === 'car' ||
    (roleRaw === 'driver' && vTypeRaw !== 'bike' && vTypeRaw !== 'kekeh') ||
    vehicleName.includes('prado') ||
    vehicleName.includes('mercedes') ||
    vehicleName.includes('cadillac') ||
    vehicleName.includes('sedan') ||
    vehicleName.includes('suv') ||
    plate.startsWith('TX-')
  ) {
    return {
      exactRole: 'Chauffeur',
      vehicleType: 'car',
      isCarDriver: true,
      isBikeRider: false,
      isKekehOperator: false,
      isClient: false,
      isAdmin: false,
      roleTitle: 'Executive Chauffeur (Car Driver)',
      allowedPortal: 'chauffeur',
      allowedPortalName: 'Executive Chauffeur Portal'
    };
  }

  // 4. Commercial Motorbike Rider Check
  if (
    roleRaw === 'rider' ||
    vTypeRaw === 'bike' ||
    vehicleName.includes('bike') ||
    vehicleName.includes('bajaj') ||
    vehicleName.includes('boxer') ||
    plate.startsWith('MB-')
  ) {
    return {
      exactRole: 'Rider',
      vehicleType: 'bike',
      isCarDriver: false,
      isBikeRider: true,
      isKekehOperator: false,
      isClient: false,
      isAdmin: false,
      roleTitle: 'Luxury Bike Express Rider',
      allowedPortal: 'rider_bike',
      allowedPortalName: 'Luxury Bike Express Portal'
    };
  }

  // 5. Client / Passenger
  return {
    exactRole: 'Client',
    vehicleType: 'none',
    isCarDriver: false,
    isBikeRider: false,
    isKekehOperator: false,
    isClient: true,
    isAdmin: false,
    roleTitle: 'Passenger Client',
    allowedPortal: 'client',
    allowedPortalName: 'Passenger Client Portal'
  };
}

/**
 * Strict role-isolation verification.
 * Guarantees that accounts created for one role can NEVER log into another.
 */
export function verifyStrictPortalAccess(
  account: any,
  requestedPortal: PortalType
): { allowed: boolean; error?: string; targetPortal?: PortalType } {
  const classification = classifyAccount(account);
  const accountName = account.name || 'User';

  // Compliance Status Check
  const status = (account.accountStatus || account.status || '').toLowerCase();
  if (status === 'suspended') {
    return {
      allowed: false,
      error: `Access Blocked: Account "${accountName}" is currently suspended by Fleet Administration for policy compliance. Contact dispatch support.`
    };
  }
  if (status === 'hold') {
    return {
      allowed: false,
      error: `Access Blocked: Account "${accountName}" is currently on administrative hold pending document re-verification.`
    };
  }

  // Strict role matching
  switch (requestedPortal) {
    case 'chauffeur': {
      if (classification.isCarDriver) {
        return { allowed: true };
      }
      if (classification.isBikeRider) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Commercial Motorbike Rider. You cannot log into the Car Driver Portal. A rider account can ONLY log in through the Bike Express Portal.`,
          targetPortal: 'rider_bike'
        };
      }
      if (classification.isKekehOperator) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Kekeh Operator. You cannot log into the Car Driver Portal. A kekeh account can ONLY log in through the Kekeh Portal.`,
          targetPortal: 'rider_kekeh'
        };
      }
      if (classification.isClient) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" is registered as a Passenger/Client. You cannot access the Chauffeur Driver Portal.`,
          targetPortal: 'client'
        };
      }
      if (classification.isAdmin) {
        return {
          allowed: false,
          error: `Security Notice: Master Administrator account detected. Please sign in via the Administrator Command Portal.`,
          targetPortal: 'admin'
        };
      }
      return {
        allowed: false,
        error: `Access Denied: Only authorized Car Chauffeur accounts can log into this portal.`
      };
    }

    case 'rider_bike': {
      if (classification.isBikeRider) {
        return { allowed: true };
      }
      if (classification.isCarDriver) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Car Driver (Chauffeur). You cannot log into the Motorbike Rider portal. A car driver account can ONLY log into the Driver Portal.`,
          targetPortal: 'chauffeur'
        };
      }
      if (classification.isKekehOperator) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Kekeh Operator. You cannot log into the Motorbike Rider portal. Please switch to the Kekeh Executive tab.`,
          targetPortal: 'rider_kekeh'
        };
      }
      if (classification.isClient) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" is registered as a Passenger/Client. You cannot access the Rider Portal.`,
          targetPortal: 'client'
        };
      }
      if (classification.isAdmin) {
        return {
          allowed: false,
          error: `Security Notice: Master Administrator account detected. Please sign in via the Administrator Command Portal.`,
          targetPortal: 'admin'
        };
      }
      return {
        allowed: false,
        error: `Access Denied: Only authorized Commercial Motorbike Riders can log into this portal.`
      };
    }

    case 'rider_kekeh': {
      if (classification.isKekehOperator) {
        return { allowed: true };
      }
      if (classification.isCarDriver) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Car Driver (Chauffeur). You cannot log into the Kekeh portal. A car driver account can ONLY log into the Driver Portal.`,
          targetPortal: 'chauffeur'
        };
      }
      if (classification.isBikeRider) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as a Motorbike Rider. You cannot log into the Kekeh portal. Please switch to the Bike Express tab.`,
          targetPortal: 'rider_bike'
        };
      }
      if (classification.isClient) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" is registered as a Passenger/Client. You cannot access the Kekeh Portal.`,
          targetPortal: 'client'
        };
      }
      if (classification.isAdmin) {
        return {
          allowed: false,
          error: `Security Notice: Master Administrator account detected. Please sign in via the Administrator Command Portal.`,
          targetPortal: 'admin'
        };
      }
      return {
        allowed: false,
        error: `Access Denied: Only authorized Kekeh Operators can log into this portal.`
      };
    }

    case 'client': {
      if (classification.isCarDriver) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as an Official Car Driver (Chauffeur). Drivers cannot log into the Passenger Client Portal. Please use the Chauffeur Portal.`,
          targetPortal: 'chauffeur'
        };
      }
      if (classification.isBikeRider) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as an Official Motorbike Rider. Riders cannot log into the Passenger Client Portal. Please use the Rider Portal.`,
          targetPortal: 'rider_bike'
        };
      }
      if (classification.isKekehOperator) {
        return {
          allowed: false,
          error: `Security Restriction: Account "${accountName}" was created as an Official Kekeh Operator. Operators cannot log into the Passenger Client Portal. Please use the Kekeh Portal.`,
          targetPortal: 'rider_kekeh'
        };
      }
      if (classification.isAdmin) {
        return {
          allowed: false,
          error: `Security Notice: Master Administrator account detected. Please use the Administrator Portal.`,
          targetPortal: 'admin'
        };
      }
      return { allowed: true };
    }

    case 'admin': {
      if (classification.isAdmin) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `Security Restriction: Access Denied. Account "${accountName}" is registered as ${classification.roleTitle}. Only Master Fleet Administrators can access Fleet Command.`
      };
    }
  }
}

/**
 * Searches and retrieves an account by identifier (phone, email, plate, ID, or name)
 * Checks in-memory live drivers, production roster, and queries Firestore directly.
 */
export async function findAccountByIdentifier(
  identifier: string,
  liveDrivers: any[] = []
): Promise<any | null> {
  if (!identifier || !identifier.trim()) return null;

  const raw = identifier.trim();
  const lower = raw.toLowerCase();
  const digits = normalizePhoneNumber(raw);
  const cleanPlate = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // 1. Search in-memory live drivers
  const matchInLive = liveDrivers.find((d: any) => {
    if (!d || d.id === 'active_trip') return false;
    if (d.id && d.id.toLowerCase() === lower) return true;
    if (d.email && d.email.toLowerCase() === lower) return true;
    if (d.phone && d.phone.trim() === raw) return true;
    if (d.phone && digits && normalizePhoneNumber(d.phone) === digits) return true;
    if (d.plate && d.plate.toLowerCase() === lower) return true;
    if (d.plate && cleanPlate && d.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate) return true;
    return false;
  });

  if (matchInLive) return matchInLive;

  // 2. Search production driver roster
  const matchInProduction = PRODUCTION_DRIVERS.find((d: any) => {
    if (d.id && d.id.toLowerCase() === lower) return true;
    if (d.phone && (d.phone.trim() === raw || (digits && normalizePhoneNumber(d.phone) === digits))) return true;
    if (d.plate && d.plate.toLowerCase() === lower) return true;
    return false;
  });

  if (matchInProduction) return matchInProduction;

  // 3. Fallback: Direct Firestore Query across 'drivers' collection
  try {
    const snap = await getDocs(collection(db, 'drivers'));
    for (const docSnap of snap.docs) {
      if (docSnap.id === 'active_trip') continue;
      const d: any = docSnap.data();
      if (
        docSnap.id.toLowerCase() === lower ||
        (d.id && d.id.toLowerCase() === lower) ||
        (d.email && d.email.toLowerCase() === lower) ||
        (d.phone && d.phone.trim() === raw) ||
        (d.phone && digits && normalizePhoneNumber(d.phone) === digits) ||
        (d.plate && d.plate.toLowerCase() === lower) ||
        (d.plate && cleanPlate && d.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate)
      ) {
        return { id: docSnap.id, ...d };
      }
    }
  } catch (err) {
    console.warn('Direct Firestore account lookup notice:', err);
  }

  return null;
}

/**
 * Master authentication and role-guard function.
 * Validates credentials, checks admin creation, and enforces strict role portal locking.
 */
export async function authenticateWithRoleGuard(
  identifier: string,
  passwordAttempt: string,
  targetPortal: PortalType,
  liveDrivers: any[] = []
): Promise<{ success: boolean; account?: any; error?: string; classification?: RoleClassification }> {
  if (!identifier || !identifier.trim()) {
    return { success: false, error: 'Please enter your Phone Number, Registry ID, or Email.' };
  }
  if (!passwordAttempt || !passwordAttempt.trim()) {
    return { success: false, error: 'Please enter your Password or Access Key.' };
  }

  const account = await findAccountByIdentifier(identifier, liveDrivers);

  // If no account found in the official roster
  if (!account) {
    if (targetPortal === 'chauffeur') {
      return {
        success: false,
        error: `Access Denied: No authorized chauffeur account found matching "${identifier}". Chauffeur accounts must be officially created and provisioned by the Fleet Administrator.`
      };
    }
    if (targetPortal === 'rider_bike') {
      return {
        success: false,
        error: `Access Denied: No authorized motorbike rider account found matching "${identifier}". Rider accounts must be officially created and provisioned by the Fleet Administrator.`
      };
    }
    if (targetPortal === 'rider_kekeh') {
      return {
        success: false,
        error: `Access Denied: No authorized kekeh operator account found matching "${identifier}". Kekeh accounts must be officially created and provisioned by the Fleet Administrator.`
      };
    }
    if (targetPortal === 'admin') {
      return {
        success: false,
        error: `Access Denied: Unrecognized administrator credentials. Master Administrator authorization required.`
      };
    }

    return {
      success: false,
      error: `No account found matching "${identifier}". Please check your details or register a new client account.`
    };
  }

  // 1. STRICT ROLE ACCESS CHECK: Does this account belong to the requested portal?
  const portalCheck = verifyStrictPortalAccess(account, targetPortal);
  if (!portalCheck.allowed) {
    return {
      success: false,
      error: portalCheck.error || 'Access Denied: Unauthorized portal access.'
    };
  }

  // 2. CREDENTIAL VERIFICATION: Check password / PIN
  const cleanAttempt = passwordAttempt.trim();
  const storedPassword = (account.password || '').toString().trim();
  const storedPin = (account.pin || '').toString().trim();

  let isPasswordCorrect = false;
  if (storedPassword && storedPassword === cleanAttempt) {
    isPasswordCorrect = true;
  } else if (storedPin && storedPin === cleanAttempt) {
    isPasswordCorrect = true;
  }

  // Secondary verification via Firebase Auth if direct stored password didn't match
  if (!isPasswordCorrect && account.email) {
    try {
      await signInWithEmailAndPassword(auth, account.email, cleanAttempt);
      isPasswordCorrect = true;
    } catch {
      isPasswordCorrect = false;
    }
  }

  if (!isPasswordCorrect) {
    return {
      success: false,
      error: `Invalid Access Key or PIN for account "${account.name}". Please check your credentials.`
    };
  }

  const classification = classifyAccount(account);

  return {
    success: true,
    account: account,
    classification: classification
  };
}
