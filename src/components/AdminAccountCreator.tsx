import React, { useState, useRef } from 'react';
import { 
  provisionAccountByAdmin, 
  deleteAccountPermanently,
  ProvisionAccountParams, 
  getDefaultAvatarForRole, 
  getDefaultVehicleImage 
} from '../lib/accountProvisioner';
import { processImageFile } from '../lib/imageUtils';

interface AdminAccountCreatorProps {
  onAccountCreated?: (account: any) => void;
  onViewRoster?: () => void;
  accounts?: any[];
  onDeleteAccount?: (account: any) => Promise<void> | void;
}

const VEHICLE_PRESETS = {
  Chauffeur: [
    { name: 'Toyota Prado TXL (SUV)', platePrefix: 'TX' },
    { name: 'Mercedes-Benz E-Class', platePrefix: 'BP' },
    { name: 'Toyota Land Cruiser V8', platePrefix: 'TX' },
    { name: 'Hyundai Sonata Executive', platePrefix: 'TX' },
    { name: 'Toyota Camry Sedan', platePrefix: 'TX' }
  ],
  Rider: [
    { name: 'Bajaj Boxer BM 150', platePrefix: 'MB' },
    { name: 'TVS Star HLX 125', platePrefix: 'MB' },
    { name: 'Yamaha Crux 110', platePrefix: 'MB' },
    { name: 'Haojue 125 Express', platePrefix: 'MB' }
  ],
  Kekeh: [
    { name: 'TVS King Deluxe Tricycle', platePrefix: 'KK' },
    { name: 'Piaggio Ape City Plus Kekeh', platePrefix: 'KK' },
    { name: 'Bajaj RE 4S Commercial Kekeh', platePrefix: 'KK' },
    { name: 'Mahindra Alfa Passenger Kekeh', platePrefix: 'KK' }
  ]
};

const STATIONS = [
  'Central Monrovia & Sinkor (1st - 24th Street)',
  'Paynesville & Red Light Commercial Hub',
  'Bushrod Island, Duala Market & Freeport Corridor',
  'Congo Town, Oldest Congo Town & ELWA Junction',
  'Brewerville & St. Paul River Corridor',
  'Gardnersville & Somalia Drive',
  'Robertsfield Highway & Airport Transit'
];

export const AdminAccountCreator: React.FC<AdminAccountCreatorProps> = ({
  onAccountCreated,
  onViewRoster,
  accounts = [],
  onDeleteAccount
}) => {
  const [selectedRole, setSelectedRole] = useState<'Chauffeur' | 'Rider' | 'Kekeh'>('Chauffeur');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicle, setVehicle] = useState('Toyota Prado TXL (SUV)');
  const [plate, setPlate] = useState('TX-' + Math.floor(1000 + Math.random() * 9000));
  const [color, setColor] = useState('Executive Black');
  const [station, setStation] = useState(STATIONS[0]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ account: any; dispatchMemo: string } | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<any | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [creatorToast, setCreatorToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo upload states
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [customVehicleImage, setCustomVehicleImage] = useState<string | null>(null);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isProcessingVehicle, setIsProcessingVehicle] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  // Switch role and update default vehicle and plate
  const handleRoleChange = (role: 'Chauffeur' | 'Rider' | 'Kekeh') => {
    setSelectedRole(role);
    setErrorMsg(null);
    const presets = VEHICLE_PRESETS[role];
    if (presets && presets.length > 0) {
      setVehicle(presets[0].name);
      setPlate(`${presets[0].platePrefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    if (role === 'Kekeh') {
      setColor('Classic Commercial Yellow');
    } else if (role === 'Rider') {
      setColor('Signal Red');
    } else {
      setColor('Executive Black');
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingAvatar(true);
      setErrorMsg(null);
      const compressed = await processImageFile(file, 300, 300, 0.75);
      setCustomAvatar(compressed);
    } catch (err) {
      console.error('Error processing avatar:', err);
      setErrorMsg('Failed to process image file. Please try another image.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleVehicleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingVehicle(true);
      setErrorMsg(null);
      const compressed = await processImageFile(file, 600, 400, 0.8);
      setCustomVehicleImage(compressed);
    } catch (err) {
      console.error('Error processing vehicle image:', err);
      setErrorMsg('Failed to process vehicle image. Please try another image.');
    } finally {
      setIsProcessingVehicle(false);
    }
  };

  const handleGeneratePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setPassword(pin);
  };

  const handleGeneratePlate = () => {
    const prefix = selectedRole === 'Kekeh' ? 'KK' : selectedRole === 'Rider' ? 'MB' : 'TX';
    setPlate(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const vehicleType = 
      selectedRole === 'Chauffeur' ? 'car' :
      selectedRole === 'Rider' ? 'bike' : 'kekeh';

    const params: ProvisionAccountParams = {
      name,
      role: selectedRole,
      vehicleType,
      phone,
      password,
      vehicle,
      plate,
      color,
      station,
      commissionRate,
      avatar: customAvatar || undefined,
      vehicleImage: customVehicleImage || undefined
    };

    try {
      const res = await provisionAccountByAdmin(params);
      if (res.success && res.account) {
        setSuccessResult({
          account: res.account,
          dispatchMemo: res.dispatchMemo || ''
        });
        if (onAccountCreated) {
          onAccountCreated(res.account);
        }
      } else {
        setErrorMsg(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to communicate with provisioning service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!successResult?.dispatchMemo) return;
    navigator.clipboard.writeText(successResult.dispatchMemo).then(() => {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 3000);
    });
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPassword('');
    setCustomAvatar(null);
    setCustomVehicleImage(null);
    setSuccessResult(null);
    setErrorMsg(null);
    handleRoleChange(selectedRole);
  };

  const handleExecuteDeleteAccount = async (targetAccount: any) => {
    if (!targetAccount) return;
    setIsDeletingAccount(true);
    try {
      const res = await deleteAccountPermanently(targetAccount);
      if (res.success) {
        if (onDeleteAccount) {
          await onDeleteAccount(targetAccount);
        }
        if (successResult?.account?.id === targetAccount.id || successResult?.account?.phone === targetAccount.phone) {
          resetForm();
        }
        setDeleteConfirmAccount(null);
        setCreatorToast({
          type: 'success',
          text: `Account "${targetAccount.name || targetAccount.phone}" (${targetAccount.role || 'Operator'}) was successfully deleted from the database.`
        });
        setTimeout(() => setCreatorToast(null), 4500);
      } else {
        setCreatorToast({
          type: 'error',
          text: res.error || 'Failed to delete account. Please try again.'
        });
      }
    } catch (err: any) {
      setCreatorToast({
        type: 'error',
        text: err?.message || 'Error occurred while deleting account.'
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const createdFleetAccounts = (accounts || []).filter(
    (a: any) => a.id !== 'admin_master' && a.id !== 'active_trip'
  );

  return (
    <div className="space-y-6 relative">
      {/* Local Notification Toast */}
      {creatorToast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-xl animate-in slide-in-from-top duration-300 ${
          creatorToast.type === 'success' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300' : 'bg-red-950 border-red-500/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {creatorToast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{creatorToast.text}</span>
          </div>
          <button onClick={() => setCreatorToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      {/* Title banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-white/[0.02] to-transparent border border-amber-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest font-cinzel">
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              <span>Exclusive Administrative Fleet Provisioning</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bodoni font-bold text-white">Create Official Fleet & Operator Account</h2>
            <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed opacity-80">
              Only platform administration can register and activate accounts for <span className="text-white font-semibold">Drivers (Chauffeurs)</span>, <span className="text-white font-semibold">Commercial Motorbike Riders</span>, and <span className="text-white font-semibold">Commercial Kekehs (Tricycles)</span>. Strangers cannot register themselves.
            </p>
          </div>
          {onViewRoster && (
            <button
              onClick={onViewRoster}
              className="self-start md:self-center px-4 py-2.5 rounded-xl border border-white/10 hover:border-amber-400/50 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-sm">list_alt</span>
              <span>View Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successResult && (
        <div className="p-6 md:p-8 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/50 text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Registration Verified</span>
              <h3 className="text-2xl font-bodoni font-bold text-white">
                Account Successfully Provisioned for {successResult.account.name}!
              </h3>
              <p className="text-xs text-emerald-200/80 font-sans">
                The operator profile has been created in Firebase Firestore. They can immediately log into the website using their credentials.
              </p>
            </div>
          </div>

          {/* Credentials Display Card */}
          <div className="bg-black/60 rounded-xl p-5 border border-emerald-500/30 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-sans">Assigned Role</span>
                <span className="text-emerald-300 font-bold text-sm">{successResult.account.role} ({successResult.account.vehicleType})</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-sans">Login Phone / ID</span>
                <span className="text-white font-bold text-sm">{successResult.account.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-sans">Access Key / PIN</span>
                <span className="text-amber-400 font-bold text-sm bg-white/5 px-2 py-0.5 rounded">{successResult.account.password}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block font-sans">Vessel / Plate</span>
                <span className="text-white font-bold text-sm">{successResult.account.plate}</span>
              </div>
            </div>

            {/* Client-Facing Photos Verified */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
              <span className="text-[11px] text-gray-300 flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-emerald-400 text-sm">visibility</span>
                Client Visuals Activated:
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-400/50 bg-black">
                    <img 
                      src={successResult.account.avatar} 
                      alt="Operator" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] text-gray-300">Face Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-8 rounded-lg overflow-hidden border border-emerald-400/50 bg-black p-0.5">
                    <img 
                      src={successResult.account.vehicleImage || successResult.account.vehiclesList?.[0]?.image || successResult.account.image} 
                      alt="Vehicle" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] text-gray-300">Vehicle Shown to Clients</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">{copiedMemo ? 'done' : 'content_copy'}</span>
              <span>{copiedMemo ? 'Copied to Clipboard!' : 'Copy Dispatch Credentials Memo'}</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?phone=${successResult.account.phone.replace(/\D/g, '')}&text=${encodeURIComponent(successResult.dispatchMemo)}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Send Credentials via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => setDeleteConfirmAccount(successResult.account)}
              className="px-5 py-3 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-white border border-red-500/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              title="Permanently delete this account from database"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span>Delete This Account</span>
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ml-auto"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Provision Another Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-amber-400 block mb-3 font-cinzel">
            Step 1: Select Operator Fleet Category (Driver, Rider, or Kekeh)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { role: 'Chauffeur', label: 'Executive Driver', icon: 'directions_car', sub: 'Luxury Sedan & SUV Chauffeur' },
              { role: 'Rider', label: 'Commercial Rider', icon: 'two_wheeler', sub: 'Motorbike & Express Courier' },
              { role: 'Kekeh', label: 'Commercial Kekeh', icon: 'electric_rickshaw', sub: '3-Wheel Passenger/Cargo' }
            ].map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => handleRoleChange(item.role as any)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  selectedRole === item.role
                    ? 'border-amber-400 bg-amber-400/10 text-white shadow-lg shadow-amber-400/5'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="material-symbols-outlined text-2xl text-amber-400">{item.icon}</span>
                  {selectedRole === item.role && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{item.label}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Client Self-Registration Policy Card */}
          <div className="mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-200/90">
            <span className="material-symbols-outlined text-blue-400 text-lg shrink-0 mt-0.5">info</span>
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-bold text-blue-300 uppercase tracking-wider text-[10px]">Client / Passenger Account Policy</p>
              <p className="text-[11px] text-gray-300">
                Platform administrators only create accounts for <strong className="text-white font-semibold">Drivers</strong>, <strong className="text-white font-semibold">Motorbike Riders</strong>, and <strong className="text-white font-semibold">Kekeh Operators</strong>. Clients and passengers create and manage their own accounts through the public Client Sign-Up portal.
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400 text-lg">error</span>
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Account Details Form */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-widest font-bold text-amber-400 block font-cinzel">
              Step 2: Enter Operator Identity & Access Credentials
            </label>
            <span className="text-[11px] text-gray-400 font-mono">Role: <strong className="text-white">{selectedRole}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Full Legal Name *</span>
                <span className="text-[10px] text-gray-500">e.g., Momo Kesselly</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter operator's official name"
                className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Phone Number / Login ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Phone Number / Login ID *</span>
                <span className="text-[10px] text-gray-500">Lonestar / Orange Liberia</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 0770123456 or 0881234567"
                className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Password / Access PIN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300">Access Key / Login PIN *</label>
                <button
                  type="button"
                  onClick={handleGeneratePin}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-bold underline"
                >
                  🎲 Generate 4-Digit PIN
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. 7741 or Password"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl pl-4 pr-12 py-3 text-sm text-white font-mono focus:outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  <span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500">Provide this PIN to the operator. They will enter it to log in.</p>
            </div>

            {/* Operating Corridor / Base */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Primary Operating Corridor</label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
              >
                {STATIONS.map((st) => (
                  <option key={st} value={st} className="bg-[#121414] text-white">{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest font-bold text-amber-400 block font-cinzel">
                Step 3: Vessel & Fleet Specifications ({selectedRole})
              </label>
              <div className="flex gap-2">
                {(VEHICLE_PRESETS[selectedRole] || []).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setVehicle(p.name);
                      setPlate(`${p.platePrefix}-${Math.floor(1000 + Math.random() * 9000)}`);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-amber-400/20 text-gray-300 hover:text-white border border-white/10 transition-all"
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vehicle Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Vehicle Model / Description</label>
                <input
                  type="text"
                  required
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. TVS King Kekeh / Toyota Prado"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                />
              </div>

              {/* License Plate Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">License Plate / Reg #</label>
                  <button
                    type="button"
                    onClick={handleGeneratePlate}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                  >
                    🎲 Generate Plate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="e.g., KK-4819 or TX-2910"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase focus:outline-none transition-all"
                />
              </div>

              {/* Exterior Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Exterior Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g., Commercial Yellow or Black"
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Account Holder & Vehicle Photo Uploads */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-amber-400 block font-cinzel">
                  Step 4: Upload Account Holder & Vehicle Photos
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Clients and passengers will see these photos on their screen when this operator is matched or picking them up.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-300/80 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20 w-fit">
                Client Visibility Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Account Holder Face Portrait */}
              <div className="bg-black/40 border border-white/10 hover:border-amber-400/30 rounded-2xl p-5 space-y-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">face</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Account Holder Portrait</h4>
                  </div>
                  {customAvatar ? (
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                      Custom Uploaded
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded">
                      Standard Preset
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-black/60 shrink-0 shadow-lg group">
                    <img 
                      src={customAvatar || getDefaultAvatarForRole(selectedRole, selectedRole === 'Chauffeur' ? 'car' : selectedRole === 'Rider' ? 'bike' : 'kekeh')} 
                      alt="Account Holder" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isProcessingAvatar && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-400 animate-spin text-xl">progress_activity</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <p className="text-xs text-gray-300 leading-snug">
                      Upload an official face photo or ID portrait of the account holder.
                    </p>

                    <input 
                      type="file" 
                      ref={avatarInputRef}
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isProcessingAvatar}
                        className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">add_a_photo</span>
                        <span>{customAvatar ? 'Change Photo' : 'Upload Face Photo'}</span>
                      </button>

                      {customAvatar && (
                        <button
                          type="button"
                          onClick={() => setCustomAvatar(null)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Vehicle Photo (Car, Bike, or Kekeh) */}
              <div className="bg-black/40 border border-white/10 hover:border-amber-400/30 rounded-2xl p-5 space-y-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">
                      {selectedRole === 'Chauffeur' ? 'directions_car' : selectedRole === 'Rider' ? 'two_wheeler' : 'electric_rickshaw'}
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Vehicle Photo ({selectedRole === 'Chauffeur' ? 'Car / SUV' : selectedRole === 'Rider' ? 'Motorbike' : 'Kekeh'})
                    </h4>
                  </div>
                  {customVehicleImage ? (
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                      Custom Uploaded
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded">
                      Standard Preset
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-32 h-24 rounded-2xl overflow-hidden border border-amber-400/30 bg-black/60 shrink-0 p-1 flex items-center justify-center shadow-lg">
                    <img 
                      src={customVehicleImage || getDefaultVehicleImage(selectedRole, selectedRole === 'Chauffeur' ? 'car' : selectedRole === 'Rider' ? 'bike' : 'kekeh')} 
                      alt="Vehicle" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    {isProcessingVehicle && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-400 animate-spin text-xl">progress_activity</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full">
                    <p className="text-xs text-gray-300 leading-snug">
                      Upload the exact photo of the {selectedRole === 'Chauffeur' ? 'car' : selectedRole === 'Rider' ? 'bike' : 'kekeh'} so the client knows what vehicle is picking them up.
                    </p>

                    <input 
                      type="file" 
                      ref={vehicleInputRef}
                      accept="image/*"
                      onChange={handleVehicleFile}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => vehicleInputRef.current?.click()}
                        disabled={isProcessingVehicle}
                        className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">upload</span>
                        <span>{customVehicleImage ? 'Change Vehicle Photo' : `Upload ${selectedRole === 'Chauffeur' ? 'Car' : selectedRole === 'Rider' ? 'Bike' : 'Kekeh'} Photo`}</span>
                      </button>

                      {customVehicleImage && (
                        <button
                          type="button"
                          onClick={() => setCustomVehicleImage(null)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Compliance & Submit */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-gray-400 space-y-0.5">
              <span className="text-amber-400 font-bold block">10% Platform Commission Policy:</span>
              <span className="opacity-80">This account will be activated with 10% cash commission reporting via MTN MoMo 0887510845.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                  <span>Provisioning Account in Firestore...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  <span>Create & Provision {selectedRole}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Admin Created Accounts Quick Management List */}
      {createdFleetAccounts.length > 0 && (
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h3 className="font-bodoni text-lg text-white font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-xl">manage_accounts</span>
                <span>Active Accounts Created in Admin Portal ({createdFleetAccounts.length})</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Review, copy credentials, or permanently delete any driver, rider, or kekeh operator account created here.
              </p>
            </div>
            {onViewRoster && (
              <button
                type="button"
                onClick={onViewRoster}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Full Fleet Directory</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdFleetAccounts.map((acc: any) => {
              return (
                <div 
                  key={acc.id || acc.phone}
                  className="bg-black/50 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={acc.avatar || getDefaultAvatarForRole(acc.role, acc.vehicleType)} 
                        alt={acc.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{acc.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            acc.role === 'Chauffeur' ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' :
                            acc.role === 'Rider' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' :
                            'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                          }`}>
                            {acc.role}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono truncate">{acc.plate || 'No Plate'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                      {acc.accountStatus || 'active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[9px] text-gray-400 font-sans block">Phone / ID:</span>
                      <span className="text-white font-bold select-all truncate block">{acc.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 font-sans block">Access Key / PIN:</span>
                      <span className="text-amber-400 font-bold select-all font-mono truncate block">{acc.password || acc.pin || '••••'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[10px] text-gray-400 truncate max-w-[180px]">
                      {acc.vehicle || 'Standard Vehicle'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmAccount(acc)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/70 border border-red-500/40 text-red-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Permanently delete account for ${acc.name}`}
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAccount && (
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
                src={deleteConfirmAccount.avatar || getDefaultAvatarForRole(deleteConfirmAccount.role, deleteConfirmAccount.vehicleType)} 
                alt="Operator" 
                className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{deleteConfirmAccount.name || deleteConfirmAccount.phone}</h4>
                <p className="text-xs text-amber-400 font-mono mt-0.5">{deleteConfirmAccount.role} • {deleteConfirmAccount.phone || 'No Phone'}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{deleteConfirmAccount.vehicle || 'Vessel'} • {deleteConfirmAccount.plate || 'No Plate'}</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete this account? The operator will no longer be able to log in, and all credentials and profile data will be erased from the website.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmAccount(null)}
                disabled={isDeletingAccount}
                className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => handleExecuteDeleteAccount(deleteConfirmAccount)}
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
    </div>
  );
};
