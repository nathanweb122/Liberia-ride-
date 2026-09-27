/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LocationCoords {
  lat: number;
  lng: number;
  address?: string;
  type?: 'pickup' | 'dropoff';
}

export interface LiveVehicleUpdate {
  driverId: string;
  tripId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
  vehicleType?: string;
  driverName?: string;
}

interface ClientMapViewProps {
  tripId?: string;
  driverName?: string;
  vehicleType?: 'car' | 'bike' | 'kekeh' | string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onPinDropped?: (coords: LocationCoords) => void;
  className?: string;
}

// Monrovia, Liberia default geographic coordinates
const MONROVIA_DEFAULT: [number, number] = [6.3156, -10.8074];

export const ClientMapView: React.FC<ClientMapViewProps> = ({
  tripId = 'trip_liberia_101',
  driverName = 'Captain Voss',
  vehicleType = 'car',
  initialCenter = MONROVIA_DEFAULT,
  initialZoom = 14,
  onPinDropped,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // UI & Telemetry state
  const [activeTripId, setActiveTripId] = useState<string>(tripId);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastVehicleLocation, setLastVehicleLocation] = useState<LiveVehicleUpdate | null>(null);
  const [droppedPin, setDroppedPin] = useState<LocationCoords | null>(null);
  const [isAutoPan, setIsAutoPan] = useState<boolean>(true);
  const [pinType, setPinType] = useState<'pickup' | 'dropoff'>('dropoff');
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [searchStatus, setSearchStatus] = useState<string>('');

  // Synchronize incoming prop changes
  useEffect(() => {
    setActiveTripId(tripId);
  }, [tripId]);

  // Create Custom Vehicle Icon with heading rotation
  const createVehicleIcon = (heading: number = 0, type: string = 'car') => {
    const L = (window as any).L;
    if (!L) return undefined;

    const isBike = type.toLowerCase().includes('bike');
    const isKekeh = type.toLowerCase().includes('kekeh');

    const iconSvg = isBike
      ? `<svg viewBox="0 0 24 24" class="w-6 h-6 fill-rose-500 drop-shadow"><path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h4.2c.45 2.31 2.44 4 4.9 4 2.8 0 5-2.2 5-5 0-2.55-1.92-4.63-4.97zM5 17c-1.66 0-3-1.34-3-3s1.34-3 3-3c1.46 0 2.66 1.06 2.94 2.46L6.5 14.5c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.35 1.35C6.08 17.64 5.56 17 5 17zm14 0c-1.66 0-3-1.34-3-3 0-.56.16-1.08.44-1.54l1.35 1.35c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L17.74 11.94C18.02 11.06 18.94 10.46 20 10.46c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/></svg>`
      : isKekeh
      ? `<svg viewBox="0 0 24 24" class="w-6 h-6 fill-amber-400 drop-shadow"><path d="M20 10V8h-4V4H7C5.34 4 4 5.34 4 7v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1v-4h-3zm-11 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm9 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-8h-3V6h3v4zM6 7c0-.55.45-1 1-1h7v4H6V7z"/></svg>`
      : `<svg viewBox="0 0 24 24" class="w-7 h-7 fill-[#e9c349] drop-shadow"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

    return L.divIcon({
      className: 'live-vehicle-marker-wrapper',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <!-- Radar Pulse Effect -->
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            background: rgba(233, 195, 73, 0.25);
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <!-- Vehicle Disc with Dynamic Heading Rotation -->
          <div style="
            position: relative;
            z-index: 2;
            width: 40px;
            height: 40px;
            background: #111417;
            border: 2px solid #e9c349;
            border-radius: 9999px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 12px rgba(233, 195, 73, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${heading}deg);
            transition: transform 0.4s ease-out;
          ">
            ${iconSvg}
          </div>
          <!-- Heading Arrow Pointer -->
          <div style="
            position: absolute;
            top: -6px;
            z-index: 3;
            width: 0; 
            height: 0; 
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 7px solid #e9c349;
            transform: rotate(${heading}deg);
            transform-origin: center 28px;
            transition: transform 0.4s ease-out;
          "></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  // Create Interactive Draggable Destination / Pickup Pin Icon
  const createPinIcon = (type: 'pickup' | 'dropoff') => {
    const L = (window as any).L;
    if (!L) return undefined;

    const isPickup = type === 'pickup';
    const bgCol = isPickup ? '#22c55e' : '#e9c349';
    const textCol = '#0c0f0f';
    const label = isPickup ? 'PICKUP' : 'DESTINATION';

    return L.divIcon({
      className: 'custom-interactive-pin',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="
            background: #111827;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.05em;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid ${bgCol};
            box-shadow: 0 4px 10px rgba(0,0,0,0.6);
            white-space: nowrap;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="display:inline-block; width:6px; height:6px; border-radius:9999px; background:${bgCol};"></span>
            <span>${label}</span>
          </div>
          <div style="
            width: 32px;
            height: 32px;
            background: ${bgCol};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              transform: rotate(45deg);
              color: ${textCol};
              font-weight: 900;
              font-size: 14px;
            ">
              ${isPickup ? '📍' : '🏁'}
            </div>
          </div>
          <div style="
            width: 10px;
            height: 3px;
            background: rgba(0,0,0,0.4);
            border-radius: 50%;
            margin-top: 1px;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [32, 48],
      iconAnchor: [16, 48],
    });
  };

  // Reverse Geocoding via free Nominatim API to get human address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        return data.display_name || `Monrovia (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
    return `Monrovia (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Drop or move the interactive pin
  const handleSetPin = useCallback(async (lat: number, lng: number, type: 'pickup' | 'dropoff', customAddress?: string) => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    const address = customAddress || (await reverseGeocode(lat, lng));
    const newCoords: LocationCoords = { lat, lng, address, type };
    setDroppedPin(newCoords);

    if (onPinDropped) {
      onPinDropped(newCoords);
    }

    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLatLng([lat, lng]);
      pinMarkerRef.current.setIcon(createPinIcon(type));
    } else {
      const marker = L.marker([lat, lng], {
        icon: createPinIcon(type),
        draggable: true,
      }).addTo(mapRef.current);

      marker.on('dragend', async (event: any) => {
        const position = event.target.getLatLng();
        const updatedAddress = await reverseGeocode(position.lat, position.lng);
        const updated: LocationCoords = {
          lat: position.lat,
          lng: position.lng,
          address: updatedAddress,
          type: pinType,
        };
        setDroppedPin(updated);
        if (onPinDropped) onPinDropped(updated);
      });

      pinMarkerRef.current = marker;
    }

    pinMarkerRef.current.bindPopup(`
      <div style="font-family:system-ui, sans-serif; font-size:12px; color:#111; min-width:180px;">
        <div style="font-weight:bold; color:#d97706; text-transform:uppercase; font-size:10px;">${type === 'pickup' ? 'Pickup Location' : 'Drop-off Destination'}</div>
        <div style="font-size:12px; margin-top:3px; font-weight:600;">${address}</div>
        <div style="font-family:monospace; color:#6b7280; font-size:11px; margin-top:4px;">
          Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}
        </div>
        <div style="margin-top:6px; font-size:10px; color:#9ca3af; font-style:italic;">💡 Drag this pin anytime to adjust!</div>
      </div>
    `).openPopup();
  }, [pinType, onPinDropped]);

  // Initialize Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize Map at Monrovia, Liberia
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      className: 'dark-tiles',
    });

    mapRef.current = map;

    // OpenStreetMap Free Tile Layer (Dark mode styled via CSS filter - No Carto API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 4,
      className: 'dark-tiles',
    }).addTo(map);

    // Integrate Address Search Bar (Geocoding) with leaflet-control-geocoder plugin
    if (L.Control && (L.Control.Geocoder || L.Control.geocoder)) {
      try {
        const geocoderFactory = L.Control.geocoder || L.Control.Geocoder.nominatim;
        const geocoderControl = (L.Control.geocoder
          ? new (L.Control.geocoder as any)({
              defaultMarkGeocode: false,
              placeholder: 'Search Monrovia address / landmark...',
              errorMessage: 'Location not found',
            })
          : new (L.Control.Geocoder as any)({
              defaultMarkGeocode: false,
              placeholder: 'Search Monrovia address / landmark...',
              errorMessage: 'Location not found',
            })
        );

        geocoderControl.on('markgeocode', (e: any) => {
          const center = e.geocode.center;
          const name = e.geocode.name;
          map.setView(center, 16);
          setSearchStatus(`Selected: ${name}`);
          handleSetPin(center.lat, center.lng, pinType, name);
        });

        geocoderControl.addTo(map);
      } catch (err) {
        console.warn('Leaflet Control Geocoder initialization fallback:', err);
      }
    }

    // Interactive Pin-Dropping: Tap or click anywhere on the map
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      handleSetPin(lat, lng, pinType);
    });

    // Invalidate size on load
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Set up Socket.io Client to listen for real-time driver coordinates
  useEffect(() => {
    // Connect to current server host
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log(`[ClientMapView] Connected to tracking relay, joining trip: ${activeTripId}`);
      socket.emit('joinTrip', activeTripId);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('[ClientMapView] Socket connection error:', err.message);
      setConnectionStatus('disconnected');
    });

    // Listen to trip-specific coordinate broadcast: location_update_${activeTripId}
    const tripEvent = `location_update_${activeTripId}`;
    socket.on(tripEvent, (data: LiveVehicleUpdate) => {
      if (!data) return;

      let lat = Number(data.lat);
      let lng = Number(data.lng);

      // Filter out [0, 0] ocean bug or missing/invalid coordinates
      if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat) || isNaN(lng)) {
        lat = MONROVIA_DEFAULT[0];
        lng = MONROVIA_DEFAULT[1];
      }

      const cleanData: LiveVehicleUpdate = {
        ...data,
        lat,
        lng,
      };
      
      setLastVehicleLocation(cleanData);
      setUpdateCount((prev) => prev + 1);

      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const newPos: [number, number] = [lat, lng];

      // Update or create live vehicle marker
      if (driverMarkerRef.current) {
        // Smoothly update car position using marker.setLatLng([lat, lng])
        driverMarkerRef.current.setLatLng(newPos);
        driverMarkerRef.current.setIcon(createVehicleIcon(data.heading || 0, data.vehicleType || vehicleType));
      } else {
        const marker = L.marker(newPos, {
          icon: createVehicleIcon(data.heading || 0, data.vehicleType || vehicleType),
          zIndexOffset: 1000,
        }).addTo(mapRef.current);

        marker.bindPopup(`
          <div style="font-family:system-ui, sans-serif; font-size:12px; min-width:180px;">
            <div style="font-weight:bold; font-size:13px; color:#111;">${data.driverName || driverName}</div>
            <div style="color:#d97706; font-weight:700; text-transform:uppercase; font-size:10px;">${data.vehicleType || vehicleType} • In Transit</div>
            <div style="margin-top:4px; font-size:11px; color:#4b5563;">
              Speed: <strong>${Math.round((data.speed || 0) * 3.6)} km/h</strong><br/>
              Heading: <strong>${Math.round(data.heading || 0)}°</strong>
            </div>
            <div style="margin-top:4px; font-size:9px; color:#9ca3af;">Trip ID: ${data.tripId}</div>
          </div>
        `);

        driverMarkerRef.current = marker;
      }

      // Smoothly keep map view centered using map.panTo([lat, lng])
      if (isAutoPan && mapRef.current) {
        mapRef.current.panTo(newPos, { animate: true, duration: 0.8 });
      }
    });

    return () => {
      socket.off(tripEvent);
      socket.emit('leaveTrip', activeTripId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTripId, isAutoPan, vehicleType, driverName]);

  // Center map on vehicle on demand
  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (lastVehicleLocation) {
      mapRef.current.setView([lastVehicleLocation.lat, lastVehicleLocation.lng], 15, { animate: true });
      setIsAutoPan(true);
    } else {
      mapRef.current.setView(initialCenter, initialZoom, { animate: true });
    }
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#0d0f12] text-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${className}`}>
      {/* Top Map HUD & Controls Bar */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#13171d]/90 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e9c349]/15 border border-[#e9c349]/30 text-[#e9c349]">
            <span className="material-symbols-outlined text-lg">local_taxi</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight uppercase" style={{ fontFamily: 'Montserrat' }}>
                Monrovia Live Vehicle Radar
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}></span>
                {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Trip Feed: <span className="font-mono text-amber-300">{activeTripId}</span> • OSM + Leaflet
            </p>
          </div>
        </div>

        {/* Pin Dropping Mode Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-xs">
            <button
              onClick={() => setPinType('pickup')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1 ${
                pinType === 'pickup'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📍</span>
              <span>Pickup</span>
            </button>
            <button
              onClick={() => setPinType('dropoff')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1 ${
                pinType === 'dropoff'
                  ? 'bg-[#e9c349] text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🏁</span>
              <span>Drop-off</span>
            </button>
          </div>

          {/* Auto-Pan Toggle */}
          <button
            onClick={() => setIsAutoPan(!isAutoPan)}
            title="Auto-center map on incoming vehicle coordinates"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
              isAutoPan
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">center_focus_strong</span>
            <span className="hidden sm:inline">Auto-Follow</span>
          </button>

          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Recenter Map"
          >
            <span className="material-symbols-outlined text-[16px]">my_location</span>
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full min-h-[420px]">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

        {/* Floating Telemetry & Pin Coordinate Card */}
        <div className="absolute bottom-4 left-4 z-10 max-w-[320px] bg-[#11141a]/95 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-sm">directions_car</span>
              <span className="font-bold text-gray-200">{driverName}</span>
            </div>
            <span className="font-mono text-[10px] text-gray-400">Updates: #{updateCount}</span>
          </div>

          {/* Vehicle Telemetry */}
          {lastVehicleLocation ? (
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 rounded-lg p-2 border border-white/5">
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Speed</span>
                <span className="font-bold text-amber-300 font-mono text-xs">
                  {Math.round((lastVehicleLocation.speed || 0) * 3.6)} km/h
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Heading</span>
                <span className="font-bold text-gray-200 font-mono text-xs">
                  {Math.round(lastVehicleLocation.heading || 0)}°
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-white/5">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Vehicle GPS</span>
                <span className="font-mono text-[10px] text-gray-300">
                  {lastVehicleLocation.lat.toFixed(5)}, {lastVehicleLocation.lng.toFixed(5)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Awaiting driver GPS broadcast on feed...</span>
            </div>
          )}

          {/* Interactive Dropped Pin Coordinates info */}
          {droppedPin ? (
            <div className="bg-black/50 border border-white/10 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  {droppedPin.type === 'pickup' ? '📍 Pickup Selected' : '🏁 Drop-off Destination'}
                </span>
                <span className="text-[9px] text-gray-400">Draggable</span>
              </div>
              <p className="text-[11px] text-gray-200 font-medium line-clamp-2">
                {droppedPin.address}
              </p>
              <div className="font-mono text-[10px] text-gray-400 pt-0.5">
                {droppedPin.lat.toFixed(5)}, {droppedPin.lng.toFixed(5)}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-gray-400 italic bg-white/5 rounded-lg p-2 border border-white/5">
              👆 Tap anywhere on the map or use the search bar above to drop a pin.
            </div>
          )}

          {searchStatus && (
            <div className="text-[10px] text-amber-400/90 truncate font-mono">
              {searchStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientMapView;
