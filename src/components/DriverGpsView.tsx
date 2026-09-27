/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DriverGpsViewProps {
  initialDriverId?: string;
  initialTripId?: string;
  initialDriverName?: string;
  vehicleType?: 'car' | 'bike' | 'kekeh' | string;
  className?: string;
}

// Monrovia Liberia realistic testing waypoint corridor
const MONROVIA_DEMO_PATH: [number, number][] = [
  [6.3156, -10.8074], // Central Monrovia Broad Street
  [6.3120, -10.8040], // CBD Monrovia
  [6.3050, -10.7960], // Capitol Bypass
  [6.2954, -10.7850], // Tubman Blvd, Boulevard Palace
  [6.2921, -10.7820], // 15th Street Sinkor, Royal Grand Hotel
  [6.2880, -10.7780], // Old Road Junction
  [6.2780, -10.7600], // Congo Town
  [6.2620, -10.7450], // ELWA Junction
];

export const DriverGpsView: React.FC<DriverGpsViewProps> = ({
  initialDriverId = 'driver_01',
  initialTripId = 'trip_liberia_101',
  initialDriverName = 'Captain Voss',
  vehicleType = 'car',
  className = '',
}) => {
  // Trip & Driver Identifiers
  const [driverId, setDriverId] = useState<string>(initialDriverId);
  const [tripId, setTripId] = useState<string>(initialTripId);
  const [driverName, setDriverName] = useState<string>(initialDriverName);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicleType);

  // Online Trip & GPS tracking state
  const [isTripActive, setIsTripActive] = useState<boolean>(false);
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live telemetry readings
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
    altitude: number | null;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number;
  } | null>(null);

  const [pingsSent, setPingsSent] = useState<number>(0);
  const [lastTransmittedAt, setLastTransmittedAt] = useState<string | null>(null);

  // Refs for tracking handles and sockets
  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const simIntervalRef = useRef<any>(null);
  const simIndexRef = useRef<number>(0);

  // Initialize Socket.io Connection
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setErrorMessage(null);
      console.log('[DriverGpsView] Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      console.warn('[DriverGpsView] Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setSocketConnected(false);
      console.warn('[DriverGpsView] Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Compute bearing if device heading is not provided by browser GPS
  const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number): number => {
    const startLatRad = (startLat * Math.PI) / 180;
    const startLngRad = (startLng * Math.PI) / 180;
    const destLatRad = (destLat * Math.PI) / 180;
    const destLngRad = (destLng * Math.PI) / 180;

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x =
      Math.cos(startLatRad) * Math.sin(destLatRad) -
      Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    brng = (brng + 360) % 360;
    return brng;
  };

  // Transmit location packet over Socket.io to server
  const transmitLocation = useCallback(
    (lat: number, lng: number, rawHeading: number | null, speed: number | null, accuracy: number | null) => {
      let finalHeading = rawHeading;

      // If browser doesn't report compass heading, derive from previous coordinate delta
      if ((finalHeading === null || isNaN(finalHeading)) && prevPositionRef.current) {
        finalHeading = calculateBearing(
          prevPositionRef.current.lat,
          prevPositionRef.current.lng,
          lat,
          lng
        );
      }
      prevPositionRef.current = { lat, lng };

      const payload = {
        driverId,
        tripId,
        driverName,
        vehicleType: selectedVehicle,
        lat,
        lng,
        heading: Math.round(finalHeading || 0),
        speed: speed !== null ? Math.max(0, speed) : 0,
        accuracy: accuracy !== null ? Math.round(accuracy) : 0,
        timestamp: Date.now(),
      };

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('driverLocationUpdate', payload);
      } else {
        // Fallback to Express REST endpoint if WebSocket is reconnecting
        fetch('/api/tracking/driver-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => console.warn('REST fallback tracking ping failed:', err));
      }

      setPingsSent((prev) => prev + 1);
      setLastTransmittedAt(new Date().toLocaleTimeString());
    },
    [driverId, tripId, driverName, selectedVehicle]
  );

  // Stop hardware GPS tracking
  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Stop simulated route tracking
  const stopSimulator = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatorActive(false);
  }, []);

  // Start hardware browser GPS tracking using navigator.geolocation.watchPosition
  const startGpsTracking = useCallback(() => {
    setErrorMessage(null);

    if (!('geolocation' in navigator)) {
      setPermissionState('unsupported');
      setErrorMessage('Geolocation is not supported by your mobile browser. Please upgrade your browser.');
      return;
    }

    // High accuracy GPS watch settings as required
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setPermissionState('granted');
          setErrorMessage(null);

          const { latitude, longitude, altitude, accuracy, heading, speed } = position.coords;

          setCurrentCoords({
            lat: latitude,
            lng: longitude,
            altitude,
            accuracy,
            heading,
            speed,
            timestamp: position.timestamp,
          });

          transmitLocation(latitude, longitude, heading, speed, accuracy);
        },
        (error) => {
          console.warn('[DriverGpsView] Geolocation error:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setPermissionState('denied');
              setErrorMessage('Location permission was denied. Tap the lock icon in your browser address bar and enable Location access to start tracking.');
              setIsTripActive(false);
              stopGpsTracking();
              break;
            case error.POSITION_UNAVAILABLE:
              setErrorMessage('GPS signal unavailable. Ensure your mobile device has location services and GPS enabled.');
              break;
            case error.TIMEOUT:
              setErrorMessage('GPS request timed out while searching for satellites. Re-attempting...');
              break;
            default:
              setErrorMessage(error.message || 'An unexpected GPS acquisition error occurred.');
              break;
          }
        },
        geoOptions
      );

      watchIdRef.current = id;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize geolocation watch');
      setIsTripActive(false);
    }
  }, [stopGpsTracking, transmitLocation]);

  // Start simulated Monrovia corridor movement (for desktop demo & testing)
  const startSimulator = useCallback(() => {
    stopGpsTracking();
    stopSimulator();
    setIsSimulatorActive(true);
    setErrorMessage(null);

    simIndexRef.current = 0;
    const interval = setInterval(() => {
      const path = MONROVIA_DEMO_PATH;
      const index = simIndexRef.current % path.length;
      const nextIndex = (index + 1) % path.length;
      const curr = path[index];
      const next = path[nextIndex];

      const simHeading = calculateBearing(curr[0], curr[1], next[0], next[1]);
      const simSpeed = 11.1; // ~40 km/h in m/s

      setCurrentCoords({
        lat: curr[0],
        lng: curr[1],
        altitude: 15,
        accuracy: 4,
        heading: simHeading,
        speed: simSpeed,
        timestamp: Date.now(),
      });

      transmitLocation(curr[0], curr[1], simHeading, simSpeed, 4);
      simIndexRef.current++;
    }, 2500);

    simIntervalRef.current = interval;
  }, [stopGpsTracking, stopSimulator, transmitLocation]);

  // Master Toggle for "Start Online Trip" / "End Trip"
  const toggleTripStatus = () => {
    if (isTripActive) {
      // End Trip
      stopGpsTracking();
      stopSimulator();
      setIsTripActive(false);
      setCurrentCoords(null);
    } else {
      // Start Online Trip
      setIsTripActive(true);
      if (isSimulatorActive) {
        startSimulator();
      } else {
        startGpsTracking();
      }
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopGpsTracking();
      stopSimulator();
    };
  }, [stopGpsTracking, stopSimulator]);

  return (
    <div className={`flex flex-col w-full max-w-xl mx-auto bg-[#0e1117] text-white rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-2xl">navigation</span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight" style={{ fontFamily: 'Montserrat' }}>
              Driver GPS Terminal
            </h2>
            <p className="text-xs text-gray-400">100% Web-Based Real-Time Telemetry</p>
          </div>
        </div>

        {/* Socket Connection Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            socketConnected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            {socketConnected ? 'RELAY ONLINE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Driver & Trip Dispatch Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Assigned Chauffeur
          </label>
          <input
            type="text"
            value={driverName}
            disabled={isTripActive}
            onChange={(e) => setDriverName(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60"
            placeholder="Driver Name"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Trip ID (Live Feed Channel)
          </label>
          <input
            type="text"
            value={tripId}
            disabled={isTripActive}
            onChange={(e) => setTripId(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-amber-300 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-60"
            placeholder="e.g. trip-monrovia-01"
          />
        </div>
      </div>

      {/* Vehicle Class Selector */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Vehicle Classification
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'car', label: 'Luxury Taxi', icon: 'local_taxi' },
            { id: 'bike', label: 'Bike Express', icon: 'two_wheeler' },
            { id: 'kekeh', label: 'Kekeh', icon: 'electric_rickshaw' },
          ].map((v) => (
            <button
              key={v.id}
              disabled={isTripActive}
              onClick={() => setSelectedVehicle(v.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                selectedVehicle === v.id
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-md'
                  : 'bg-black/30 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
              } disabled:opacity-60`}
            >
              <span className="material-symbols-outlined text-xl mb-1">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Start / End Trip & Simulator Controls */}
      <div className="my-2 space-y-2.5">
        <button
          onClick={toggleTripStatus}
          className={`relative w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all transform active:scale-[0.98] shadow-2xl flex items-center justify-center gap-2.5 overflow-hidden ${
            isTripActive && !isSimulatorActive
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white hover:brightness-110 shadow-rose-900/40 border border-rose-400/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">
            {isTripActive && !isSimulatorActive ? 'stop_circle' : 'play_circle'}
          </span>
          <span>{isTripActive && !isSimulatorActive ? 'End Trip (Stop Device GPS)' : 'Start Real Device GPS'}</span>
        </button>

        <button
          onClick={() => {
            if (isSimulatorActive) {
              stopSimulator();
              setIsTripActive(false);
              setCurrentCoords(null);
            } else {
              stopGpsTracking();
              setIsTripActive(true);
              startSimulator();
            }
          }}
          className={`relative w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all transform active:scale-[0.98] shadow-2xl flex items-center justify-center gap-2.5 overflow-hidden ${
            isSimulatorActive
              ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white hover:brightness-110 shadow-rose-900/40 border border-rose-400/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">
            {isSimulatorActive ? 'stop_circle' : 'route'}
          </span>
          <span>{isSimulatorActive ? 'Stop Simulation' : 'Simulate Monrovia Drive (Test from Rwanda)'}</span>
        </button>
      </div>

      {/* Standalone HTML links */}
      <div className="mt-3 flex items-center justify-between px-3.5 py-2.5 bg-black/40 rounded-xl border border-white/5 text-xs text-gray-400">
        <span>Direct HTML views:</span>
        <div className="flex gap-3">
          <a href="/driver.html" target="_blank" className="text-amber-400 hover:underline font-mono">/driver.html ↗</a>
          <a href="/client.html" target="_blank" className="text-emerald-400 hover:underline font-mono">/client.html ↗</a>
        </div>
      </div>

      {/* Error & Warning Banner */}
      {errorMessage && (
        <div className="mt-4 p-3.5 bg-rose-950/80 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-xs text-rose-200">
          <span className="material-symbols-outlined text-rose-400 text-lg flex-shrink-0">warning</span>
          <div className="space-y-1">
            <div className="font-bold text-rose-300">Location Transmission Alert</div>
            <div>{errorMessage}</div>
            {permissionState === 'denied' && (
              <div className="text-[11px] text-rose-300/80 pt-1">
                * Note: Mobile browsers require an active HTTPS connection or localhost to access navigator.geolocation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Driver Telemetry Dashboard */}
      {isTripActive && currentCoords && (
        <div className="mt-5 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span className="uppercase font-bold tracking-wider text-[10px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Geolocation Stream
            </span>
            <span className="font-mono text-[11px]">Transmitted: #{pingsSent} packets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Speed */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Speed</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                {Math.round((currentCoords.speed || 0) * 3.6)}
              </span>
              <span className="text-[10px] text-gray-400 block">km/h</span>
            </div>

            {/* Heading */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Heading</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-gray-200">
                {Math.round(currentCoords.heading || 0)}°
              </span>
              <span className="text-[10px] text-gray-400 block">Compass</span>
            </div>

            {/* Accuracy */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">GPS Precision</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                ±{Math.round(currentCoords.accuracy || 0)}
              </span>
              <span className="text-[10px] text-gray-400 block">meters</span>
            </div>

            {/* Altitude */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Altitude</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-gray-300">
                {currentCoords.altitude !== null ? Math.round(currentCoords.altitude) : '--'}
              </span>
              <span className="text-[10px] text-gray-400 block">meters</span>
            </div>
          </div>

          {/* Coordinate Readout */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-mono text-gray-300">
              <span className="text-gray-500 mr-2">LAT/LNG:</span>
              {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
            </div>
            {lastTransmittedAt && (
              <div className="text-[10px] text-gray-400 font-mono">
                Last ping: {lastTransmittedAt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverGpsView;
