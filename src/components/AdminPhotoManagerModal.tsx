import React, { useState, useRef } from 'react';
import { processImageFile } from '../lib/imageUtils';
import { saveDriverToFirestore } from '../lib/firebaseService';
import { getDefaultAvatarForRole, getDefaultVehicleImage } from '../lib/accountProvisioner';

interface AdminPhotoManagerModalProps {
  account: any;
  onClose: () => void;
  onUpdated: (updatedAccount: any) => void;
}

const VEHICLE_PRESETS = {
  Chauffeur: [
    { name: 'Toyota Prado TXL (SUV)', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80' },
    { name: 'Mercedes-Benz E-Class', image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
    { name: 'Toyota Land Cruiser V8', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
    { name: 'Toyota Camry Executive', image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=600&q=80' }
  ],
  Rider: [
    { name: 'Bajaj Boxer BM 150', image: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png' },
    { name: 'TVS Star HLX 125', image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80' },
    { name: 'Yamaha Crux 110', image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80' }
  ],
  Kekeh: [
    { name: 'TVS King Deluxe Tricycle', image: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png' },
    { name: 'Piaggio Ape City Plus Kekeh', image: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png' },
    { name: 'Bajaj RE 4S Commercial Kekeh', image: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png' }
  ]
};

export const AdminPhotoManagerModal: React.FC<AdminPhotoManagerModalProps> = ({
  account,
  onClose,
  onUpdated
}) => {
  const initialRole: 'Chauffeur' | 'Rider' | 'Kekeh' = 
    account.role === 'Rider' ? 'Rider' : 
    account.role === 'Kekeh' ? 'Kekeh' : 'Chauffeur';

  const [role, setRole] = useState<'Chauffeur' | 'Rider' | 'Kekeh'>(initialRole);
  const [vehicle, setVehicle] = useState(account.vehicle || (account.vehiclesList?.[0]?.name) || 'Executive Vessel');
  const [plate, setPlate] = useState(account.plate || (account.vehiclesList?.[0]?.plate) || 'TX-1000');
  const [color, setColor] = useState(account.color || 'Standard');
  const [avatar, setAvatar] = useState(account.avatar || getDefaultAvatarForRole(initialRole, initialRole === 'Chauffeur' ? 'car' : initialRole === 'Rider' ? 'bike' : 'kekeh'));
  
  const existingVehicleImg = 
    account.vehicleImage || 
    (account.vehiclesList && account.vehiclesList.length > 0 ? account.vehiclesList[0].image : null) || 
    account.image || 
    getDefaultVehicleImage(initialRole, initialRole === 'Chauffeur' ? 'car' : initialRole === 'Rider' ? 'bike' : 'kekeh');
  
  const [vehicleImage, setVehicleImage] = useState(existingVehicleImg);

  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isProcessingVehicle, setIsProcessingVehicle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingAvatar(true);
      setError(null);
      const compressed = await processImageFile(file, 300, 300, 0.75);
      setAvatar(compressed);
    } catch (err) {
      console.error('Error updating avatar:', err);
      setError('Could not process avatar image.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleVehicleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingVehicle(true);
      setError(null);
      const compressed = await processImageFile(file, 600, 400, 0.8);
      setVehicleImage(compressed);
    } catch (err) {
      console.error('Error updating vehicle image:', err);
      setError('Could not process vehicle image.');
    } finally {
      setIsProcessingVehicle(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const vehicleType = role === 'Chauffeur' ? 'car' : role === 'Rider' ? 'bike' : 'kekeh';

    const updatedData = {
      ...account,
      role: role,
      vehicleType: vehicleType,
      avatar: avatar,
      vehicle: vehicle,
      plate: plate,
      color: color,
      vehicleImage: vehicleImage,
      image: vehicleImage,
      vehiclesList: [
        {
          id: account.vehiclesList?.[0]?.id || `${vehicleType}-${Date.now()}`,
          name: vehicle,
          plate: plate,
          image: vehicleImage,
          active: true
        }
      ],
      updatedAt: new Date().toISOString()
    };

    try {
      await saveDriverToFirestore(updatedData);
      onUpdated(updatedData);
      onClose();
    } catch (err: any) {
      console.error('Failed to save updated operator photos:', err);
      setError(err?.message || 'Failed to save changes to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121414] border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              Fleet Asset & Photo Authority
            </span>
            <h3 className="text-xl sm:text-2xl font-bodoni font-bold text-white">
              Update Photos for {account.name}
            </h3>
            <p className="text-xs text-gray-400">
              Upload the operator face portrait and the vehicle (car, bike, or kekeh) that clients see when booking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1: Account Holder Face Portrait */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                Account Holder Portrait
              </label>
              <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Driver Face
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-black shrink-0 shadow-lg">
                <img 
                  src={avatar} 
                  alt={account.name} 
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
                <p className="text-[11px] text-gray-300">
                  Visible to passengers to verify driver identity before entering vehicle.
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
                    className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">add_a_photo</span>
                    <span>Upload Portrait</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvatar(getDefaultAvatarForRole(role, role === 'Chauffeur' ? 'car' : role === 'Rider' ? 'bike' : 'kekeh'))}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Vehicle Type and Photo (Car / Bike / Kekeh) */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">
                  {role === 'Chauffeur' ? 'directions_car' : role === 'Rider' ? 'two_wheeler' : 'electric_rickshaw'}
                </span>
                Vehicle Photo ({role === 'Chauffeur' ? 'Car / SUV' : role === 'Rider' ? 'Motorbike' : 'Kekeh'})
              </label>
              <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Client Pick-Up Visual
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-32 h-24 rounded-2xl overflow-hidden border border-amber-400/30 bg-black/60 shrink-0 p-1 flex items-center justify-center shadow-lg">
                <img 
                  src={vehicleImage} 
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
                <p className="text-[11px] text-gray-300">
                  Visible to passenger so they immediately recognize the ride approaching.
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
                    className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <span>Upload {role === 'Chauffeur' ? 'Car' : role === 'Rider' ? 'Bike' : 'Kekeh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleImage(getDefaultVehicleImage(role, role === 'Chauffeur' ? 'car' : role === 'Rider' ? 'bike' : 'kekeh'))}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Details Specification */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs uppercase font-bold text-gray-300 font-cinzel">
              Vessel & Vehicle Specifications
            </span>
            {/* Quick Vehicle Presets */}
            <div className="flex flex-wrap gap-1.5">
              {(VEHICLE_PRESETS[role] || []).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setVehicle(preset.name);
                    setVehicleImage(preset.image);
                  }}
                  className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-amber-400/20 text-gray-300 hover:text-white border border-white/10 transition-all"
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400">Category / Role</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as 'Chauffeur' | 'Rider' | 'Kekeh';
                  setRole(newRole);
                  const presets = VEHICLE_PRESETS[newRole];
                  if (presets && presets.length > 0) {
                    setVehicle(presets[0].name);
                    setVehicleImage(presets[0].image);
                  }
                }}
                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Chauffeur" className="bg-[#121414]">Chauffeur (VIP Car / SUV)</option>
                <option value="Rider" className="bg-[#121414]">Commercial Rider (Motorbike)</option>
                <option value="Kekeh" className="bg-[#121414]">Commercial Kekeh (Tricycle)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400">Vehicle Make & Model</label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g. TVS King Deluxe / Toyota Prado"
                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400">License Plate Number</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. TX-4921 or KK-1829"
                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Client Preview Box */}
        <div className="bg-gradient-to-r from-amber-500/10 via-black/40 to-black/40 border border-amber-400/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">smartphone</span>
              Client Live Viewport Preview
            </span>
            <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Verified Visible on Booking Screen
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/60 rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 shrink-0 shadow">
                <img src={avatar} alt="Driver" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{account.name}</span>
                <span className="text-[10px] text-gray-400 uppercase font-mono">{role} • ⭐ 5.00</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-white block">{vehicle}</span>
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">{plate}</span>
              </div>
              <div className="w-16 h-12 rounded-lg bg-black/80 border border-amber-400/30 p-1 flex items-center justify-center shrink-0">
                <img src={vehicleImage} alt="Vehicle Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isProcessingAvatar || isProcessingVehicle}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">cloud_done</span>
                <span>Save Photos & Fleet Updates</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
