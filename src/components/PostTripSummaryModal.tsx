import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface TripSummaryData {
  id?: string;
  pickup?: string;
  destination?: string;
  elapsedTime?: number; // seconds
  distanceKm?: number;
  fareUSD?: number;
  fareLRD?: number;
  driverName?: string;
  driverAvatar?: string;
  driverRole?: string;
  driverRating?: number | string;
  vehicleName?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  passengers?: Array<{ name: string; avatar?: string }>;
  amenities?: string[];
  completedAt?: string;
  clientName?: string;
}

interface PostTripSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: TripSummaryData;
  onBookNewRide?: () => void;
  onSubmitRating?: (rating: number, tipUSD: number, feedback: string) => void;
}

export const PostTripSummaryModal: React.FC<PostTripSummaryModalProps> = ({
  isOpen,
  onClose,
  tripData,
  onBookNewRide,
  onSubmitRating,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [sharedSuccess, setSharedSuccess] = useState<boolean>(false);
  const [rated, setRated] = useState<boolean>(false);

  if (!isOpen) return null;

  const elapsedTimeSec = tripData.elapsedTime || 0;
  const mins = Math.floor(elapsedTimeSec / 60);
  const secs = elapsedTimeSec % 60;
  const formattedTime = `${mins}m ${secs.toString().padStart(2, '0')}s`;

  const distanceVal = typeof tripData.distanceKm === 'number' && tripData.distanceKm > 0
    ? tripData.distanceKm
    : Math.max(1.2, +(elapsedTimeSec * 0.045).toFixed(1));

  const finalUSD = tripData.fareUSD !== undefined
    ? tripData.fareUSD + selectedTip
    : 5 + (elapsedTimeSec * 0.05) + selectedTip;
  const finalLRD = tripData.fareLRD !== undefined
    ? (tripData.fareUSD !== undefined ? tripData.fareUSD + selectedTip : finalUSD) * 195
    : finalUSD * 195;

  const receiptId = tripData.id || `OBS-LR-${Math.floor(100000 + Math.random() * 900000)}`;
  const completedDate = tripData.completedAt || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const poolCount = (tripData.passengers || []).length + 1;
  const splitUSD = finalUSD / poolCount;
  const splitLRD = finalLRD / poolCount;

  // Plaintext Receipt for Clipboard and Web Share API
  const generateReceiptText = () => {
    return `╔═══════════════════════════════════════════╗
   ✦ OBSIDIAN LUXURY VOYAGE RECEIPT ✦
   Monrovia Executive Chauffeur Guild
╚═══════════════════════════════════════════╝
Receipt #: ${receiptId}
Date & Time: ${completedDate}
Client: ${tripData.clientName || 'Valued Member'}

► ROUTE DETAILS:
  • Pickup: ${tripData.pickup || 'Mamba Point, Monrovia'}
  • Destination: ${tripData.destination || 'Downtown Broad Street'}
  • Total Time: ${formattedTime} (${elapsedTimeSec} seconds)
  • Distance Covered: ${distanceVal.toFixed(1)} km
  • Co-Voyagers: ${poolCount} ${poolCount > 1 ? `(Split with ${poolCount - 1} peers)` : '(Solo Voyage)'}

► CHAUFFEUR & FLEET:
  • Operator: ${tripData.driverName || 'Executive Chauffeur'}
  • Fleet: ${tripData.vehicleName || 'Cadillac Escalade Obsidian'}
  • Registration: ${tripData.vehiclePlate || 'OBS-101'}

► FARE BREAKDOWN:
  • Base Voyage Dispatch: $5.00 USD (975 LRD)
  • Chronometer In-Transit Rate: $${(elapsedTimeSec * 0.05).toFixed(2)} USD (${Math.round(elapsedTimeSec * 0.05 * 195).toLocaleString()} LRD)
  ${selectedTip > 0 ? `• Chauffeur Gratuity: $${selectedTip.toFixed(2)} USD (${Math.round(selectedTip * 195).toLocaleString()} LRD)\n` : ''}
  ───────────────────────────────────────────
  ★ TOTAL FARE: $${finalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
  ★ TOTAL (LRD): ${Math.round(finalLRD).toLocaleString()} LRD
  ${poolCount > 1 ? `★ YOUR SPLIT SHARE: $${splitUSD.toFixed(2)} USD (${Math.round(splitLRD).toLocaleString()} LRD)` : ''}
═════════════════════════════════════════════
Thank you for traveling with Obsidian Monrovia.
Verified Safe Transit • Monrovia, Liberia.`;
  };

  const handleShareReceipt = async () => {
    const receiptText = generateReceiptText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Obsidian Ride Receipt #${receiptId}`,
          text: receiptText,
        });
        setSharedSuccess(true);
        setTimeout(() => setSharedSuccess(false), 3000);
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Clipboard error:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitFeedback = () => {
    if (onSubmitRating) {
      onSubmitRating(rating, selectedTip, feedbackNotes);
    }
    setRated(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#0d1015] border border-[#e9c349]/40 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(233,195,73,0.15)] overflow-hidden my-auto"
        >
          {/* Top Gold Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#e9c349] via-[#fbbf24] to-[#ca8a04]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer"
            title="Close Receipt"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>

          <div className="p-5 sm:p-7 max-h-[85vh] overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {/* Header / Brand Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e9c349]/20 to-black border border-[#e9c349]/50 flex items-center justify-center text-[#e9c349] shadow-lg shrink-0">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#e9c349]">
                      [ OFFICIAL TRIP SUMMARY ]
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      COMPLETED
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-bodoni text-white tracking-wide">
                    Obsidian Voyage Certificate
                  </h2>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Receipt Ref: <span className="text-gray-200 font-bold">{receiptId}</span> • {completedDate}
                  </p>
                </div>
              </div>

              {/* Verified Seal Pill */}
              <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-mono uppercase">Currency Rate</span>
                  <p className="text-xs font-mono font-bold text-[#e9c349]">1 USD = 195 LRD</p>
                </div>
              </div>
            </div>

            {/* Core Metrics: 3 High-Impact Cards (Time, Fare, Distance) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Total Trip Time */}
              <div className="bg-[#13171f] border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#e9c349]/40 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Total Trip Time</span>
                  <span className="material-symbols-outlined text-base text-[#e9c349]">timer</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-black font-mono text-white tracking-tight">
                    {formattedTime}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    {elapsedTimeSec} seconds in transit
                  </p>
                </div>
              </div>

              {/* 2. Total Distance */}
              <div className="bg-[#13171f] border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#e9c349]/40 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Distance Covered</span>
                  <span className="material-symbols-outlined text-base text-sky-400">route</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-black font-mono text-white tracking-tight">
                    {distanceVal.toFixed(1)} <span className="text-sm font-sans font-bold text-gray-400">km</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    Monrovia Urban Corridor
                  </p>
                </div>
              </div>

              {/* 3. Final Fare (Dual-Currency) */}
              <div className="bg-[#13171f] border border-[#e9c349]/30 rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group bg-gradient-to-br from-[#e9c349]/10 to-transparent">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#e9c349]">Final Dual Fare</span>
                  <span className="material-symbols-outlined text-base text-[#e9c349]">payments</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-black font-mono text-[#e9c349] tracking-tight">
                    ${finalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs font-bold font-mono text-gray-300">
                    {Math.round(finalLRD).toLocaleString()} LRD
                  </p>
                </div>
              </div>
            </div>

            {/* Route Details Card */}
            <div className="bg-[#13171f] border border-white/10 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#e9c349]">navigation</span>
                Voyage Transit Waypoints
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-lg border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm">my_location</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider font-mono font-bold text-gray-400">Pickup Origin</p>
                    <p className="text-white font-bold truncate mt-0.5">{tripData.pickup || 'Mamba Point Hotel, Monrovia'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-lg border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm">flag</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider font-mono font-bold text-gray-400">Final Destination</p>
                    <p className="text-white font-bold truncate mt-0.5">{tripData.destination || 'Broad Street Downtown, Monrovia'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chauffeur & Vehicle Profile */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#13171f] border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#e9c349]/40 overflow-hidden bg-neutral-900 shrink-0">
                  <img
                    src={tripData.driverAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSkxOZBf63aqC7guUFfkuGZoRm4BClDEN-Vlm2DX0oo4P8yfmhqfd4T3ZrSsXJZAwSpwFp3esuCLldatnk7k_Z9ESmnHNqifdGJF_GxkWCvbsUlIulcgJGXBFp93aKGGauW0jzyTqQMzytyM8ViHhLac29YagOobcLoQXyOx6MYNV79A7i5zujU1xvdEr1lKyyiSnDtlG_2oX0mMq6d5rQu6x4WNmZk-ihUZh6Zgl-GUmc4-foGiOg1U7ivQiYhsvb7cYeRHdgMfk'}
                    alt={tripData.driverName || 'Driver'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white leading-none">{tripData.driverName || 'Executive Chauffeur'}</p>
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {tripData.driverRole || 'Master Chauffeur'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 font-mono">
                    {tripData.vehicleName || 'Cadillac Escalade Obsidian'} • <span className="text-[#e9c349] font-bold">{tripData.vehiclePlate || 'OBS-101'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-base text-[#e9c349]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {tripData.driverRating || '4.98'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Guild Rating</span>
              </div>
            </div>

            {/* Fare Breakdown Itemized Table */}
            <div className="bg-[#13171f] border border-white/10 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Itemized Transit Ledger
              </h4>
              <div className="space-y-1.5 text-xs divide-y divide-white/5">
                <div className="flex justify-between items-center pt-1 text-gray-300">
                  <span>Base Obsidian Dispatch & Standby</span>
                  <span className="font-mono text-white">$5.00 <span className="text-gray-500 font-normal">/ 975 LRD</span></span>
                </div>
                <div className="flex justify-between items-center pt-1.5 text-gray-300">
                  <span>Elapsed Transit Chrono ({elapsedTimeSec}s @ $0.05/s)</span>
                  <span className="font-mono text-white">${(elapsedTimeSec * 0.05).toFixed(2)} <span className="text-gray-500 font-normal">/ {Math.round(elapsedTimeSec * 0.05 * 195).toLocaleString()} LRD</span></span>
                </div>
                {selectedTip > 0 && (
                  <div className="flex justify-between items-center pt-1.5 text-emerald-400">
                    <span>Chauffeur Gratuity / Tip</span>
                    <span className="font-mono">+${selectedTip.toFixed(2)} <span className="text-emerald-500/70 font-normal">/ {Math.round(selectedTip * 195).toLocaleString()} LRD</span></span>
                  </div>
                )}
                {poolCount > 1 && (
                  <div className="flex justify-between items-center pt-1.5 text-[#e9c349]">
                    <span>Co-Voyage Pool Split ({poolCount} passengers)</span>
                    <span className="font-mono text-xs font-bold">Your Share: ${splitUSD.toFixed(2)} USD ({Math.round(splitLRD).toLocaleString()} LRD)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Chauffeur Rating & Tip Widget */}
            {!rated ? (
              <div className="bg-gradient-to-br from-[#181d26] to-[#0f131a] border border-[#e9c349]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#e9c349]">thumb_up</span>
                      Rate Your Chauffeur Experience
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Your review directly awards guild prestige bonuses to your driver.</p>
                  </div>

                  {/* 5-Star interactive selector */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            star <= rating ? 'text-[#e9c349]' : 'text-gray-600'
                          }`}
                          style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tip Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold shrink-0">Add Tip:</span>
                  {[0, 2, 5, 10].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedTip(amt)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        selectedTip === amt
                          ? 'bg-[#e9c349] text-black shadow-md'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {amt === 0 ? 'No Tip' : `+$${amt}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSubmitFeedback}
                    className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-mono transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Thank you! Chauffeur rating ({rating}★) and gratuity recorded.
                </p>
              </div>
            )}

            {/* Action Buttons: Share Receipt, Copy, Print & Book New Ride */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Share via Web Share API */}
                <button
                  type="button"
                  onClick={handleShareReceipt}
                  className="bg-[#e9c349] hover:bg-[#fbbf24] text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-mono active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                  <span>{sharedSuccess ? 'Receipt Shared!' : 'Share Receipt'}</span>
                </button>

                {/* 2. Copy to Clipboard */}
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-mono border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Plaintext'}</span>
                </button>

                {/* 3. Print Official Receipt */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-mono border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Print Receipt</span>
                </button>
              </div>

              {onBookNewRide && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBookNewRide();
                  }}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-mono shadow-xl active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">add_road</span>
                  <span>Reserve Another Voyage</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
