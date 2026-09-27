import React, { useState, useEffect } from 'react';
import { db, saveDriverToFirestore, deleteDriverFromFirestore, savePaymentToFirestore, listenToPayments } from '../lib/firebaseService';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { purgeAllAccountsFromFirestore } from '../lib/driverRoster';
import { GoogleSheetsSyncHub } from './GoogleSheetsSyncHub';
import { GmailDispatchHub } from './GmailDispatchHub';
import { GooglePickerHub } from './GooglePickerHub';
import { AdminAccountCreator } from './AdminAccountCreator';
import { AdminPhotoManagerModal } from './AdminPhotoManagerModal';
import { 
  authenticateAdmin, 
  getStoredAdminSession, 
  setStoredAdminSession, 
  clearStoredAdminSession, 
  isAdminUser, 
  MASTER_ADMIN_CREDENTIALS,
  ensureMasterAdminInFirestore,
  AdminProfile
} from '../lib/adminAuth';

interface ComplianceHubProps {
  driverProfile: any;
  onClose?: () => void;
}

/**
 * MomoPaymentHub Component
 * Allows Chauffeures and Riders to calculate commissions, pay, and report transactions.
 */
export const MomoPaymentHub = ({ driverProfile }: ComplianceHubProps) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'LRD'>('USD');
  const [referenceCode, setReferenceCode] = useState('');
  const [payerPhone, setPayerPhone] = useState(driverProfile.phone || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate commission figures
  const totalEarnings = driverProfile.earnings ?? (driverProfile.role === 'Chauffeur' ? 2450.00 : 452.20);
  const commissionPaid = driverProfile.commissionPaid ?? 0;
  const targetCommission = parseFloat((totalEarnings * 0.10).toFixed(2));
  const outstandingCommission = parseFloat(Math.max(0, targetCommission - commissionPaid).toFixed(2));

  // Listen to payments to filter submissions by this driver
  useEffect(() => {
    const unsub = listenToPayments((allPayments) => {
      const filtered = allPayments
        .filter((p: any) => p.driverId === driverProfile.id)
        .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setMyPayments(filtered);
    });
    return () => unsub();
  }, [driverProfile.id]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid transfer amount.' });
      return;
    }
    if (!referenceCode.trim()) {
      setStatusMsg({ type: 'error', text: 'Transaction Reference or ID is required.' });
      return;
    }
    if (!payerPhone.trim()) {
      setStatusMsg({ type: 'error', text: 'Payer MTN MoMo number is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentReport = {
        id: 'PAY-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
        driverId: driverProfile.id,
        driverName: driverProfile.name,
        driverRole: driverProfile.role || 'Partner',
        amount: parseFloat(amount),
        currency: currency,
        referenceCode: referenceCode.trim(),
        payerPhone: payerPhone.trim(),
        status: 'pending',
        notes: '',
        submittedAt: new Date().toISOString()
      };

      await savePaymentToFirestore(paymentReport);
      setStatusMsg({ 
        type: 'success', 
        text: `MTN Liberia Payment ID ${paymentReport.referenceCode} reported successfully! Under Admin Review.` 
      });
      setAmount('');
      setReferenceCode('');
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Submission failed due to server error. Please retry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border border-primary/20 rounded-xl relative overflow-hidden bg-black/40">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e9c349]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
          <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
          <div>
            <h4 className="font-cinzel text-xs text-primary uppercase tracking-widest font-bold">MTN Mobile Money Portal</h4>
            <h3 className="font-bodoni text-lg font-bold text-on-surface">10% Platform Compliance Policy</h3>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant opacity-80 leading-relaxed">
          Pursuant to Liberia Ride Elite partner terms, all drivers, riders, and delivery vehicles are obligatorily requested to dispatch 10% of total completed trip earnings directly to our administrative treasury using standard MTN Liberia MoMo.
        </p>

        {/* Ledger Balance Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60 font-bold">Accrued Lifetime Earnings</span>
            <span className="font-mono text-xl font-bold mt-1 text-on-surface">
              ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Total Commission Approved</span>
            <span className="font-mono text-xl font-bold mt-1 text-emerald-400">
              ${commissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className={`${outstandingCommission > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/5 border-green-500/15'} p-4 rounded-xl border flex flex-col justify-between`}>
            <span className="text-[10px] text-primary uppercase tracking-widest font-bold">Outstanding Balance Due (10%)</span>
            <span className="font-mono text-xl font-bold mt-1 text-primary flex items-center gap-1.5">
              <span>${outstandingCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {outstandingCommission > 0 && (
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </span>
          </div>
        </div>

        {/* Action instruction box */}
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3.5 items-start text-amber-200">
          <span className="material-symbols-outlined text-amber-400 shrink-0">info_outline</span>
          <div className="text-xs space-y-1.5">
            <p className="font-bold uppercase tracking-wider text-[10px] text-amber-300">MoMo Cash Transfer Target</p>
            <p className="leading-relaxed font-light">
              Send the outstanding commission amount to the website owner's official MTN Liberia phone number:
            </p>
            <p className="font-mono text-sm font-bold bg-black/40 px-3 py-1.5 rounded border border-white/5 w-fit select-all flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">phone_iphone</span>
              <span>0887510845</span>
            </p>
            <p className="opacity-80 italic">
              Once transferred, please complete the verification manifest below to report your payment Reference Reference Code.
            </p>
          </div>
        </div>
      </div>

      {/* Form and Submission layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-xl border border-white/5 space-y-4">
          <h4 className="font-cinzel text-[10px] text-primary uppercase tracking-widest font-bold border-b border-white/5 pb-2">Submit MoMo Receipt</h4>
          
          {statusMsg && (
            <div className={`p-4 rounded-lg text-xs leading-relaxed ${statusMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-200' : 'bg-red-500/10 border border-red-500/20 text-red-200'} animate-in fade-in slide-in-from-top-2 duration-300`}>
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold">Transfer Currency & Amount</label>
              <div className="flex gap-2">
                <select 
                  value={currency} 
                  onChange={(e: any) => setCurrency(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LRD">LRD (L$)</option>
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs opacity-55">
                    {currency === 'USD' ? '$' : 'L$'}
                  </span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-8 pr-4 focus:outline-none focus:border-primary text-xs font-mono text-white" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold">MoMo Transaction Reference / ID</label>
              <input 
                type="text" 
                required
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. 8820412893 or Ref Code" 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-xs font-mono text-white placeholder:opacity-40" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-[#8e8e8e] uppercase tracking-widest font-bold">Your MoMo Number (Payer Number)</label>
              <input 
                type="tel" 
                required
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="e.g. 088xxxxxxx" 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-primary text-xs font-mono text-white placeholder:opacity-40" 
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e9c349] text-[#0c0f0f] py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none mt-2 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-3 w-3 border-2 border-dashed border-[#0c0f0f] rounded-full animate-spin"></span>
                  <span>Reporting Receipt...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span>File Payment Statement</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="font-cinzel text-[10px] text-primary uppercase tracking-widest font-bold">My Filed Statements</h4>
            <span className="text-[9px] bg-white/5 text-on-surface border border-white/5 px-2 py-0.5 rounded font-mono">
              {myPayments.length} Filed
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {myPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-4xl block opacity-30 mb-2">history</span>
                No payment reports submitted yet. Accruing completed transactions will request compliance.
              </div>
            ) : (
              myPayments.map((pay: any, idx: number) => (
                <div key={pay.id ? `mypay-${pay.id}-${idx}` : `mypay-${idx}`} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-primary font-bold">{pay.referenceCode}</span>
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${
                      pay.status === 'approved' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : pay.status === 'rejected' 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>
                      {pay.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono py-2 border-y border-white/5">
                    <div>
                      <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-sans font-bold">Transfer Amount</p>
                      <p className="text-on-surface font-sans font-bold text-sm mt-0.5">
                        {pay.currency === 'USD' ? '$' : 'L$'}{pay.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-sans font-bold">Reporting MoMo #</p>
                      <p className="text-on-surface mt-0.5">{pay.payerPhone}</p>
                    </div>
                  </div>

                  {pay.notes && (
                    <div className="p-2 text-[11px] rounded bg-black/40 border border-white/5 text-[#d1d1d1] leading-relaxed">
                      <strong className="text-primary font-sans text-[9px] uppercase tracking-wider block mb-0.5">Admin Compliance Note</strong>
                      {pay.notes}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] text-[#8e8e8e]">
                    <span>Registry Ref: {pay.id}</span>
                    <span>{new Date(pay.submittedAt).toLocaleDateString()} {new Date(pay.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * AdminCompliancePanel Component
 * Main layout for the owner / platform administrator to review accounts & payments.
 */
export const AdminCompliancePanel = ({ 
  drivers, 
  onExit,
  onNavigate,
  currentUser,
  onAdminAuthSuccess,
  onAdminLogout
}: { 
  drivers: any[]; 
  onExit: () => void;
  onNavigate?: (screen: any, options?: any) => void;
  currentUser?: any;
  onAdminAuthSuccess?: (admin: any) => void;
  onAdminLogout?: () => void;
}) => {
  const storedSession = getStoredAdminSession();
  const [adminSession, setAdminSession] = useState<AdminProfile | null>(null);
  const [adminLoginEmail, setAdminLoginEmail] = useState(MASTER_ADMIN_CREDENTIALS.primaryEmail);
  const [adminLoginKey, setAdminLoginKey] = useState(MASTER_ADMIN_CREDENTIALS.defaultSecurityKey);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'create_account' | 'roster' | 'payments_feed' | 'workspace'>('create_account');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'chauffeur' | 'rider' | 'kekeh' | 'client'>('all');
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeInputText, setPurgeInputText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [selectedCredentialAccount, setSelectedCredentialAccount] = useState<any | null>(null);
  const [selectedPhotoAccount, setSelectedPhotoAccount] = useState<any | null>(null);
  const [copiedAccountPin, setCopiedAccountPin] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Ensure master admin doc on mount
  useEffect(() => {
    ensureMasterAdminInFirestore().catch(() => {});
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingAdmin(true);
    setAdminAuthError(null);
    try {
      const result = await authenticateAdmin(adminLoginEmail, adminLoginKey);
      if (result.success && result.admin) {
        setAdminSession(result.admin);
        if (onAdminAuthSuccess) onAdminAuthSuccess(result.admin);
        setToastMsg({ type: 'success', text: `Welcome, ${result.admin.name}. Administrator access confirmed.` });
      } else {
        setAdminAuthError(result.error || 'Authentication failed. Check credentials.');
      }
    } catch (err: any) {
      setAdminAuthError(err?.message || 'Verification error.');
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleAdminLogout = () => {
    clearStoredAdminSession();
    setAdminSession(null);
    if (onAdminLogout) onAdminLogout();
    setToastMsg({ type: 'info', text: 'Signed out of administrator command.' });
  };
  
  // Real-time listener for ALL payment reports
  useEffect(() => {
    const unsub = listenToPayments((all) => {
      setPayments(all.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    });
    return () => unsub();
  }, []);

  // Master Admin Account for the roster
  const masterAdminRecord = {
    id: 'admin_master',
    name: MASTER_ADMIN_CREDENTIALS.name,
    email: MASTER_ADMIN_CREDENTIALS.primaryEmail,
    role: 'Admin',
    vehicle: 'Platform Fleet Command',
    plate: 'ADM-001',
    phone: MASTER_ADMIN_CREDENTIALS.phone,
    rating: 'Master Administrator',
    accountStatus: 'active',
    avatar: MASTER_ADMIN_CREDENTIALS.avatar,
    password: MASTER_ADMIN_CREDENTIALS.defaultSecurityKey,
    pin: MASTER_ADMIN_CREDENTIALS.defaultSecurityKey,
    earnings: 0,
    commissionPaid: 0
  };

  // Filter accounts including master admin
  const rawFleet = (drivers || []).filter((d: any) => d.id !== 'active_trip' && d.id !== 'admin_master');
  const allAccounts = [masterAdminRecord, ...rawFleet];
  
  const adminCount = 1;
  const chauffeurCount = allAccounts.filter((d: any) => (d.role || '').toLowerCase() === 'chauffeur').length;
  const riderCount = allAccounts.filter((d: any) => {
    const r = (d.role || '').toLowerCase();
    const v = (d.vehicleType || '').toLowerCase();
    return r === 'rider' && v !== 'kekeh';
  }).length;
  const kekehCount = allAccounts.filter((d: any) => {
    const r = (d.role || '').toLowerCase();
    const v = (d.vehicleType || '').toLowerCase();
    return r === 'kekeh' || v === 'kekeh';
  }).length;
  const clientCount = allAccounts.filter((d: any) => (d.role || '').toLowerCase() === 'client').length;

  const displayAccounts = allAccounts.filter((d: any) => {
    if (roleFilter === 'all') return true;
    const r = (d.role || '').toLowerCase();
    const v = (d.vehicleType || '').toLowerCase();
    if (roleFilter === 'admin') return r === 'admin';
    if (roleFilter === 'kekeh') return r === 'kekeh' || v === 'kekeh';
    if (roleFilter === 'rider') return r === 'rider' && v !== 'kekeh';
    return r === roleFilter.toLowerCase();
  });

  // Handle Verify Action
  const handleVerifyPayment = async (pay: any) => {
    try {
      // Find associated driver's current record
      const associatedDriver = allAccounts.find((d: any) => d.id === pay.driverId);
      if (associatedDriver) {
        // Increment their verified compliant paid commissions
        const currentPaid = associatedDriver.commissionPaid || 0;
        const addAmount = pay.currency === 'LRD' ? pay.amount / 150.00 : pay.amount; // Simple currency mapping to USD balance conversion
        const updatedPaid = parseFloat((currentPaid + addAmount).toFixed(2));

        // Update driver's state
        const updatedDriver = {
          ...associatedDriver,
          commissionPaid: updatedPaid,
          // Auto-reactivate profile if they cleared outstanding dues and were on hold
          accountStatus: 'active' as const
        };
        await saveDriverToFirestore(updatedDriver);
      }

      // Mark payment approved
      const payRef = {
        ...pay,
        status: 'approved',
        notes: `System verified amount credit. Account fully cleared for deployment on ${new Date().toLocaleDateString()}.`
      };
      await savePaymentToFirestore(payRef);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Reject Click
  const handleRejectClick = (payId: string) => {
    setRejectId(payId);
    setRejectNotes('');
  };

  // Submit Rejection
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;

    try {
      const matchPayment = payments.find((p: any) => p.id === rejectId);
      if (matchPayment) {
        const updatedPayment = {
          ...matchPayment,
          status: 'rejected',
          notes: rejectNotes.trim() || 'Receipt mismatch. Please re-check the entered reference code or transfer amount.'
        };
        await savePaymentToFirestore(updatedPayment);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRejectId(null);
      setRejectNotes('');
    }
  };

  // Set Profile Status manually (e.g. hold, suspend, activate)
  const handleSetStatus = async (driver: any, nextStatus: 'active' | 'hold' | 'suspended') => {
    try {
      const updatedDriver = {
        ...driver,
        accountStatus: nextStatus
      };
      await saveDriverToFirestore(updatedDriver);
    } catch (err) {
      console.error(err);
    }
  };

  // Open delete confirmation modal for account
  const handleDeleteAccount = (account: any) => {
    setAccountToDelete(account);
  };

  // Permanently delete individual account from Firestore
  const handleConfirmDeleteAccount = async (accountToExecute?: any) => {
    const target = accountToExecute || accountToDelete;
    if (!target) return;
    const confirmName = target.name || target.phone || target.id;
    setIsDeletingAccount(true);
    setDeletingId(target.id);
    try {
      await deleteDriverFromFirestore(target);
      try {
        localStorage.removeItem(`obsidian_tier_${target.id}`);
      } catch {
        // ignore
      }
      setToastMsg({ 
        type: 'success', 
        text: `Account "${confirmName}" (${target.role || 'Operator'}) has been permanently deleted from the database.` 
      });
      setAccountToDelete(null);
    } catch (err: any) {
      setToastMsg({ 
        type: 'error', 
        text: `Failed to remove account: ${err?.message || 'Permission or network error'}` 
      });
    } finally {
      setIsDeletingAccount(false);
      setDeletingId(null);
    }
  };

  // Purge all accounts from Firestore
  const handlePurgeAllAccounts = async () => {
    if (purgeInputText.trim().toUpperCase() !== 'PURGE') {
      alert("Please type 'PURGE' in the box to confirm deletion.");
      return;
    }
    setIsPurging(true);
    try {
      const res = await purgeAllAccountsFromFirestore(true);
      setShowPurgeModal(false);
      setPurgeInputText('');
      setToastMsg({ 
        type: 'success', 
        text: `All accounts wiped successfully! Database is now empty and ready for real accounts (${res.count} deleted).` 
      });
    } catch (err: any) {
      setToastMsg({ type: 'error', text: `Failed to purge accounts: ${err?.message || 'Error occurred'}` });
    } finally {
      setIsPurging(false);
    }
  };

  // Filter pending payments
  const pendingCount = payments.filter((p: any) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0c0f0f] text-on-surface p-6 md:p-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] bg-red-500/5 rounded-full -top-1/4 -right-1/4 blur-[120px]"></div>
        <div className="absolute w-[600px] h-[600px] bg-amber-500/5 rounded-full -bottom-1/4 -left-1/4 blur-[100px]"></div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top duration-300 ${
          toastMsg.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' :
          toastMsg.type === 'error' ? 'bg-red-950/90 border-red-500/40 text-red-200' :
          'bg-neutral-900/90 border-white/20 text-white'
        }`}>
          <span className="material-symbols-outlined text-lg">
            {toastMsg.type === 'success' ? 'check_circle' : toastMsg.type === 'error' ? 'error' : 'info'}
          </span>
          <p className="text-xs font-medium">{toastMsg.text}</p>
          <button onClick={() => setToastMsg(null)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121414] border border-red-500/40 p-6 md:p-8 rounded-2xl w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <div>
                <h3 className="font-bodoni text-xl text-white font-bold">Remove All Accounts from Website</h3>
                <p className="text-xs text-red-400/80 uppercase tracking-wider font-mono font-bold">Irreversible Administrative Action</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              This will permanently delete all <span className="text-white font-bold">Chauffeur</span>, <span className="text-white font-bold">Rider</span>, and <span className="text-white font-bold">Passenger</span> accounts from the Firebase Firestore database and local storage. This allows you to start 100% clean with genuine, real-world user accounts.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-200 space-y-1">
              <p className="font-bold">Total accounts currently queued for deletion: {allAccounts.length}</p>
              <p className="text-[11px] opacity-80">• {chauffeurCount} Chauffeur(s) • {riderCount} Rider(s) • {clientCount} Client(s)</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#8e8e8e] uppercase tracking-wider font-bold block">
                Type <span className="text-white font-mono font-bold">PURGE</span> to confirm:
              </label>
              <input 
                type="text" 
                value={purgeInputText}
                onChange={(e) => setPurgeInputText(e.target.value)}
                placeholder="Type PURGE here"
                className="w-full bg-black/60 border border-red-500/30 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => { setShowPurgeModal(false); setPurgeInputText(''); }}
                disabled={isPurging}
                className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e8e] text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handlePurgeAllAccounts}
                disabled={isPurging || purgeInputText.trim().toUpperCase() !== 'PURGE'}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-red-950"
              >
                {isPurging ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>Wiping Database...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    <span>Confirm Wipe All Accounts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121414] border border-red-500/40 p-6 md:p-8 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl text-red-400">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bodoni text-xl text-white font-bold">Delete Account</h3>
                <p className="text-xs text-red-400/80 uppercase tracking-wider font-mono font-bold">Permanent Database Removal</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <img 
                src={accountToDelete.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                alt="Account" 
                className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{accountToDelete.name || accountToDelete.phone || accountToDelete.id}</h4>
                <p className="text-xs text-amber-400 font-mono mt-0.5">{accountToDelete.role || 'Operator'} • {accountToDelete.phone || accountToDelete.email || 'No Phone'}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{accountToDelete.vehicle || 'Standard'} • {accountToDelete.plate || 'No Plate'}</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete this account? The operator will no longer be able to log in, and all credentials, vehicle records, and history will be completely removed from the website database.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setAccountToDelete(null)}
                disabled={isDeletingAccount}
                className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => handleConfirmDeleteAccount(accountToDelete)}
                disabled={isDeletingAccount}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-red-950 cursor-pointer active:scale-95"
              >
                {isDeletingAccount ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header for Admin Login Portal */}
      {!adminSession && (
        <div className="max-w-7xl mx-auto flex justify-between items-center pb-6 mb-6 border-b border-white/10 relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            </div>
            <div>
              <span className="font-bodoni font-bold text-white text-base md:text-lg tracking-wide">LIBERIA RIDE ELITE</span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 block -mt-0.5">Fleet Administrator Login Portal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            <span>Public Website</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 animate-in fade-in duration-500">
        
        {!adminSession ? (
          /* Admin Security Gate & Login */
          <div className="max-w-md mx-auto my-6 p-7 md:p-8 glass-panel border border-amber-500/30 rounded-2xl shadow-2xl relative z-10 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-400/10">
                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-400 font-cinzel block">Liberia Ride Elite Fleet Command</span>
              <h2 className="text-2xl font-bodoni font-bold text-white">Administrator Login Portal</h2>
              <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed">
                Please log in with your Master Administrator credentials to monitor accounts, provision Drivers & Riders, and audit MoMo payments.
              </p>
            </div>

            {/* Quick Resume Session Banner if present */}
            {storedSession && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Saved Session Available</p>
                  <p className="text-xs text-white font-bold">{storedSession.name} ({storedSession.email})</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSession(storedSession);
                    if (onAdminAuthSuccess) onAdminAuthSuccess(storedSession);
                  }}
                  className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow"
                >
                  <span>Resume</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            )}

            {/* Master Admin Identity Card with 1-click Quick Autofill */}
            <div className="bg-amber-400/5 border border-amber-400/25 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">verified_user</span>
                  Verified Master Admin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminLoginEmail(MASTER_ADMIN_CREDENTIALS.primaryEmail);
                    setAdminLoginKey(MASTER_ADMIN_CREDENTIALS.defaultSecurityKey);
                  }}
                  className="text-[10px] font-bold text-black bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-md transition-all shadow-sm flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-xs">bolt</span>
                  <span>Autofill</span>
                </button>
              </div>
              <div className="space-y-1.5 font-mono text-[11px] text-gray-300 bg-black/50 p-2.5 rounded-lg border border-white/5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans text-[10px]">Admin Account:</span>
                  <span className="text-amber-200 font-semibold select-all">{MASTER_ADMIN_CREDENTIALS.primaryEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans text-[10px]">Security Key:</span>
                  <span className="text-white font-semibold select-all">{MASTER_ADMIN_CREDENTIALS.defaultSecurityKey}</span>
                </div>
              </div>
            </div>

            {adminAuthError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
                <p className="leading-snug">{adminAuthError}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-amber-400">mail</span>
                  Administrator Email / ID
                </label>
                <input
                  type="text"
                  required
                  value={adminLoginEmail}
                  onChange={(e) => setAdminLoginEmail(e.target.value)}
                  placeholder="africahowe@gmail.com"
                  className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-amber-400">lock</span>
                    Master Security Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    className="text-[10px] text-gray-400 hover:text-white"
                  >
                    {showAdminKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showAdminKey ? "text" : "password"}
                  required
                  value={adminLoginKey}
                  onChange={(e) => setAdminLoginKey(e.target.value)}
                  placeholder="Enter admin security key"
                  className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingAdmin}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingAdmin ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>Verifying Admin Credentials...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>Sign In as Administrator</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onExit}
                className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-semibold cursor-pointer"
              >
                ← Return to Landing Page
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Authenticated Admin Header */}
            <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-white/10 pb-6 mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-xs text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                    Platform Fleet Command
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                    ONLINE • SECURE LINK
                  </span>
                </div>
                <h1 className="text-3xl font-bodoni font-bold text-on-surface">Liberia Ride Elite Admin Portal</h1>
                <p className="text-xs text-on-surface-variant opacity-60">Provision Drivers, Riders & Kekeh operators, audit MoMo transfers, and monitor the live fleet registry.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Active Admin Identity Badge */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
                  <img 
                    src={adminSession.avatar || MASTER_ADMIN_CREDENTIALS.avatar} 
                    alt="Admin" 
                    className="w-8 h-8 rounded-full border border-amber-400/40 object-cover" 
                  />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white leading-tight">{adminSession.name || 'Africa Howe'}</span>
                      <span className="text-[8px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-400/30 uppercase">ADMIN</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block leading-tight">{adminSession.email}</span>
                  </div>
                </div>

                <button 
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white tracking-wider uppercase font-bold text-[10px] transition-all cursor-pointer"
                  title="Sign out of Admin Portal"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>Sign Out</span>
                </button>

                <button 
                  onClick={() => setShowPurgeModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 tracking-wider uppercase font-bold text-[10px] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  <span>Purge Accounts</span>
                </button>

                <button 
                  onClick={onExit}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-on-surface tracking-wider uppercase font-bold text-[10px] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">home</span>
                  <span>Main Site</span>
                </button>
              </div>
            </header>

        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row gap-3 border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveSubTab('create_account')}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 ${activeSubTab === 'create_account' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>Provision Account (Driver, Rider, Kekeh)</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('roster')}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 ${activeSubTab === 'roster' ? 'bg-primary text-[#0c0f0f]' : 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            <span>Fleet & Account Directory ({allAccounts.length})</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('payments_feed')}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 relative ${activeSubTab === 'payments_feed' ? 'bg-primary text-[#0c0f0f]' : 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>MoMo Transfers Review</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 sm:-top-1.5 -right-1 sm:-right-1.5 h-5 w-5 bg-red-500 text-white flex items-center justify-center rounded-full text-[9px] font-bold border border-background animate-bounce">
                {pendingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('workspace')}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 ${activeSubTab === 'workspace' ? 'bg-primary text-[#0c0f0f]' : 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">cloud_sync</span>
            <span>Google Workspace Center</span>
          </button>
        </div>

        {/* Subtabs content */}
        {activeSubTab === 'create_account' && (
          <div className="space-y-6">
            <AdminAccountCreator 
              onAccountCreated={(acc) => {
                setToastMsg({ type: 'success', text: `Account for ${acc.name} (${acc.role}) has been provisioned and saved!` });
              }}
              onViewRoster={() => setActiveSubTab('roster')}
              accounts={rawFleet}
              onDeleteAccount={handleConfirmDeleteAccount}
            />
          </div>
        )}

        {activeSubTab === 'roster' && (
          <div className="space-y-6">
            
            {/* Guide Card: How to Add Real Accounts */}
            <div className="bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-cinzel">
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                    <span>Admin Centralized Account Provisioning</span>
                  </div>
                  <h3 className="font-bodoni text-lg text-white font-bold">Admin-Only Fleet & Account Control</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    To maintain strict security and accountability, public user sign-ups have been disabled. All Driver, Rider, and Kekeh accounts are provisioned exclusively through this Admin Portal.
                  </p>
                </div>

                {/* Action button */}
                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <button 
                    onClick={() => setActiveSubTab('create_account')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    <span>+ Provision New Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and Management Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              {/* Role filter buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-[#8e8e8e] uppercase tracking-wider font-bold mr-1">Filter:</span>
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'all' ? 'bg-primary text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  All ({allAccounts.length})
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'admin' ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-extrabold' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  Admin ({adminCount})
                </button>
                <button
                  onClick={() => setRoleFilter('chauffeur')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'chauffeur' ? 'bg-amber-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  Chauffeurs ({chauffeurCount})
                </button>
                <button
                  onClick={() => setRoleFilter('rider')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'rider' ? 'bg-sky-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  Riders ({riderCount})
                </button>
                <button
                  onClick={() => setRoleFilter('kekeh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'kekeh' ? 'bg-emerald-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  Kekehs ({kekehCount})
                </button>
                <button
                  onClick={() => setRoleFilter('client')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    roleFilter === 'client' ? 'bg-violet-400 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  Passengers ({clientCount})
                </button>
              </div>

              {/* Purge button */}
              <button
                onClick={() => setShowPurgeModal(true)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                <span>Purge / Reset All Accounts</span>
              </button>
            </div>

            {/* Master Administrator Account Showcase Card */}
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent border border-amber-400/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img 
                      src={MASTER_ADMIN_CREDENTIALS.avatar} 
                      alt="Africa Howe" 
                      className="w-14 h-14 rounded-2xl border-2 border-amber-400 object-cover shadow-lg"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" title="System Online"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bodoni text-lg font-bold text-white">{MASTER_ADMIN_CREDENTIALS.name}</h4>
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider">
                        PLATFORM MASTER ADMINISTRATOR
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 font-mono mt-0.5 select-all">{MASTER_ADMIN_CREDENTIALS.primaryEmail}</p>
                    <p className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono">Tel: {MASTER_ADMIN_CREDENTIALS.phone}</span>
                      <span>•</span>
                      <span>Security Authority: Driver & Fleet Provisioning, MoMo Audit & Approvals</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => setSelectedCredentialAccount(masterAdminRecord)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">key</span>
                    <span>Admin Credentials</span>
                  </button>
                  <button
                    onClick={() => setRoleFilter('admin')}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    <span>Filter Admin</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Account Grid Table */}
            <div className="glass-panel rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bodoni text-lg font-bold text-on-surface">Registered Accounts Directory</h3>
                <p className="text-xs text-on-surface-variant opacity-60 font-sans">Review accounts, adjust statuses, or delete unwanted profiles individually.</p>
              </div>

              {displayAccounts.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <span className="material-symbols-outlined text-4xl text-primary/60">person_off</span>
                  <h4 className="font-bodoni text-base font-bold text-white">No accounts found in this category</h4>
                  <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                    All old accounts have been removed. Click one of the buttons above to register your first real Chauffeur, Rider, or Passenger account!
                  </p>
                  {onNavigate && (
                    <div className="flex justify-center gap-3 pt-2">
                      <button 
                        onClick={() => onNavigate('chauffeur')}
                        className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold uppercase tracking-wider"
                      >
                        Register Chauffeur
                      </button>
                      <button 
                        onClick={() => onNavigate('rider')}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider"
                      >
                        Register Rider
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-on-surface border-collapse">
                      <thead className="bg-white/5 font-cinzel text-[10px] uppercase tracking-wider text-primary border-b border-white/5">
                        <tr>
                          <th className="py-4 px-6">Account / Name</th>
                          <th className="py-4 px-6">Role / Tel</th>
                          <th className="py-4 px-6">Lifetime Revenue</th>
                          <th className="py-4 px-6">Paid (Approved)</th>
                          <th className="py-4 px-6">Outstanding (10%)</th>
                          <th className="py-4 px-6">Account Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {displayAccounts.map((driver: any, idx: number) => {
                          const isClient = (driver.role || '').toLowerCase() === 'client';
                          const isAdmin = (driver.role || '').toLowerCase() === 'admin' || driver.id === 'admin_master';
                          const isMasterAdmin = driver.id === 'admin_master' || (driver.role === 'Admin' && driver.email === 'africahowe@gmail.com');
                          const totalEarnings = driver.earnings ?? (driver.role === 'Chauffeur' ? 2450.00 : 452.20);
                          const commPaid = driver.commissionPaid ?? 0;
                          const due = parseFloat((totalEarnings * 0.10).toFixed(2));
                          const outstanding = parseFloat(Math.max(0, due - commPaid).toFixed(2));
                          const currentStatus = driver.accountStatus || 'active';

                          return (
                            <tr key={driver.id ? `desktop-acc-${driver.id}-${idx}` : `desktop-acc-${idx}`} className={`hover:bg-white/[0.02] transition-colors ${isAdmin ? 'bg-amber-500/5' : ''}`}>
                              <td className="py-4 px-6 flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={driver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                                    alt="Avatar" 
                                    className={`w-9 h-9 rounded-full object-cover border ${isAdmin ? 'border-amber-400' : 'border-white/10'}`} 
                                    referrerPolicy="no-referrer" 
                                  />
                                  {!isAdmin && !isClient && (driver.vehicleImage || driver.vehiclesList?.[0]?.image || driver.image) && (
                                    <div 
                                      onClick={() => setSelectedPhotoAccount(driver)}
                                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md overflow-hidden bg-black border border-amber-400/70 p-0.5 shadow cursor-pointer hover:scale-110 transition-transform" 
                                      title="Assigned vehicle shown to client - Click to update"
                                    >
                                      <img 
                                        src={driver.vehicleImage || driver.vehiclesList?.[0]?.image || driver.image} 
                                        alt="Vehicle" 
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-sm text-on-surface leading-tight">{driver.name || driver.id}</p>
                                    {isAdmin && (
                                      <span className="text-[8px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded uppercase">Master</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#8e8e8e] mt-0.5 font-mono">
                                    {driver.vehicle ? `${driver.vehicle} (${driver.plate || 'No Plate'})` : driver.email || 'Registered User'}
                                  </p>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <p className={`font-sans font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded w-fit ${
                                  isAdmin ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/5 text-on-surface'
                                }`}>
                                  {driver.role || 'Passenger'}
                                </p>
                                <p className="font-mono text-[#8e8e8e] mt-0.5">{driver.phone || driver.email || '—'}</p>
                              </td>
                              <td className="py-4 px-6 font-mono text-sm font-bold text-on-surface">
                                {isAdmin ? (
                                  <span className="text-amber-300 text-xs">Master Authority</span>
                                ) : isClient ? (
                                  '—'
                                ) : (
                                  `$${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                )}
                              </td>
                              <td className="py-4 px-6 font-mono text-sm text-emerald-400 font-medium">
                                {isAdmin ? (
                                  <span className="text-emerald-400 text-xs">Verified Active</span>
                                ) : isClient ? (
                                  '—'
                                ) : (
                                  `$${commPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                )}
                              </td>
                              <td className="py-4 px-6 font-mono text-sm py-4">
                                {isAdmin ? (
                                  <span className="text-gray-400 text-xs font-sans">Full Access</span>
                                ) : isClient ? (
                                  <span className="text-[#8e8e8e]">Passenger</span>
                                ) : (
                                  <span className={`font-bold ${outstanding > 0 ? 'text-primary' : 'text-[#8e8e8e]'}`}>
                                    ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-sans font-extrabold uppercase tracking-widest border px-2.5 py-1 rounded ${
                                  isAdmin 
                                    ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                                    : currentStatus === 'active' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : currentStatus === 'hold' 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' 
                                    : 'bg-red-500/10 border-red-500/20 text-red-400 font-black'
                                }`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                  <span>{isAdmin ? 'Master Admin' : currentStatus}</span>
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedCredentialAccount(driver)}
                                  className="bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all inline-flex items-center gap-1 cursor-pointer"
                                  title="View and copy login credentials"
                                >
                                  <span className="material-symbols-outlined text-xs">key</span>
                                  <span>Credentials</span>
                                </button>
                                {!isAdmin && !isClient && (
                                  <button
                                    onClick={() => setSelectedPhotoAccount(driver)}
                                    className="bg-sky-400/15 border border-sky-400/30 text-sky-300 hover:bg-sky-400/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Upload and update account holder face & vehicle photo (car/bike/kekeh)"
                                  >
                                    <span className="material-symbols-outlined text-xs">photo_camera</span>
                                    <span>Photos</span>
                                  </button>
                                )}
                                {!isAdmin && !isClient && currentStatus !== 'active' && (
                                  <button 
                                    onClick={() => handleSetStatus(driver, 'active')}
                                    className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                  >
                                    Activate
                                  </button>
                                )}
                                {!isAdmin && !isClient && currentStatus !== 'hold' && (
                                  <button 
                                    onClick={() => handleSetStatus(driver, 'hold')}
                                    className="bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                  >
                                    Put Hold
                                  </button>
                                )}
                                {!isAdmin && !isClient && currentStatus !== 'suspended' && (
                                  <button 
                                    onClick={() => handleSetStatus(driver, 'suspended')}
                                    className="bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                  >
                                    Take Down
                                  </button>
                                )}
                                {/* Delete Single Account (prevented only on Master Admin) */}
                                {!isMasterAdmin && (
                                  <button
                                    onClick={() => handleDeleteAccount(driver)}
                                    disabled={deletingId === driver.id}
                                    title="Permanently remove this account from database"
                                    className="bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    {deletingId === driver.id ? (
                                      <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-xs">delete</span>
                                    )}
                                    <span>Delete</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards List */}
                  <div className="block md:hidden divide-y divide-white/10">
                    {displayAccounts.map((driver: any, idx: number) => {
                      const isClient = (driver.role || '').toLowerCase() === 'client';
                      const isAdmin = (driver.role || '').toLowerCase() === 'admin' || driver.id === 'admin_master';
                      const isMasterAdmin = driver.id === 'admin_master' || (driver.role === 'Admin' && driver.email === 'africahowe@gmail.com');
                      const totalEarnings = driver.earnings ?? (driver.role === 'Chauffeur' ? 2450.00 : 452.20);
                      const commPaid = driver.commissionPaid ?? 0;
                      const due = parseFloat((totalEarnings * 0.10).toFixed(2));
                      const outstanding = parseFloat(Math.max(0, due - commPaid).toFixed(2));
                      const currentStatus = driver.accountStatus || 'active';

                      return (
                        <div key={driver.id ? `mobile-acc-${driver.id}-${idx}` : `mobile-acc-${idx}`} className={`p-4 space-y-4 ${isAdmin ? 'bg-amber-500/5' : ''}`}>
                          <div className="flex items-center gap-3">
                            <img 
                              src={driver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                              alt="Avatar" 
                              className={`w-10 h-10 rounded-full object-cover border shrink-0 ${isAdmin ? 'border-amber-400' : 'border-white/10'}`} 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm text-on-surface truncate leading-tight">{driver.name || driver.id}</p>
                                {isAdmin && (
                                  <span className="text-[8px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0">Admin</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#8e8e8e] truncate mt-0.5 font-mono">
                                {driver.vehicle ? `${driver.vehicle} (${driver.plate || 'No Plate'})` : driver.email || 'Registered User'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[8px] font-sans font-extrabold uppercase tracking-widest border px-2 py-0.5 rounded shrink-0 ${
                              isAdmin
                                ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                                : currentStatus === 'active' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : currentStatus === 'hold' 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' 
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              {isAdmin ? 'Master' : currentStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-mono py-3 border-y border-white/5 bg-white/[0.01] px-3 rounded-lg">
                            <div className="space-y-1">
                              <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-sans font-bold">Role / Tel</p>
                              <p className="text-on-surface font-sans font-bold leading-none">{driver.role || 'Passenger'}</p>
                              <p className="text-[10px] text-on-surface-variant leading-none">{driver.phone || driver.email || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-sans font-bold">Outstanding (10%)</p>
                              {isAdmin ? (
                                <p className="text-xs text-amber-300 font-sans font-bold">Full Authority</p>
                              ) : isClient ? (
                                <p className="text-xs text-[#8e8e8e] font-sans">Client Account</p>
                              ) : (
                                <>
                                  <p className={`text-sm font-bold leading-none ${outstanding > 0 ? 'text-primary' : 'text-[#8e8e8e]'}`}>
                                    ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-[9px] text-on-surface-variant opacity-60 leading-none">of ${totalEarnings.toLocaleString('en-US')}</p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setSelectedCredentialAccount(driver)}
                              className="flex-1 min-w-[70px] bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">key</span>
                              <span>PIN / Key</span>
                            </button>
                            {!isAdmin && !isClient && (
                              <button 
                                onClick={() => setSelectedPhotoAccount(driver)}
                                className="flex-1 min-w-[70px] bg-sky-400/15 border border-sky-400/30 text-sky-300 hover:bg-sky-400/25 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">photo_camera</span>
                                <span>Photos</span>
                              </button>
                            )}
                            {!isAdmin && !isClient && currentStatus !== 'active' && (
                              <button 
                                onClick={() => handleSetStatus(driver, 'active')}
                                className="flex-1 min-w-[70px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {!isAdmin && !isClient && currentStatus !== 'hold' && (
                              <button 
                                onClick={() => handleSetStatus(driver, 'hold')}
                                className="flex-1 min-w-[70px] bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center cursor-pointer"
                              >
                                Put Hold
                              </button>
                            )}
                            {!isMasterAdmin && (
                              <button 
                                onClick={() => handleDeleteAccount(driver)}
                                disabled={deletingId === driver.id}
                                className="flex-1 min-w-[70px] bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">delete</span>
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'payments_feed' && (
          <div className="space-y-6">
            {/* Rejection Modal overlay dialog */}
            {rejectId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <form onSubmit={handleRejectSubmit} className="bg-[#0e0e0e] border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4">
                  <h4 className="font-cinzel text-xs text-primary uppercase tracking-widest font-bold">Declare Compliance Failure</h4>
                  <h3 className="font-bodoni text-lg text-on-surface font-bold">Why is this transfer record rejected?</h3>
                  
                  <textarea 
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    required
                    placeholder="Provide reasoning (e.g., MoMo transaction ID mismatch, cash did not arrive in system balance)..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white h-24 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                  />

                  <div className="flex justify-end gap-3 text-xs uppercase font-bold tracking-widest">
                    <button 
                      type="button" 
                      onClick={() => setRejectId(null)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e8e]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-red-500 hover:brightness-110 text-white font-bold"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="glass-panel rounded-xl overflow-hidden border border-white/10 shadow-2xl p-6">
              <h3 className="font-bodoni text-lg font-bold text-on-surface border-b border-white/5 pb-3 mb-6">Submitted Mobile Money Logs Review</h3>
              
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="py-20 text-center text-xs text-on-surface-variant opacity-60">
                    <span className="material-symbols-outlined text-5xl block opacity-30 mb-2">payments</span>
                    MTN Liberia transaction logs roster is empty. No statements have been filed by riders yet.
                  </div>
                ) : (
                  payments.map((p: any, idx: number) => (
                    <div key={p.id ? `pay-${p.id}-${idx}` : `pay-${idx}`} className="bg-white/5 border border-white/5 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:border-white/10 transition-colors">
                      
                      {/* Left: Driver and state */}
                      <div className="md:col-span-3 flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0 bg-primary/10 p-2 rounded-full">receipt_long</span>
                        <div>
                          <p className="font-bold text-sm text-on-surface leading-tight">{p.driverName}</p>
                          <span className="text-[9px] uppercase font-bold font-sans tracking-widest bg-white/5 px-2 py-0.5 rounded text-[#cbd5e1]">{p.driverRole}</span>
                          <span className="block text-[10px] text-on-surface opacity-55 mt-1 font-mono">ID: {(p.driverId || '').substring(0, 8)}...</span>
                        </div>
                      </div>

                      {/* Middle values */}
                      <div className="md:col-span-5 grid grid-cols-3 gap-2 border-y md:border-y-0 md:border-x border-white/5 py-4 md:py-0 md:px-6">
                        <div>
                          <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-bold">Receipt Value</p>
                          <p className="text-sm font-bold mt-1 text-on-surface font-mono">
                            {p.currency === 'USD' ? '$' : 'L$'}{p.amount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-bold">Transaction ID</p>
                          <p className="text-xs font-mono font-bold text-primary mt-1 select-all">{p.referenceCode}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-[#8e8e8e] uppercase tracking-widest font-bold">Sender MoMo #</p>
                          <p className="text-xs font-mono mt-1 font-bold text-on-surface">{p.payerPhone}</p>
                        </div>
                      </div>

                      {/* Right feedback or actions */}
                      <div className="md:col-span-4 flex flex-col items-start md:items-end justify-center space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] uppercase font-sans font-extrabold tracking-widest border px-3 py-1 rounded ${
                            p.status === 'approved' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : p.status === 'rejected' 
                              ? 'bg-red-500/10 border-red-500/20 text-red-400 font-bold animate-pulse' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                          }`}>
                            {p.status}
                          </span>
                          <span className="text-[9px] opacity-45 font-mono">{new Date(p.submittedAt).toLocaleDateString()}</span>
                        </div>

                        {p.status === 'pending' ? (
                          <div className="flex gap-2 w-full pt-1.5">
                            <button 
                              onClick={() => handleVerifyPayment(p)}
                              className="flex-1 bg-emerald-500 text-[#0c0f0f] hover:brightness-110 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center"
                            >
                              Verify Transfer
                            </button>
                            <button 
                              onClick={() => handleRejectClick(p.id)}
                              className="flex-1 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center"
                            >
                              Reject Code
                            </button>
                          </div>
                        ) : p.notes ? (
                          <p className="text-[10px] text-on-surface-variant opacity-75 font-serif italic text-left md:text-right max-w-xs">{p.notes}</p>
                        ) : null}
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'workspace' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <GoogleSheetsSyncHub currentUser={{ name: 'Admin africahowe', email: 'africahowe@gmail.com', rating: 'System Admin' }} drivers={drivers} />
            <GooglePickerHub currentUser={{ name: 'Admin africahowe', email: 'africahowe@gmail.com', rating: 'System Admin' }} drivers={drivers} />
            <GmailDispatchHub currentUser={{ name: 'Admin africahowe', email: 'africahowe@gmail.com', rating: 'System Admin' }} drivers={drivers} />
          </div>
        )}

        {/* Operator Credentials Details Modal */}
        {selectedCredentialAccount && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#141717] border border-amber-400/40 rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => { setSelectedCredentialAccount(null); setCopiedAccountPin(false); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-4">
                <img 
                  src={selectedCredentialAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt={selectedCredentialAccount.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-amber-400/30 shrink-0"
                />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    {selectedCredentialAccount.role === 'Admin' ? 'Master Platform Authority' : 'Official Fleet Identity'}
                  </span>
                  <h3 className="text-xl font-bodoni font-bold text-white leading-tight">
                    {selectedCredentialAccount.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedCredentialAccount.role} • {selectedCredentialAccount.role === 'Admin' ? 'Supreme Platform Controller' : `${selectedCredentialAccount.vehicle || 'Standard'} (${selectedCredentialAccount.plate || 'No Plate'})`}
                  </p>
                </div>
              </div>

              {/* Credential Block */}
              <div className="bg-black/60 rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-[11px] font-sans">
                    {selectedCredentialAccount.role === 'Admin' ? 'Admin Login Email:' : 'Login Phone / Registry ID:'}
                  </span>
                  <span className="text-white font-bold text-sm select-all">
                    {selectedCredentialAccount.email || selectedCredentialAccount.phone || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-[11px] font-sans">
                    {selectedCredentialAccount.role === 'Admin' ? 'Master Security Key:' : 'Access Key / PIN:'}
                  </span>
                  <span className="text-amber-400 font-bold text-base px-2 py-0.5 bg-white/5 rounded select-all font-mono">
                    {selectedCredentialAccount.password || selectedCredentialAccount.pin || (selectedCredentialAccount.role === 'Admin' ? MASTER_ADMIN_CREDENTIALS.defaultSecurityKey : '1234')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400 text-[11px] font-sans">Assigned Corridor:</span>
                  <span className="text-gray-200 text-xs truncate max-w-[200px]">
                    {selectedCredentialAccount.role === 'Admin' ? 'Global Fleet Command (All Districts)' : (selectedCredentialAccount.station || 'Central Monrovia')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px] font-sans">Account Status:</span>
                  <span className="uppercase text-[10px] font-bold text-emerald-400">
                    {selectedCredentialAccount.role === 'Admin' ? 'ACTIVE (MASTER CONTROLLER)' : (selectedCredentialAccount.accountStatus || 'active')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const pin = selectedCredentialAccount.password || selectedCredentialAccount.pin || (selectedCredentialAccount.role === 'Admin' ? MASTER_ADMIN_CREDENTIALS.defaultSecurityKey : '1234');
                    const memo = selectedCredentialAccount.role === 'Admin'
                      ? `Liberia Ride Elite Master Administrator Credentials:\nAccount: ${selectedCredentialAccount.name}\nAdmin Email: ${selectedCredentialAccount.email}\nMaster Security Key: ${pin}\nAuthority: Super Administrator`
                      : `Liberia Ride Official Login Credentials:\nOperator: ${selectedCredentialAccount.name}\nPhone: ${selectedCredentialAccount.phone}\nAccess PIN: ${pin}\nVehicle: ${selectedCredentialAccount.vehicle || ''} (${selectedCredentialAccount.plate || ''})`;
                    navigator.clipboard.writeText(memo);
                    setCopiedAccountPin(true);
                    setTimeout(() => setCopiedAccountPin(false), 2500);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">{copiedAccountPin ? 'done' : 'content_copy'}</span>
                  <span>{copiedAccountPin ? 'Credentials Copied to Clipboard!' : 'Copy Login Credentials'}</span>
                </button>

                {selectedCredentialAccount.phone && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${selectedCredentialAccount.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Liberia Ride Official Credentials:\nOperator: ${selectedCredentialAccount.name}\nPhone/Login: ${selectedCredentialAccount.phone || selectedCredentialAccount.email}\nPIN: ${selectedCredentialAccount.password || selectedCredentialAccount.pin || '1234'}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Send via WhatsApp</span>
                  </a>
                )}

                {selectedCredentialAccount.id !== 'admin_master' && (
                  <button
                    type="button"
                    onClick={() => {
                      const acc = selectedCredentialAccount;
                      setSelectedCredentialAccount(null);
                      setAccountToDelete(acc);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Delete This Account Permanently</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Operator Photo & Vessel Asset Management Modal */}
        {selectedPhotoAccount && (
          <AdminPhotoManagerModal
            account={selectedPhotoAccount}
            onClose={() => setSelectedPhotoAccount(null)}
            onUpdated={(updated) => {
              setToastMsg({ 
                type: 'success', 
                text: `Successfully updated photos and vessel specs for ${updated.name}! Clients will see these visuals immediately.` 
              });
              setTimeout(() => setToastMsg(null), 4500);
            }}
          />
        )}
          </>
        )}

      </div>
    </div>
  );
};
