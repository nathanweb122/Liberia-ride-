/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { ClientMapView, LocationCoords } from './ClientMapView';
import { DriverGpsView } from './DriverGpsView';

interface LiveVehicleTrackerHubProps {
  onBack?: () => void;
}

export const LiveVehicleTrackerHub: React.FC<LiveVehicleTrackerHubProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'client' | 'driver' | 'split' | 'docs'>('split');
  const [tripChannel, setTripChannel] = useState<string>('trip_liberia_101');
  const [lastPin, setLastPin] = useState<LocationCoords | null>(null);

  return (
    <div className="min-h-screen bg-[#090b0e] text-white pt-24 pb-16 px-3 sm:px-6 max-w-7xl mx-auto flex flex-col">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all flex items-center justify-center"
                title="Return to Dashboard"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">radar</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ fontFamily: 'Montserrat' }}>
                Real-Time Vehicle Tracking
              </h1>
              <p className="text-xs text-gray-400">
                100% Web-Based • OpenStreetMap & Leaflet.js • Node.js Socket.io GPS Relay
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('split')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'split' ? 'bg-[#e9c349] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">splitscreen</span>
            <span className="hidden sm:inline">Split Radar</span>
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'client' ? 'bg-[#e9c349] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">map</span>
            <span>Client Map</span>
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'driver' ? 'bg-[#e9c349] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">smartphone</span>
            <span>Driver GPS</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'docs' ? 'bg-[#e9c349] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">code</span>
            <span className="hidden sm:inline">Integration Guide</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left: Client Live Map View */}
          <div className="lg:col-span-7 h-[650px] flex flex-col">
            <ClientMapView
              tripId={tripChannel}
              driverName="Captain Voss"
              vehicleType="car"
              onPinDropped={(pin) => setLastPin(pin)}
              className="h-full"
            />
          </div>

          {/* Right: Driver Mobile GPS Terminal */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <DriverGpsView
              initialTripId={tripChannel}
              initialDriverName="Captain Voss"
              vehicleType="car"
            />

            {/* Quick Testing Helper */}
            <div className="bg-[#12161f] border border-white/10 rounded-3xl p-5 text-xs text-gray-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[11px]">
                <span className="material-symbols-outlined text-base">lightbulb</span>
                <span>Testing In Real Time</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Click <strong className="text-amber-300">"Start Online Trip"</strong> above in the Driver terminal (or toggle <em>Monrovia Corridor Demo Mode</em> if testing on a laptop). Coordinates will broadcast live through Socket.io and animate the vehicle position on the OpenStreetMap canvas!
              </p>
              {lastPin && (
                <div className="pt-2 border-t border-white/5 font-mono text-[10px] text-emerald-400">
                  Active Dropped Pin: {lastPin.lat.toFixed(4)}, {lastPin.lng.toFixed(4)} ({lastPin.type})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'client' && (
        <div className="h-[750px] w-full flex flex-col">
          <ClientMapView
            tripId={tripChannel}
            driverName="Captain Voss"
            vehicleType="car"
            onPinDropped={(pin) => setLastPin(pin)}
            className="h-full"
          />
        </div>
      )}

      {activeTab === 'driver' && (
        <div className="w-full flex items-center justify-center py-6">
          <DriverGpsView
            initialTripId={tripChannel}
            initialDriverName="Captain Voss"
            vehicleType="car"
          />
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="bg-[#11141b] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-sm">
          <div>
            <h2 className="text-xl font-bold text-amber-400 mb-2">Integration Snippets & Step-by-Step Guide</h2>
            <p className="text-gray-400">
              The real-time vehicle tracking stack consists of 3 production modules: Backend Socket.io relay, Driver Mobile GPS browser transmitter, and Client Leaflet OpenStreetMap canvas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-black/60 rounded-2xl p-4 border border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">1. Backend Socket.io Relay (server.ts)</h3>
              <p className="text-xs text-gray-400 mb-3">
                Listens on <code className="text-amber-300">driverLocationUpdate</code> and broadcasts <code className="text-amber-300">location_update_&#123;tripId&#125;</code>:
              </p>
              <pre className="bg-[#0b0d11] p-3 rounded-xl overflow-x-auto text-[11px] font-mono text-gray-300">
{`const io = new SocketIOServer(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("driverLocationUpdate", (data) => {
    // Ingest coordinates: { driverId, tripId, lat, lng, heading, speed }
    io.emit(\`location_update_\${data.tripId}\`, data);
  });
});`}
              </pre>
            </div>

            <div className="bg-black/60 rounded-2xl p-4 border border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">2. Driver Browser Geolocation API</h3>
              <p className="text-xs text-gray-400 mb-3">
                Using native <code className="text-amber-300">navigator.geolocation.watchPosition</code> with high accuracy:
              </p>
              <pre className="bg-[#0b0d11] p-3 rounded-xl overflow-x-auto text-[11px] font-mono text-gray-300">
{`const watchId = navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude, heading, speed } = position.coords;
    socket.emit('driverLocationUpdate', {
      driverId: 'driver-captain-voss',
      tripId: 'trip-monrovia-01',
      lat: latitude,
      lng: longitude,
      heading,
      speed
    });
  },
  (error) => console.warn(error),
  { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
);`}
              </pre>
            </div>

            <div className="bg-black/60 rounded-2xl p-4 border border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">3. HTTPS Requirement Note for Mobile Devices</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Modern mobile browsers (Chrome on Android and Safari on iOS) strictly require an <strong>HTTPS connection</strong> (or <code>localhost</code> / <code>127.0.0.1</code>) to execute <code>navigator.geolocation.watchPosition</code>. In production or cloud staging, ensure SSL certificates are enabled on your domain.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveVehicleTrackerHub;
