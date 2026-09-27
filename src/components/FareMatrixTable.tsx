import React, { useState } from 'react';
import { Search, MapPin, Bike, Car, Bus, Coins, Compass, Check } from 'lucide-react';

interface FareRow {
  destination: string;
  bikeFare: string; // e.g. "LD 250 ($1.39)"
  carFare: string;
  kekeFare: string;
}

const FARE_DATA: FareRow[] = [
  {
    destination: "University of Liberia (UL) / Capitol Hill",
    bikeFare: "LD 250 ($1.39)",
    carFare: "LD 230 ($1.28)",
    kekeFare: "LD 220 ($1.22)"
  },
  {
    destination: "Monrovia City Hall",
    bikeFare: "LD 270 ($1.50)",
    carFare: "LD 250 ($1.39)",
    kekeFare: "LD 220 ($1.22)"
  },
  {
    destination: "12th Street, Sinkor",
    bikeFare: "LD 300 ($1.67)",
    carFare: "LD 250 ($1.39)",
    kekeFare: "LD 230 ($1.28)"
  },
  {
    destination: "20th / 24th Street, Sinkor",
    bikeFare: "LD 350 ($1.94)",
    carFare: "LD 280 ($1.56)",
    kekeFare: "LD 240 ($1.33)"
  },
  {
    destination: "Airfield Junction, Sinkor",
    bikeFare: "LD 350 ($1.94)",
    carFare: "LD 280 ($1.56)",
    kekeFare: "LD 250 ($1.39)"
  },
  {
    destination: "Old Road, Sinkor",
    bikeFare: "LD 400 ($2.22)",
    carFare: "LD 300 ($1.67)",
    kekeFare: "LD 260 ($1.44)"
  },
  {
    destination: "Catholic Hospital Junction",
    bikeFare: "LD 400 ($2.22)",
    carFare: "LD 300 ($1.67)",
    kekeFare: "LD 250 ($1.39)"
  },
  {
    destination: "SKD Boulevard, Congo Town",
    bikeFare: "LD 450 ($2.50)",
    carFare: "LD 350 ($1.94)",
    kekeFare: "LD 300 ($1.67)"
  },
  {
    destination: "Vai Town",
    bikeFare: "LD 250 ($1.39)",
    carFare: "LD 230 ($1.28)",
    kekeFare: "LD 220 ($1.22)"
  },
  {
    destination: "Clara Town",
    bikeFare: "LD 270 ($1.50)",
    carFare: "LD 240 ($1.33)",
    kekeFare: "LD 225 ($1.25)"
  },
  {
    destination: "Freeport of Monrovia",
    bikeFare: "LD 300 ($1.67)",
    carFare: "LD 250 ($1.39)",
    kekeFare: "LD 230 ($1.28)"
  },
  {
    destination: "Logan Town / Bong Mines Bridge",
    bikeFare: "LD 350 ($1.94)",
    carFare: "LD 270 ($1.50)",
    kekeFare: "LD 240 ($1.33)"
  },
  {
    destination: "Jamaica Road Junction",
    bikeFare: "LD 350 ($1.94)",
    carFare: "LD 260 ($1.44)",
    kekeFare: "LD 240 ($1.33)"
  },
  {
    destination: "Battery Factory / Topoe Village",
    bikeFare: "LD 400 ($2.22)",
    carFare: "LD 260 ($1.44)",
    kekeFare: "LD 240 ($1.33)"
  },
  {
    destination: "Caldwell Junction",
    bikeFare: "LD 400 ($2.22)",
    carFare: "LD 290 ($1.61)",
    kekeFare: "LD 250 ($1.39)"
  },
  {
    destination: "New Georgia Estate Junction",
    bikeFare: "LD 400 ($2.22)",
    carFare: "LD 270 ($1.50)",
    kekeFare: "LD 240 ($1.33)"
  },
  {
    destination: "New Georgia Estate (Inside)",
    bikeFare: "LD 450 ($2.50)",
    carFare: "LD 300 ($1.67)",
    kekeFare: "LD 260 ($1.44)"
  },
  {
    destination: "Gardnersville Supermarket",
    bikeFare: "LD 450 ($2.50)",
    carFare: "LD 290 ($1.61)",
    kekeFare: "LD 250 ($1.39)"
  },
  {
    destination: "Duala Market",
    bikeFare: "LD 450 ($2.50)",
    carFare: "LD 320 ($1.78)",
    kekeFare: "LD 270 ($1.50)"
  },
  {
    destination: "St. Paul Bridge / Monrovia Breweries",
    bikeFare: "LD 500 ($2.78)",
    carFare: "LD 320 ($1.78)",
    kekeFare: "LD 270 ($1.50)"
  }
];

interface FareMatrixTableProps {
  onSelectDestination?: (destinationName: string, vehicleType?: 'bike' | 'taxi' | 'kekeh') => void;
  showSelectButton?: boolean;
}

export const FareMatrixTable: React.FC<FareMatrixTableProps> = ({ 
  onSelectDestination,
  showSelectButton = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const filteredData = FARE_DATA.filter(row => 
    row.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-6 bg-surface shadow-2xl relative overflow-hidden">
      {/* Background soft glowing accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#e9c349]/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] text-[#e9c349] uppercase font-bold tracking-widest font-mono flex items-center gap-1.5">
            <Coins className="w-3 h-3 text-[#e9c349]" /> Standard fare matrix
          </span>
          <h3 className="font-bodoni text-2xl font-bold text-on-surface mt-1">Official Destination Fares</h3>
          <p className="text-xs text-on-surface-variant opacity-60 font-sans mt-0.5">
            Approved fixed route fares (Dual Currency LRD / USD). Select a route below.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-on-surface focus:outline-none focus:border-[#e9c349]/50 transition-colors"
          />
        </div>
      </div>

      {/* Grid / Table Container */}
      <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#09090b]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Destination (Community / Street)</th>
              <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-[#e9c349]" />
                  <span>Bike Fare</span>
                </div>
              </th>
              <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-primary" />
                  <span>Car Fare</span>
                </div>
              </th>
              <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bus / KeKe Fare</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => {
                const isSelected = selectedRow === idx;
                return (
                  <tr 
                    key={idx}
                    onClick={() => setSelectedRow(isSelected ? null : idx)}
                    className={`transition-colors cursor-pointer text-xs ${
                      isSelected 
                        ? 'bg-[#e9c349]/10 border-l-2 border-l-[#e9c349]' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="p-3 font-medium text-white flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-[#e9c349] shrink-0" />
                      <span>{row.destination}</span>
                    </td>
                    <td className="p-3 font-mono text-[#e9c349]/90 font-bold">{row.bikeFare}</td>
                    <td className="p-3 font-mono text-primary/90 font-bold">{row.carFare}</td>
                    <td className="p-3 font-mono text-amber-500/90 font-bold">{row.kekeFare}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500 text-xs">
                  No matching destinations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Action Bar */}
      {selectedRow !== null && filteredData[selectedRow] && (
        <div className="bg-[#e9c349]/5 border border-[#e9c349]/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <p className="text-[10px] text-[#e9c349] uppercase font-bold tracking-widest font-mono">Selected Route</p>
            <p className="text-sm font-bold text-white font-bodoni mt-0.5">{filteredData[selectedRow].destination}</p>
          </div>
          
          {onSelectDestination && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => onSelectDestination(filteredData[selectedRow].destination, 'bike')}
                className="flex-1 sm:flex-initial bg-[#e9c349] hover:bg-[#e9c349]/80 text-[#0c0f0f] text-[10px] font-bold px-3 py-2 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Bike className="w-3 h-3" /> Select Bike
              </button>
              <button
                onClick={() => onSelectDestination(filteredData[selectedRow].destination, 'taxi')}
                className="flex-1 sm:flex-initial bg-primary hover:brightness-110 text-[#0c0f0f] text-[10px] font-bold px-3 py-2 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Car className="w-3 h-3" /> Select Car
              </button>
              <button
                onClick={() => onSelectDestination(filteredData[selectedRow].destination, 'kekeh')}
                className="flex-1 sm:flex-initial bg-amber-500 hover:brightness-110 text-neutral-950 text-[10px] font-bold px-3 py-2 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Bus className="w-3 h-3" /> Select KeKe
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
