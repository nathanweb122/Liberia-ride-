/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { db } from '../lib/firebaseService';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { PRODUCTION_DRIVERS } from '../lib/driverRoster';

export interface PresetLocation {
  name: string;
  category: 'Hotel' | 'Airport' | 'Landmark' | 'Government' | 'Market' | 'Area' | 'County';
  lat: number;
  lng: number;
  description: string;
}

// Strict Liberia geographic bounds
export const LIBERIA_BOUNDS = {
  southWest: [4.2, -11.6] as [number, number],
  northEast: [8.6, -7.3] as [number, number],
  center: [6.3135, -10.8055] as [number, number], // Broad Street Downtown, Monrovia, Liberia
};

export const isWithinLiberia = (lat?: number, lng?: number): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
  // Bounding box strictly covering Liberia territory only
  if (lat < 4.2 || lat > 8.6 || lng < -11.6 || lng > -7.3) return false;
  // Atlantic ocean water exclusions southwest of Monrovia:
  // West of -10.805, latitude must be on peninsula land (>= 6.312)
  if (lng <= -10.808 && lat < 6.312) return false;
  // Deep coastal water south of Monrovia
  if (lat < 6.275 && lng < -10.770) return false;
  return true;
};

export const sanitizeLiberiaCoords = (lat?: number, lng?: number): [number, number] => {
  if (lat !== undefined && lng !== undefined && isWithinLiberia(lat, lng)) {
    return [lat, lng];
  }
  return [6.3135, -10.8055]; // Central Monrovia Broad Street
};

export const LIBERIA_PRESET_LOCATIONS: PresetLocation[] = [
  // Monrovia & Montserrado County
  { name: 'Mamba Point Hotel', category: 'Hotel', lat: 6.3156, lng: -10.8124, description: 'Mamba Point, Monrovia, Liberia' },
  { name: 'Boulevard Palace Hotel', category: 'Hotel', lat: 6.2954, lng: -10.7850, description: 'Tubman Blvd, Sinkor, Monrovia' },
  { name: 'Royal Grand Hotel', category: 'Hotel', lat: 6.2921, lng: -10.7820, description: '15th Street, Sinkor, Monrovia' },
  { name: 'Broad Street Downtown', category: 'Area', lat: 6.3120, lng: -10.8040, description: 'Central Business District, Monrovia' },
  { name: 'Waterside Market', category: 'Market', lat: 6.3185, lng: -10.8062, description: 'Water Street, Central Monrovia' },
  { name: 'Providence Island', category: 'Landmark', lat: 6.3190, lng: -10.7990, description: 'Historic Landmark, Mesurado River' },
  { name: 'Paynesville Red Light', category: 'Market', lat: 6.2750, lng: -10.7100, description: 'Commercial Hub, Paynesville, Liberia' },
  { name: 'SKD Sports Complex', category: 'Landmark', lat: 6.2680, lng: -10.7250, description: 'Samuel K. Doe Stadium, Paynesville' },
  { name: 'Monrovia City Hall', category: 'Government', lat: 6.2990, lng: -10.7910, description: 'Tubman Blvd, Sinkor, Monrovia' },
  { name: 'National Museum of Liberia', category: 'Landmark', lat: 6.3135, lng: -10.8055, description: 'Broad & Buchanan St, Monrovia' },
  { name: 'Centennial Memorial Pavilion', category: 'Landmark', lat: 6.3140, lng: -10.8070, description: 'Ashmun & Randall St, Monrovia' },
  { name: 'Freeport of Monrovia', category: 'Landmark', lat: 6.3350, lng: -10.7950, description: 'Bushrod Island, Monrovia' },
  { name: 'Ducor Palace Hill', category: 'Landmark', lat: 6.3125, lng: -10.8140, description: 'Snapper Hill, Mamba Point' },
  { name: 'ELWA Junction', category: 'Area', lat: 6.2620, lng: -10.7450, description: 'Paynesville / Robertsfield Highway' },
  { name: 'Old Road Junction', category: 'Area', lat: 6.2880, lng: -10.7780, description: 'Sinkor Old Road, Monrovia' },
  { name: 'Congo Town Back Road', category: 'Area', lat: 6.2780, lng: -10.7600, description: 'Congo Town, Monrovia' },
  { name: 'Careysburg City', category: 'Area', lat: 6.4020, lng: -10.5560, description: 'Montserrado County, Liberia' },

  // Margibi County (Airports & Harbel)
  { name: 'Roberts International Airport (RIA)', category: 'Airport', lat: 6.2397, lng: -10.3623, description: 'Harbel, Margibi County, Liberia' },
  { name: 'The Farmington Hotel', category: 'Hotel', lat: 6.2366, lng: -10.3582, description: 'Robertsfield Highway, RIA, Liberia' },
  { name: 'Kakata City Center', category: 'County', lat: 6.5310, lng: -10.3530, description: 'Margibi County Capital, Liberia' },
  { name: 'Harbel Firestone Estate', category: 'Area', lat: 6.2830, lng: -10.3450, description: 'Margibi County, Liberia' },

  // Grand Bassa County (Buchanan)
  { name: 'Buchanan Port City', category: 'County', lat: 5.8808, lng: -10.0467, description: 'Grand Bassa County, Liberia' },

  // Bong & Nimba Counties
  { name: 'Gbarnga Central', category: 'County', lat: 7.0089, lng: -9.4720, description: 'Bong County Capital, Liberia' },
  { name: 'Ganta Commercial City', category: 'County', lat: 7.2347, lng: -8.9814, description: 'Nimba County Hub, Liberia' },
];

export interface MonroviaTrafficSegment {
  id: string;
  name: string;
  corridor: string;
  status: 'free' | 'moderate' | 'heavy' | 'bottleneck';
  speedKmH: number;
  delayMins: number;
  color: string;
  description: string;
  coords: [number, number][];
}

export const MONROVIA_TRAFFIC_CORRIDORS: MonroviaTrafficSegment[] = [
  {
    id: 'tr-tubman-sinkor',
    name: 'Tubman Blvd (Downtown to Sinkor 12th St)',
    corridor: 'Tubman Boulevard Commercial',
    status: 'moderate',
    speedKmH: 26,
    delayMins: 4,
    color: '#eab308',
    description: 'Moderate commuter flow near Vamoma & Boulevard Palace',
    coords: [
      [6.3120, -10.8040],
      [6.3050, -10.7960],
      [6.2954, -10.7850],
      [6.2880, -10.7780]
    ]
  },
  {
    id: 'tr-tubman-congo',
    name: 'Tubman Blvd (Sinkor to Congo Town & ELWA)',
    corridor: 'Tubman Boulevard Express',
    status: 'free',
    speedKmH: 48,
    delayMins: 0,
    color: '#22c55e',
    description: 'Smooth flowing express lanes heading towards ELWA Junction',
    coords: [
      [6.2880, -10.7780],
      [6.2780, -10.7600],
      [6.2700, -10.7520],
      [6.2620, -10.7450]
    ]
  },
  {
    id: 'tr-broad-waterside',
    name: 'Broad Street & Waterside Commercial Corridor',
    corridor: 'Monrovia Central CBD',
    status: 'heavy',
    speedKmH: 14,
    delayMins: 7,
    color: '#ef4444',
    description: 'High market pedestrian density & delivery offloading',
    coords: [
      [6.3185, -10.8062],
      [6.3140, -10.8070],
      [6.3120, -10.8040],
      [6.3090, -10.8000],
      [6.3135, -10.7950]
    ]
  },
  {
    id: 'tr-somalia-japan-hwy',
    name: 'Somalia Drive / Japan Freeway & Freeport',
    corridor: 'Bushrod Island Expressway',
    status: 'heavy',
    speedKmH: 18,
    delayMins: 9,
    color: '#ef4444',
    description: 'Freight cargo logistics & Duala Market congestion',
    coords: [
      [6.3190, -10.7990],
      [6.3350, -10.7950],
      [6.3500, -10.7800],
      [6.3650, -10.7500],
      [6.3750, -10.7200]
    ]
  },
  {
    id: 'tr-red-light-hub',
    name: 'Paynesville Red Light Junction & SKD',
    corridor: 'Paynesville Hub',
    status: 'bottleneck',
    speedKmH: 9,
    delayMins: 14,
    color: '#991b1b',
    description: 'Heavy junction bottleneck & high volume transport merge',
    coords: [
      [6.2750, -10.7100],
      [6.2720, -10.7180],
      [6.2680, -10.7250],
      [6.2620, -10.7450]
    ]
  },
  {
    id: 'tr-un-mamba-point',
    name: 'UN Drive & Mamba Point Embassy Row',
    corridor: 'Diplomatic Enclave',
    status: 'free',
    speedKmH: 42,
    delayMins: 0,
    color: '#22c55e',
    description: 'Diplomatic security patrol zone with unobstructed flow',
    coords: [
      [6.3156, -10.8124],
      [6.3125, -10.8140],
      [6.3080, -10.8090],
      [6.3050, -10.7960]
    ]
  },
  {
    id: 'tr-ria-highway',
    name: 'Robertsfield Highway (ELWA to RIA)',
    corridor: 'International Airport Highway',
    status: 'free',
    speedKmH: 65,
    delayMins: 0,
    color: '#22c55e',
    description: 'High speed open corridor connecting to Roberts Airport',
    coords: [
      [6.2620, -10.7450],
      [6.2550, -10.7000],
      [6.2500, -10.6000],
      [6.2450, -10.5000],
      [6.2397, -10.3623]
    ]
  }
];

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: 'turn-right' | 'turn-left' | 'straight' | 'fork' | 'roundabout' | 'arrive' | 'depart';
  streetName: string;
}

interface DriverFirebaseCoords {
  driverLat: number;
  driverLng: number;
  clientLat?: number;
  clientLng?: number;
}

const useDriverFirebaseLocation = (
  driverId: string | null,
  popupText: string,
  fallbackLat: number,
  fallbackLng: number,
  fallbackDestLat?: number,
  fallbackDestLng?: number
): DriverFirebaseCoords => {
  const [coords, setCoords] = useState<DriverFirebaseCoords>({
    driverLat: fallbackLat,
    driverLng: fallbackLng,
    clientLat: fallbackDestLat,
    clientLng: fallbackDestLng,
  });

  useEffect(() => {
    const getDriverIdFromText = (text: string) => {
      if (!text) return null;
      const lower = text.toLowerCase();
      // Check phone, plate, or name in production drivers
      const match = PRODUCTION_DRIVERS.find(d => 
        lower.includes(d.phone.toLowerCase()) || 
        lower.includes(d.plate.toLowerCase()) || 
        lower.includes(d.name.toLowerCase()) ||
        lower.includes(d.id.toLowerCase())
      );
      if (match) return match.id;
      return null;
    };

    const matchedDriverId = driverId || getDriverIdFromText(popupText);

    if (!matchedDriverId) {
      setCoords({
        driverLat: fallbackLat,
        driverLng: fallbackLng,
        clientLat: fallbackDestLat,
        clientLng: fallbackDestLng,
      });
      return;
    }

    try {
      const driverRef = doc(db, 'drivers', matchedDriverId);
      const unsubscribe = onSnapshot(
        driverRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCoords({
              driverLat: typeof data.lat === 'number' ? data.lat : fallbackLat,
              driverLng: typeof data.lng === 'number' ? data.lng : fallbackLng,
              clientLat: typeof data.destinationLat === 'number' ? data.destinationLat : fallbackDestLat,
              clientLng: typeof data.destinationLng === 'number' ? data.destinationLng : fallbackDestLng,
            });
          }
        },
        (error) => {
          if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('Could not reach Cloud')) {
            return;
          }
          console.warn('Firebase driver coords listener notice:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase listener initialization notice:', e);
    }
  }, [driverId, popupText, fallbackLat, fallbackLng, fallbackDestLat, fallbackDestLng]);

  return coords;
};

// Calculate initial bearing between two geographic points in degrees (0 to 360)
function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
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
}

type MapTheme = 'google_streets' | 'uber_dark' | 'google_satellite';

interface InteractiveMapProps {
  lat?: number;
  lng?: number;
  pickupLat?: number;
  pickupLng?: number;
  popupText?: string;
  markerImage?: string;
  vehicleType?: 'car' | 'bike' | 'kekeh' | 'delivery' | 'taxi' | string;
  height?: string;
  className?: string;
  destinationLat?: number;
  destinationLng?: number;
  driverId?: string;
  hasActiveTrip?: boolean;
  tripStatus?: string;
  tripAccepted?: boolean;
  isPassiveTracking?: boolean;
  showSearch?: boolean;
  onCoordsChange?: (lat: number, lng: number, placeName?: string) => void;
  onEtaUpdate?: (durationMins: number | null, distanceKm: number | null) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  lat = 6.3135,
  lng = -10.8055,
  pickupLat,
  pickupLng,
  popupText = 'Monrovia Command Center',
  markerImage,
  vehicleType,
  height = '100%',
  className = '',
  destinationLat,
  destinationLng,
  driverId,
  hasActiveTrip = false,
  tripStatus,
  tripAccepted,
  isPassiveTracking = false,
  showSearch = true,
  onCoordsChange,
  onEtaUpdate,
}) => {
  const rootWrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const routeCasingRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const clientMarkerRef = useRef<any>(null);
  const trafficLayerGroupRef = useRef<any>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('uber_dark');
  const [pluginsLoaded, setPluginsLoaded] = useState<boolean>(false);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [is3DTilt, setIs3DTilt] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [englishVoice, setEnglishVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Traffic Overlay State
  const [showTrafficOverlay, setShowTrafficOverlay] = useState<boolean>(true);
  const [showTrafficPanel, setShowTrafficPanel] = useState<boolean>(false);
  const [selectedCorridor, setSelectedCorridor] = useState<MonroviaTrafficSegment | null>(null);

  const [currentLivePos, setCurrentLivePos] = useState<[number, number] | null>(null);

  // Speed and Navigation state
  const [liveSpeed, setLiveSpeed] = useState<number>(0);
  const [etaDuration, setEtaDuration] = useState<number | null>(null);
  const [etaDistance, setEtaDistance] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [nextStep, setNextStep] = useState<NavigationStep | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [vehicleBearing, setVehicleBearing] = useState<number>(45);

  // Search & Presets
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [destinationName, setDestinationName] = useState<string>('');
  const [selectedClientCoords, setSelectedClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLineCleared, setIsLineCleared] = useState<boolean>(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  const activeCoords = useDriverFirebaseLocation(
    driverId || null,
    popupText,
    lat,
    lng,
    destinationLat,
    destinationLng
  );

  // Resolve vehicle classification (Car / Bike / Kekeh / Delivery)
  const vehicleInfo = useMemo(() => {
    const check = (
      (vehicleType || '') + ' ' +
      (popupText || '') + ' ' +
      (driverId || '') + ' ' +
      (activeTrip?.vehicleId || '') + ' ' +
      (activeTrip?.vehicleType || '') + ' ' +
      (activeTrip?.vehicle || '')
    ).toLowerCase();

    if (
      check.includes('kekeh') || 
      check.includes('kesselly') || 
      check.includes('tuk') || 
      check.includes('rickshaw') || 
      check.includes('keke')
    ) {
      return {
        category: 'kekeh' as const,
        label: 'KEKEH RIDE',
        badgeBg: '#ca8a04',
        borderColor: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        badgeText: 'text-yellow-400',
        defaultImage: 'https://i.ibb.co/qLgZhHRF/Screenshot-2026-05-08-234620.png',
        iconSvg: `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-[#eab308] drop-shadow"><path d="M20 10V8h-4V4H7C5.34 4 4 5.34 4 7v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1v-4h-3zm-11 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm9 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-8h-3V6h3v4zM6 7c0-.55.45-1 1-1h7v4H6V7z"/></svg>`
      };
    }

    if (
      check.includes('bike') || 
      check.includes('thorne') || 
      check.includes('motorcycle') || 
      check.includes('express')
    ) {
      return {
        category: 'bike' as const,
        label: 'BIKE EXPRESS',
        badgeBg: '#dc2626',
        borderColor: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        badgeText: 'text-rose-400',
        defaultImage: 'https://i.ibb.co/Xxz3ytxm/Screenshot-2026-05-08-234601.png',
        iconSvg: `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-[#ef4444] drop-shadow"><path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h4.2c.45 2.31 2.44 4 4.9 4 2.8 0 5-2.2 5-5 0-2.55-1.92-4.63-4.36-4.97zM5 17c-1.66 0-3-1.34-3-3s1.34-3 3-3c1.46 0 2.66 1.06 2.94 2.46L6.5 14.5c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.35 1.35C6.08 17.64 5.56 17 5 17zm14 0c-1.66 0-3-1.34-3-3 0-.56.16-1.08.44-1.54l1.35 1.35c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L17.74 11.94C18.02 11.06 18.94 10.46 20 10.46c1.66 0 3 1.34 3 3s-1.34 3-3 3z"/></svg>`
      };
    }

    if (
      check.includes('delivery') || 
      check.includes('logistics') || 
      check.includes('cargo')
    ) {
      return {
        category: 'delivery' as const,
        label: 'DELIVERY VAN',
        badgeBg: '#0284c7',
        borderColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.5)',
        badgeText: 'text-sky-400',
        defaultImage: 'https://i.ibb.co/WNvP6jQ4/Screenshot-2026-05-08-234709.png',
        iconSvg: `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-[#38bdf8] drop-shadow"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`
      };
    }

    // Default to Car / Luxury Sedan / Taxi
    return {
      category: 'car' as const,
      label: 'TAXI / CAR',
      badgeBg: '#ca8a04',
      borderColor: '#e9c349',
      glowColor: 'rgba(233, 195, 73, 0.5)',
      badgeText: 'text-amber-400',
      defaultImage: 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png',
      iconSvg: `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-[#e9c349] drop-shadow"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
    };
  }, [vehicleType, popupText, driverId, activeTrip]);

  const onEtaUpdateRef = useRef(onEtaUpdate);
  useEffect(() => {
    onEtaUpdateRef.current = onEtaUpdate;
  }, [onEtaUpdate]);

  useEffect(() => {
    if (onEtaUpdateRef.current) {
      onEtaUpdateRef.current(etaDuration, etaDistance);
    }
  }, [etaDuration, etaDistance]);

  const onCoordsChangeRef = useRef(onCoordsChange);
  useEffect(() => {
    onCoordsChangeRef.current = onCoordsChange;
  }, [onCoordsChange]);

  useEffect(() => {
    try {
      const tripRef = doc(db, 'drivers', 'active_trip');
      const unsub = onSnapshot(
        tripRef,
        (snap) => {
          if (snap.exists()) {
            setActiveTrip(snap.data());
          }
        },
        (error) => {
          if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('Could not reach Cloud')) {
            return;
          }
          console.warn('Active trip map listener notice:', error);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error('Failed to subscribe to active_trip inside map:', e);
    }
  }, []);

  // Initialize and ensure strict English Web Speech Voice
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const findEnglishVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const preferred =
        voices.find((v) => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en-GB')) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        setEnglishVoice(preferred);
      }
    };

    findEnglishVoice();
    window.speechSynthesis.onvoiceschanged = findEnglishVoice;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Strictly English Voice Navigation Speaker Function
  const speakGuidance = useCallback(
    (text: string) => {
      if (isVoiceMuted || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Strict English locale
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis not available:', e);
      }
    },
    [isVoiceMuted, englishVoice]
  );

  // Fullscreen Handler for Mobile Phones & Desktops
  const toggleFullscreen = useCallback(() => {
    const el = rootWrapperRef.current;
    if (!el) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Filter presets (strictly Liberia locations)
  const filteredPresets = useMemo(() => {
    return LIBERIA_PRESET_LOCATIONS.filter((loc) => {
      const matchesCategory = selectedCategory === 'All' || loc.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Online Nominatim Search - Strictly bounded to Liberia only
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const query = encodeURIComponent(searchQuery);
        // Strictly restricted to Liberia using countrycodes=lr and bounding box
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=lr&viewbox=-11.7,8.7,-7.2,4.1&bounded=1&limit=6&accept-language=en`
        );
        if (res.ok) {
          const data = await res.json();
          const validData = (data || []).filter((item: any) => {
            const latNum = parseFloat(item.lat);
            const lngNum = parseFloat(item.lon);
            return isWithinLiberia(latNum, lngNum);
          });
          setOnlineResults(validData);
        }
      } catch (err) {
        console.warn('Liberia OpenStreetMap search failed:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Leaflet Assets Loader
  useEffect(() => {
    const loadScript = (id: string, src: string, checkObj?: string) => {
      return new Promise<void>((resolve) => {
        if (checkObj) {
          const parts = checkObj.split('.');
          let curr: any = window;
          let exists = true;
          for (const part of parts) {
            if (curr && curr[part] !== undefined) {
              curr = curr[part];
            } else {
              exists = false;
              break;
            }
          }
          if (exists) {
            resolve();
            return;
          }
        }

        const existingScript = document.getElementById(id) as HTMLScriptElement | null;
        if (existingScript) {
          if (checkObj) {
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              const parts = checkObj.split('.');
              let curr: any = window;
              let exists = true;
              for (const part of parts) {
                if (curr && curr[part] !== undefined) {
                  curr = curr[part];
                } else {
                  exists = false;
                  break;
                }
              }
              if (exists || attempts > 50) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          } else {
            resolve();
          }
          return;
        }

        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          if (checkObj) {
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              const parts = checkObj.split('.');
              let curr: any = window;
              let exists = true;
              for (const part of parts) {
                if (curr && curr[part] !== undefined) {
                  curr = curr[part];
                } else {
                  exists = false;
                  break;
                }
              }
              if (exists || attempts > 50) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          } else {
            resolve();
          }
        };
        document.head.appendChild(script);
      });
    };

    const loadStyle = (id: string, href: string) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    };

    const init = async () => {
      loadStyle('leaflet-cdn-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      await loadScript('leaflet-cdn-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'L');
      setPluginsLoaded(true);
    };

    init();
  }, []);

  // Map Tile Switcher URLs (High Resolution & Clear English Labels)
  const getTileConfig = (theme: MapTheme) => {
    switch (theme) {
      case 'google_streets':
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
          options: {
            maxZoom: 20,
            minZoom: 7,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Google Maps (Liberia)'
          }
        };
      case 'google_satellite':
        return {
          url: 'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
          options: {
            maxZoom: 20,
            minZoom: 7,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Google Maps Satellite (Liberia)'
          }
        };
      case 'uber_dark':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            maxZoom: 19,
            minZoom: 7,
            subdomains: ['a', 'b', 'c'],
            attribution: '&copy; OpenStreetMap contributors',
            className: 'dark-tiles'
          }
        };
    }
  };

  // Initialize Map strictly constrained to Liberia
  useEffect(() => {
    if (!pluginsLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    let map: any = null;
    let ro: ResizeObserver | null = null;

    try {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // safe
        }
        mapRef.current = null;
      }
      if ((mapContainerRef.current as any)?._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const [initialLat, initialLng] = sanitizeLiberiaCoords(
        activeCoords.driverLat,
        activeCoords.driverLng
      );

      // Bounding box strictly covering Liberia territory only
      const liberiaBounds = L.latLngBounds(
        L.latLng(LIBERIA_BOUNDS.southWest[0], LIBERIA_BOUNDS.southWest[1]),
        L.latLng(LIBERIA_BOUNDS.northEast[0], LIBERIA_BOUNDS.northEast[1])
      );

      map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        minZoom: 7,
        maxBounds: liberiaBounds,
        maxBoundsViscosity: 1.0, // Hard clamp to Liberia
      }).setView([initialLat, initialLng], 14);

      mapRef.current = map;

      const tileConfig = getTileConfig(mapTheme);
      tileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 100);

      ro = new ResizeObserver(() => {
        if (map) map.invalidateSize();
      });
      ro.observe(mapContainerRef.current);

      // Tap / Click Handler on map - Clamped to Liberia
      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (!isWithinLiberia(clickLat, clickLng)) {
          speakGuidance('Please select a destination located within Liberia.');
          return;
        }

        setSelectedClientCoords({ lat: clickLat, lng: clickLng });
        setIsLineCleared(false);
        const pinLabel = `Pin in Monrovia (${clickLat.toFixed(4)}, ${clickLng.toFixed(4)})`;
        setDestinationName(pinLabel);
        if (onCoordsChangeRef.current) {
          onCoordsChangeRef.current(clickLat, clickLng, pinLabel);
        }
      });
    } catch (err) {
      console.error('Leaflet map creation failed:', err);
    }

    return () => {
      if (ro) ro.disconnect();
      if (map) {
        try {
          map.remove();
        } catch (e) {
          // safe
        }
        mapRef.current = null;
      }
    };
  }, [pluginsLoaded]);

  // Update Tile Layer when MapTheme changes
  useEffect(() => {
    if (!mapRef.current || !pluginsLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    if (tileLayerRef.current) {
      try {
        mapRef.current.removeLayer(tileLayerRef.current);
      } catch (e) {
        // safe
      }
    }

    const tileConfig = getTileConfig(mapTheme);
    tileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(mapRef.current);
  }, [mapTheme, pluginsLoaded]);

  // Real OSRM Road Routing Calculation for Liberia
  const [startLat, startLng] = sanitizeLiberiaCoords(
    isWithinLiberia(activeCoords.driverLat, activeCoords.driverLng) ? activeCoords.driverLat : (lat || 6.3135),
    isWithinLiberia(activeCoords.driverLat, activeCoords.driverLng) ? activeCoords.driverLng : (lng || -10.8055)
  );

  // Determine if the ride is in active live transit
  const isRideInTransit = Boolean(
    (hasActiveTrip || activeTrip?.status === 'transit' || activeTrip?.status === 'in_transit') &&
    (tripStatus === 'transit' || tripStatus === 'in_transit' || activeTrip?.status === 'transit')
  );

  // Real-Time Monrovia Traffic Congestion Layer on Leaflet
  useEffect(() => {
    if (!pluginsLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!trafficLayerGroupRef.current) {
      trafficLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    } else {
      trafficLayerGroupRef.current.clearLayers();
    }

    if (!showTrafficOverlay) return;

    MONROVIA_TRAFFIC_CORRIDORS.forEach((corridor) => {
      // 1. Casing / background contrast line
      L.polyline(corridor.coords, {
        color: '#000000',
        weight: 9,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(trafficLayerGroupRef.current);

      // 2. Glowing traffic status polyline
      const trafficLine = L.polyline(corridor.coords, {
        color: corridor.color,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(trafficLayerGroupRef.current);

      const statusBadge = corridor.status === 'free' 
        ? '<span style="color:#22c55e;font-weight:bold;">● Free Flow (Clear)</span>'
        : corridor.status === 'moderate'
        ? '<span style="color:#eab308;font-weight:bold;">▲ Moderate Commute</span>'
        : corridor.status === 'heavy'
        ? '<span style="color:#ef4444;font-weight:bold;">■ Heavy Congestion</span>'
        : '<span style="color:#991b1b;font-weight:bold;">✕ Severe Bottleneck</span>';

      const delayBadge = corridor.delayMins > 0 
        ? `<div style="margin-top:4px;font-size:11px;color:#ef4444;font-family:monospace;font-weight:bold;">+${corridor.delayMins} min potential delay</div>`
        : `<div style="margin-top:4px;font-size:11px;color:#22c55e;font-family:monospace;font-weight:bold;">0 min delay • Swift Corridor</div>`;

      trafficLine.bindPopup(`
        <div style="font-family:system-ui, sans-serif; min-width: 190px; padding: 4px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-family: monospace;">Monrovia Traffic Corridor</div>
          <div style="font-weight: bold; font-size: 13px; color: #111827; margin-top: 2px;">${corridor.name}</div>
          <div style="margin-top: 6px; font-size: 12px;">${statusBadge} • <strong>${corridor.speedKmH} km/h</strong></div>
          ${delayBadge}
          <div style="margin-top: 4px; font-size: 11px; color: #4b5563;">${corridor.description}</div>
        </div>
      `);

      // 3. Bottleneck / Delay Hotspot Pill Marker
      if (corridor.delayMins > 0 && corridor.coords.length > 0) {
        const midPoint = corridor.coords[Math.floor(corridor.coords.length / 2)];
        const delayIcon = L.divIcon({
          className: 'traffic-delay-marker',
          html: `
            <div style="
              background: ${corridor.color};
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              font-family: monospace;
              padding: 2px 7px;
              border-radius: 9999px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              border: 1.5px solid #ffffff;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 3px;
              transform: translate(-50%, -50%);
              cursor: pointer;
            ">
              <span>🚦 +${corridor.delayMins}m</span>
            </div>
          `,
          iconSize: [46, 22],
          iconAnchor: [23, 11],
        });

        const delayMarker = L.marker(midPoint, { icon: delayIcon }).addTo(trafficLayerGroupRef.current);
        delayMarker.bindPopup(`
          <div style="font-family:system-ui, sans-serif; padding: 4px; min-width: 170px;">
            <div style="font-weight:bold; font-size:12px; color:#111;">${corridor.name}</div>
            <div style="font-size:11px; color:#dc2626; font-weight:bold; margin-top:2px;">+${corridor.delayMins} Min Congestion Delay</div>
            <div style="font-size:10px; color:#666; margin-top:2px;">Avg Flow Speed: ${corridor.speedKmH} km/h</div>
            <div style="font-size:10px; color:#4b5563; margin-top:2px;">${corridor.description}</div>
          </div>
        `);
      }
    });
  }, [showTrafficOverlay, pluginsLoaded]);

  const rawDestLat = selectedClientCoords
    ? selectedClientCoords.lat
    : isLineCleared
    ? undefined
    : activeCoords.clientLat !== undefined && isWithinLiberia(activeCoords.clientLat, activeCoords.clientLng || -10.8055)
    ? activeCoords.clientLat
    : destinationLat && isWithinLiberia(destinationLat, destinationLng || -10.8055)
    ? destinationLat
    : undefined;

  const rawDestLng = selectedClientCoords
    ? selectedClientCoords.lng
    : isLineCleared
    ? undefined
    : activeCoords.clientLng !== undefined && isWithinLiberia(activeCoords.clientLat || 6.3135, activeCoords.clientLng)
    ? activeCoords.clientLng
    : destinationLng && isWithinLiberia(destinationLat || 6.3135, destinationLng)
    ? destinationLng
    : undefined;

  const [destLat, destLng] = (rawDestLat !== undefined && rawDestLng !== undefined && isWithinLiberia(rawDestLat, rawDestLng))
    ? [rawDestLat, rawDestLng]
    : [undefined, undefined];

  useEffect(() => {
    if (!startLat || !startLng || !destLat || !destLng || isLineCleared) {
      setRouteCoordinates([]);
      setEtaDuration(null);
      setEtaDistance(null);
      setCurrentStep(null);
      setNextStep(null);
      return;
    }

    let isSubscribed = true;

    const fetchOsrmRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0 && isSubscribed) {
            const primaryRoute = data.routes[0];
            const coords: [number, number][] = primaryRoute.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            setRouteCoordinates(coords);

            const durationMins = Math.max(3, Math.round(primaryRoute.duration / 60));
            const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
            setEtaDuration(durationMins);
            setEtaDistance(distanceKm);

            // Parse navigation steps for English turn-by-turn banner
            if (primaryRoute.legs && primaryRoute.legs[0] && primaryRoute.legs[0].steps) {
              const rawSteps = primaryRoute.legs[0].steps;
              const mappedSteps: NavigationStep[] = rawSteps.map((s: any) => {
                const type = s.maneuver?.type || 'straight';
                const modifier = s.maneuver?.modifier || '';
                let maneuver: NavigationStep['maneuver'] = 'straight';
                if (type === 'arrive') maneuver = 'arrive';
                else if (type === 'depart') maneuver = 'depart';
                else if (modifier.includes('right')) maneuver = 'turn-right';
                else if (modifier.includes('left')) maneuver = 'turn-left';
                else if (type.includes('roundabout')) maneuver = 'roundabout';
                else if (type.includes('fork')) maneuver = 'fork';

                const defaultRoad = 'Tubman Boulevard / Main Road';
                const cleanName = s.name && s.name.trim() ? s.name : defaultRoad;

                let instruction = `Continue straight on ${cleanName}`;
                if (maneuver === 'turn-right') instruction = `Turn right onto ${cleanName}`;
                else if (maneuver === 'turn-left') instruction = `Turn left onto ${cleanName}`;
                else if (maneuver === 'roundabout') instruction = `Enter roundabout towards ${cleanName}`;
                else if (maneuver === 'arrive') instruction = 'You will arrive at your destination';

                return {
                  instruction,
                  distanceMeters: Math.round(s.distance || 0),
                  durationSeconds: Math.round(s.duration || 0),
                  maneuver,
                  streetName: cleanName
                };
              });

              if (mappedSteps.length > 0) {
                const first = mappedSteps.find((s) => s.distanceMeters > 25) || mappedSteps[0];
                const second = mappedSteps[mappedSteps.indexOf(first) + 1] || null;
                setCurrentStep(first);
                setNextStep(second);
              }
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Liberia OSRM routing network delay:', e);
      }

      // Smart Monrovia road interpolation fallback if OSRM is unreachable
      if (isSubscribed) {
        const dLat = destLat - startLat;
        const dLng = destLng - startLng;
        const approxDistKm = Number((Math.sqrt(dLat * dLat + dLng * dLng) * 111).toFixed(1));
        const approxMins = Math.max(3, Math.round(approxDistKm * 2.4));

        const mid1: [number, number] = [startLat + dLat * 0.35 + 0.003, startLng + dLng * 0.25 - 0.002];
        const mid2: [number, number] = [startLat + dLat * 0.7 + 0.002, startLng + dLng * 0.65 + 0.001];
        setRouteCoordinates([
          [startLat, startLng],
          mid1,
          mid2,
          [destLat, destLng]
        ]);
        setEtaDuration(approxMins);
        setEtaDistance(approxDistKm);
        setCurrentStep({
          instruction: 'Proceed on Tubman Boulevard / Capital Bypass',
          distanceMeters: Math.round(approxDistKm * 350),
          durationSeconds: approxMins * 60,
          maneuver: 'straight',
          streetName: 'Tubman Boulevard, Monrovia'
        });
      }
    };

    fetchOsrmRoute();

    return () => {
      isSubscribed = false;
    };
  }, [startLat, startLng, destLat, destLng, isLineCleared]);

  // Live Real-Time Movement Engine along Route Coordinates
  useEffect(() => {
    if (!startLat || !startLng) return;

    // If ride is completed, place vehicle at destination
    if (tripStatus === 'completed' && destLat && destLng) {
      setCurrentLivePos([destLat, destLng]);
      setLiveSpeed(0);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([destLat, destLng]);
      }
      return;
    }

    // If the ride has not started (e.g. waiting, standby, no active transit), keep parked at pickup/start point
    if (!isRideInTransit) {
      setCurrentLivePos([startLat, startLng]);
      setLiveSpeed(0);
      if (destLat && destLng) {
        const bearing = calculateBearing(startLat, startLng, destLat, destLng);
        setVehicleBearing(bearing);
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([startLat, startLng]);
      }
      return;
    }

    // If in active transit but no multi-point route yet, keep initial bearing
    if (routeCoordinates.length < 2) {
      if (destLat && destLng) {
        const bearing = calculateBearing(startLat, startLng, destLat, destLng);
        setVehicleBearing(bearing);
      }
      return;
    }

    // Precalculate segment distances in meters
    const segmentDistances: number[] = [];
    let totalRouteMeters = 0;
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const p1 = routeCoordinates[i];
      const p2 = routeCoordinates[i + 1];
      const dLat = (p2[0] - p1[0]) * 111320;
      const dLng = (p2[1] - p1[1]) * 111320 * Math.cos((p1[0] * Math.PI) / 180);
      const segDist = Math.sqrt(dLat * dLat + dLng * dLng);
      segmentDistances.push(segDist);
      totalRouteMeters += segDist;
    }

    if (totalRouteMeters <= 0) return;

    let animFrame: number;
    let lastTime = performance.now();
    let currentDistance = 0;
    let lastFirestoreSyncTime = 0;
    let lastReactUpdateTime = 0;
    setLiveSpeed(42);

    const moveStep = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.2); // seconds
      lastTime = time;

      if (isRideInTransit && totalRouteMeters > 0) {
        // Speed in m/s (liveSpeed km/h -> m/s)
        const currentSpeed = liveSpeed > 0 ? liveSpeed : 42;
        const speedMetersPerSec = (currentSpeed * 1000) / 3600;
        currentDistance += speedMetersPerSec * dt;

        // Cap at destination when reached
        if (currentDistance >= totalRouteMeters) {
          currentDistance = totalRouteMeters;
        }

        // Find current segment along route
        let accumulated = 0;
        let segIdx = 0;
        for (let i = 0; i < segmentDistances.length; i++) {
          if (accumulated + segmentDistances[i] >= currentDistance) {
            segIdx = i;
            break;
          }
          accumulated += segmentDistances[i];
        }

        const segDist = segmentDistances[segIdx] || 1;
        const segProgress = Math.max(0, Math.min(1, (currentDistance - accumulated) / segDist));

        const p1 = routeCoordinates[segIdx];
        const p2 = routeCoordinates[Math.min(segIdx + 1, routeCoordinates.length - 1)];

        if (p1 && p2) {
          const curLat = p1[0] + (p2[0] - p1[0]) * segProgress;
          const curLng = p1[1] + (p2[1] - p1[1]) * segProgress;
          const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

          // Update Leaflet marker directly for buttery-smooth 60fps movement without React re-render overhead
          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLatLng([curLat, curLng]);
          }

          // Dynamically trim traveled polyline so navigation path updates in real-time
          if (routePolylineRef.current) {
            const remainingCoords = [[curLat, curLng], ...routeCoordinates.slice(segIdx + 1)];
            routePolylineRef.current.setLatLngs(remainingCoords);
          }

          // Pan camera if in follow mode
          if (isFollowMode && mapRef.current) {
            mapRef.current.panTo([curLat, curLng], { animate: true, duration: 0.2 });
          }

          // Throttle React state updates to 1 second intervals to prevent frame drops
          if (time - lastReactUpdateTime > 1000 || currentDistance >= totalRouteMeters) {
            lastReactUpdateTime = time;
            setCurrentLivePos([curLat, curLng]);
            setVehicleBearing(bearing);
          }

          // Sync to Firestore every 4 seconds for live cross-device passenger tracking
          if (driverId && !isPassiveTracking && time - lastFirestoreSyncTime > 4000) {
            lastFirestoreSyncTime = time;
            try {
              updateDoc(doc(db, 'drivers', driverId), {
                lat: curLat,
                lng: curLng,
                bearing: bearing,
                speed: currentSpeed,
                updatedAt: new Date().toISOString()
              }).catch(() => {});
              
              updateDoc(doc(db, 'drivers', 'active_trip'), {
                driverLat: curLat,
                driverLng: curLng,
                bearing: bearing,
                speed: currentSpeed,
                updatedAt: new Date().toISOString()
              }).catch(() => {});
            } catch (e) {
              // safe
            }
          }
        }
      }

      if (isRideInTransit) {
        animFrame = requestAnimationFrame(moveStep);
      }
    };

    if (isRideInTransit) {
      animFrame = requestAnimationFrame(moveStep);
    }

    // Speedometer realistic fluctuation interval when in transit
    let speedInterval: any = null;
    if (isRideInTransit) {
      speedInterval = setInterval(() => {
        setLiveSpeed((prev) => {
          const change = (Math.random() - 0.5) * 6;
          const next = Math.max(34, Math.min(54, Math.round((prev || 42) + change)));
          return next;
        });
      }, 2000);
    } else {
      setLiveSpeed(0);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (speedInterval) clearInterval(speedInterval);
    };
  }, [
    startLat,
    startLng,
    destLat,
    destLng,
    routeCoordinates,
    isRideInTransit,
    isFollowMode,
    driverId,
    isPassiveTracking,
    tripStatus,
    hasActiveTrip
  ]);

  // Render & Update Markers and Navigation Path on Leaflet Map
  useEffect(() => {
    if (!mapRef.current || !pluginsLoaded) return;
    const L = (window as any).L;
    if (!L) return;
    const map = mapRef.current;

    const currentDriverPos: [number, number] = currentLivePos || [startLat, startLng];

    if (isFollowMode && !activeTrip) {
      map.panTo(currentDriverPos, { animate: true, duration: 0.6 });
    }

    const resolvedImage = markerImage || vehicleInfo.defaultImage;

    // High-Resolution Ride Marker with Vehicle Specific Icon, Headlight Beam, and Live Pulse
    const driverIconHtml = `
      <div class="relative flex flex-col items-center justify-center pointer-events-auto" style="width: 72px; height: 72px; margin-left: -36px; margin-top: -36px;">
        <!-- Pulsing GPS Radar Wave with Vehicle Theme Color -->
        <div class="absolute w-16 h-16 rounded-full pointer-events-none animate-ping" style="background-color: ${vehicleInfo.glowColor};"></div>
        
        <!-- Forward Headlight Projector Beam -->
        <div class="absolute w-24 h-32 pointer-events-none -top-14 left-1/2 -translate-x-1/2 origin-bottom transition-transform duration-200" style="transform: rotate(${vehicleBearing}deg); opacity: ${mapTheme === 'uber_dark' ? 0.55 : 0.28}; background: radial-gradient(circle at 50% 100%, ${vehicleInfo.borderColor} 0%, ${vehicleInfo.glowColor} 55%, transparent 80%); clip-path: polygon(25% 0%, 75% 0%, 60% 100%, 40% 100%);"></div>

        <!-- 3D Vehicle Icon Capsule with Smooth Rotation -->
        <div class="relative w-12 h-12 rounded-full border-2 bg-[#0c0f12] shadow-[0_8px_24px_rgba(0,0,0,0.9),0_0_16px_${vehicleInfo.glowColor}] flex items-center justify-center z-20 transition-transform duration-200" style="border-color: ${vehicleInfo.borderColor}; transform: rotate(${vehicleBearing}deg);">
          <img 
            src="${resolvedImage}" 
            alt="${vehicleInfo.label}" 
            class="w-full h-full object-cover rounded-full" 
            onerror="this.src='${vehicleInfo.defaultImage}'"
          />
          
          <!-- Mini Vector Vehicle Badge Overlay -->
          <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111418] border border-white/20 flex items-center justify-center shadow-md">
            ${vehicleInfo.iconSvg}
          </div>
        </div>

        <!-- Floating Live Tag: Vehicle Type Badge & Speed -->
        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0a0d10]/90 backdrop-blur-md border border-white/15 shadow-xl whitespace-nowrap pointer-events-none">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-[8px] font-black uppercase tracking-wider font-mono ${vehicleInfo.badgeText}">
            ${vehicleInfo.label}
          </span>
          <span class="text-[7.5px] font-bold text-gray-300 font-mono">
            ${liveSpeed}km/h
          </span>
        </div>
      </div>
    `;

    const driverIcon = L.divIcon({
      html: driverIconHtml,
      className: 'custom-vehicle-leaflet-icon',
      iconSize: [72, 72],
      iconAnchor: [36, 36]
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setIcon(driverIcon);
      driverMarkerRef.current.setLatLng(currentDriverPos);
    } else {
      driverMarkerRef.current = L.marker(currentDriverPos, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
      driverMarkerRef.current.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; padding: 6px; color: #ffffff; background-color: #0c0f0f; border-radius: 8px; min-width: 140px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: ${vehicleInfo.borderColor};">${vehicleInfo.label}</span>
            <span style="font-size: 9px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 1px 4px; border-radius: 4px; font-weight: bold;">LIVE</span>
          </div>
          <p style="margin: 0; font-size: 10px; color: #9ca3af; font-family: monospace;">${popupText}</p>
        </div>
      `, { closeButton: false, className: 'custom-leaflet-popup' });
    }

    // Destination Pin Marker
    if (destLat && destLng && !isLineCleared) {
      const clientIconHtml = `
        <div class="relative flex items-center justify-center w-12 h-12" style="margin-left: -14px; margin-top: -14px;">
          <div class="absolute w-10 h-10 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="w-8 h-8 rounded-full border-2 border-emerald-400 bg-[#0f172a] shadow-[0_4px_16px_rgba(16,185,129,0.7)] flex items-center justify-center relative z-10">
            <span class="material-symbols-outlined text-emerald-400 text-sm font-bold">location_on</span>
          </div>
        </div>
      `;

      const clientIcon = L.divIcon({
        html: clientIconHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (clientMarkerRef.current) {
        clientMarkerRef.current.setLatLng([destLat, destLng]);
      } else {
        clientMarkerRef.current = L.marker([destLat, destLng], { icon: clientIcon, zIndexOffset: 900 }).addTo(map);
      }
    } else if (clientMarkerRef.current) {
      try {
        map.removeLayer(clientMarkerRef.current);
        clientMarkerRef.current = null;
      } catch (e) {
        // safe
      }
    }

    // Route Polyline (Glow + Solid Uber Blue Navigation Path)
    if (routeCoordinates.length > 0 && !isLineCleared) {
      // Background glow casing
      if (routeCasingRef.current) {
        routeCasingRef.current.setLatLngs(routeCoordinates);
      } else {
        routeCasingRef.current = L.polyline(routeCoordinates, {
          color: mapTheme === 'uber_dark' ? '#0284c7' : '#1d4ed8',
          weight: 9,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      }

      // Foreground sharp navigation line
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routeCoordinates);
      } else {
        routePolylineRef.current = L.polyline(routeCoordinates, {
          color: '#38bdf8',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'leaflet-uber-route-line'
        }).addTo(map);
      }
    } else {
      if (routePolylineRef.current) {
        try {
          map.removeLayer(routePolylineRef.current);
          routePolylineRef.current = null;
        } catch (e) {
          // safe
        }
      }
      if (routeCasingRef.current) {
        try {
          map.removeLayer(routeCasingRef.current);
          routeCasingRef.current = null;
        } catch (e) {
          // safe
        }
      }
    }
  }, [
    pluginsLoaded,
    startLat,
    startLng,
    destLat,
    destLng,
    isLineCleared,
    routeCoordinates,
    activeTrip,
    isFollowMode,
    mapTheme,
    markerImage,
    popupText,
    vehicleBearing,
    vehicleInfo,
    liveSpeed,
    currentLivePos
  ]);

  // Handle Location Pick from Search (English notification + Map pan)
  const handleSelectLocation = (locLat: number, locLng: number, locName: string) => {
    if (!isWithinLiberia(locLat, locLng)) {
      speakGuidance('Selected destination is outside of Liberia.');
      return;
    }

    setSelectedClientCoords({ lat: locLat, lng: locLng });
    setIsLineCleared(false);
    setDestinationName(locName);
    setIsSearchOpen(false);

    if (mapRef.current) {
      mapRef.current.flyTo([locLat, locLng], 15, { duration: 1.2 });
    }

    speakGuidance(`Route locked to ${locName}, Liberia.`);

    if (onCoordsChangeRef.current) {
      onCoordsChangeRef.current(locLat, locLng, locName);
    }
  };

  const getFormattedArrivalTime = (durationMins: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMins);
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };

  return (
    <div
      ref={rootWrapperRef}
      id="liberia-interactive-map-root"
      className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[99999] h-screen w-screen bg-black' : 'h-full min-h-[inherit]'} overflow-hidden select-none ${is3DTilt ? 'perspective-tilt' : ''} ${className}`}
      style={{ height: isFullscreen ? '100vh' : height, minHeight: isFullscreen ? '100vh' : '100%' }}
    >
      <style>{`
        .perspective-tilt {
          transform: perspective(900px) rotateX(16deg);
          transform-origin: center bottom;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .leaflet-uber-route-line {
          stroke-dasharray: 6, 8 !important;
          animation: uber-route-flow 1.2s linear infinite !important;
        }
        @keyframes uber-route-flow {
          from { stroke-dashoffset: 14px; }
          to { stroke-dashoffset: 0px; }
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: #0f1115 !important;
          border: 1px solid rgba(233, 195, 73, 0.4) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,0.85) !important;
          border-radius: 8px !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: #0f1115 !important;
          border: 1px solid rgba(233, 195, 73, 0.4) !important;
        }
      `}</style>

      {/* Map Root */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0a0a0a]" style={{ height: '100%' }}></div>

      {/* Liberia GPS Banner / Fullscreen Quick Exit Header */}
      {isFullscreen && (
        <div className="absolute top-3 left-3 z-[1001] flex items-center gap-2 bg-[#0c0f12]/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-2xl animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold text-white uppercase tracking-wider font-sans">
            Liberia Fullscreen GPS
          </span>
          <button
            onClick={toggleFullscreen}
            className="ml-2 bg-white/10 hover:bg-white/20 text-[#e9c349] p-1 rounded-full flex items-center justify-center transition-transform active:scale-95"
            title="Exit Fullscreen Mode"
          >
            <span className="material-symbols-outlined text-sm">close_fullscreen</span>
          </button>
        </div>
      )}

      {/* Top Turn-by-Turn Navigation HUD (English Maneuver Banner) */}
      {etaDuration !== null && currentStep && (
        <div className={`absolute ${isFullscreen ? 'top-14' : 'top-3'} left-3 right-16 z-[1000] max-w-md mx-auto pointer-events-auto`}>
          <div className="bg-[#0f172a]/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-3.5 transition-all">
            {/* Maneuver Arrow Sign */}
            <div className="w-12 h-12 rounded-xl bg-emerald-600 border border-emerald-400/50 flex flex-col items-center justify-center text-white shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-2xl font-black">
                {currentStep.maneuver === 'turn-right' ? 'turn_right' :
                 currentStep.maneuver === 'turn-left' ? 'turn_left' :
                 currentStep.maneuver === 'roundabout' ? 'roundabout_right' :
                 currentStep.maneuver === 'arrive' ? 'sports_score' : 'straight'}
              </span>
              <span className="text-[9px] font-black tracking-tighter leading-none mt-0.5">
                {currentStep.distanceMeters >= 1000 ? `${(currentStep.distanceMeters/1000).toFixed(1)}km` : `${currentStep.distanceMeters}m`}
              </span>
            </div>

            {/* Instruction Text (Strictly English) */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                In {currentStep.distanceMeters} meters
              </p>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate font-sans">
                {currentStep.instruction}
              </h4>
              {nextStep && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  Then: <span className="text-gray-200">{nextStep.streetName}</span>
                </p>
              )}
            </div>

            {/* English Voice Speaker Button */}
            <button
              onClick={() => speakGuidance(`In ${currentStep.distanceMeters} meters, ${currentStep.instruction}`)}
              className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 text-emerald-400 flex items-center justify-center shrink-0 transition-transform active:scale-90"
              title="Speak GPS Navigation Prompt in English"
            >
              <span className="material-symbols-outlined text-xl">volume_up</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Vehicle Status Capsule & Real-Time Status Indicator */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#0c0f12]/95 backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-black/50 shrink-0">
            <img 
              src={markerImage || vehicleInfo.defaultImage} 
              alt={vehicleInfo.label} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://i.ibb.co/bRsvmnm0/Screenshot-2026-05-08-234535.png';
              }}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isRideInTransit ? 'bg-emerald-400 animate-pulse' : tripStatus === 'completed' ? 'bg-sky-400' : 'bg-amber-400'}`}></span>
              <span className={`text-[10px] font-black uppercase tracking-wider font-mono ${vehicleInfo.badgeText}`}>
                {vehicleInfo.label}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                isRideInTransit 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : tripStatus === 'completed'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isRideInTransit ? 'LIVE IN TRANSIT' : tripStatus === 'completed' ? 'ARRIVED' : 'STANDBY'}
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-mono">
              {isRideInTransit ? `Moving Real-Time • ${liveSpeed} km/h` : tripStatus === 'completed' ? 'Journey Finished' : 'GPS Standby • Awaiting Start'}
            </span>
          </div>

          {/* Quick Traffic Advisory Trigger */}
          <button
            onClick={() => setShowTrafficOverlay(!showTrafficOverlay)}
            className={`ml-1 px-2 py-1 rounded-xl flex items-center gap-1 border transition-all active:scale-95 text-[9px] font-mono font-bold ${
              showTrafficOverlay 
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-400' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="Toggle Monrovia Real-Time Traffic Overlay"
          >
            <span className="material-symbols-outlined text-xs">traffic</span>
            <span>{showTrafficOverlay ? 'TRAFFIC ON' : 'TRAFFIC'}</span>
          </button>
        </div>
      </div>

      {/* Integrated Search & Location Preset Bar for Liberia */}
      {showSearch && (
        <div className={`absolute ${etaDuration !== null && currentStep ? (isFullscreen ? 'top-32' : 'top-20') : (isFullscreen ? 'top-16' : 'top-14')} left-3 z-[1000] w-[calc(100%-4.5rem)] max-w-sm transition-all`}>
          <div className="bg-[#111418]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-3 py-2.5 gap-2">
              <span className="material-symbols-outlined text-[#e9c349] text-lg shrink-0">search</span>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Search Liberia destinations (Mamba Point, RIA, Sinkor)..."
                className="w-full bg-transparent text-xs text-white placeholder:text-gray-400 focus:outline-none font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setOnlineResults([]);
                  }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Quick Category Chips for Liberia */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-white/5 overflow-x-auto scrollbar-none text-[10px]">
              {['All', 'Hotel', 'Airport', 'Landmark', 'Market', 'Area', 'County'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsSearchOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-full uppercase font-mono font-bold transition-all shrink-0 active:scale-95 ${
                    selectedCategory === cat
                      ? 'bg-[#e9c349] text-black shadow-sm'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Autocomplete Results in Liberia */}
            {isSearchOpen && (
              <div className="max-h-60 overflow-y-auto border-t border-white/10 bg-[#0d0f12] divide-y divide-white/5">
                {filteredPresets.map((preset) => (
                  <div
                    key={preset.name}
                    onClick={() => handleSelectLocation(preset.lat, preset.lng, preset.name)}
                    className="p-3 hover:bg-white/10 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">
                        {preset.category === 'Airport' ? 'flight' : preset.category === 'Hotel' ? 'hotel' : preset.category === 'Market' ? 'storefront' : 'location_on'}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-white group-hover:text-[#e9c349] transition-colors truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{preset.description}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 shrink-0">
                      {preset.category}
                    </span>
                  </div>
                ))}

                {onlineResults.map((res: any, idx: number) => {
                  const latNum = parseFloat(res.lat);
                  const lngNum = parseFloat(res.lon);
                  return (
                    <div
                      key={`online-${idx}`}
                      onClick={() => handleSelectLocation(latNum, lngNum, res.display_name.split(',')[0])}
                      className="p-3 hover:bg-white/10 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">travel_explore</span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white group-hover:text-[#e9c349] transition-colors truncate">
                            {res.display_name.split(',')[0]}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{res.display_name}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        Liberia Map
                      </span>
                    </div>
                  );
                })}

                {filteredPresets.length === 0 && onlineResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {isSearchingOnline ? 'Searching Liberia map...' : 'No location found. Tap map to set pin in Liberia.'}
                  </div>
                )}

                <div className="p-2 bg-black/40 text-center border-t border-white/5">
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider"
                  >
                    Close Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Controls Stack (Optimized for Mobile Phone Thumbs) */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2.5 pointer-events-auto">
        {/* Fullscreen Toggle Button */}
        <button
          id="btn-map-fullscreen-toggle"
          onClick={toggleFullscreen}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            isFullscreen
              ? 'bg-[#e9c349] border-[#e9c349] text-black font-bold'
              : 'bg-[#111418]/95 border-white/20 text-[#e9c349] hover:bg-[#1b2026]'
          }`}
          title={isFullscreen ? 'Exit Full Screen' : 'Open Full Screen Map'}
        >
          <span className="material-symbols-outlined text-xl">
            {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
          </span>
        </button>

        {/* Map Theme Toggle (Uber Dark, Google Streets, Google Satellite) */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-white/20 bg-[#111418]/95 backdrop-blur shadow-2xl divide-y divide-white/10">
          <button
            onClick={() => setMapTheme('uber_dark')}
            className={`w-11 h-11 flex items-center justify-center transition-colors active:scale-95 ${mapTheme === 'uber_dark' ? 'bg-[#e9c349] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            title="Uber Dark Navigation Theme"
          >
            <span className="material-symbols-outlined text-lg">dark_mode</span>
          </button>
          <button
            onClick={() => setMapTheme('google_streets')}
            className={`w-11 h-11 flex items-center justify-center transition-colors active:scale-95 ${mapTheme === 'google_streets' ? 'bg-[#e9c349] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            title="Google Maps Streets (English Labels)"
          >
            <span className="material-symbols-outlined text-lg">map</span>
          </button>
          <button
            onClick={() => setMapTheme('google_satellite')}
            className={`w-11 h-11 flex items-center justify-center transition-colors active:scale-95 ${mapTheme === 'google_satellite' ? 'bg-[#e9c349] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            title="Google Maps Satellite Hybrid"
          >
            <span className="material-symbols-outlined text-lg">satellite_alt</span>
          </button>
        </div>

        {/* 3D Perspective Toggle */}
        <button
          onClick={() => setIs3DTilt(!is3DTilt)}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            is3DTilt ? 'bg-sky-500/20 border-sky-400 text-sky-400' : 'bg-[#111418]/95 border-white/20 text-gray-300 hover:text-white'
          }`}
          title="Toggle 3D Driver Angle"
        >
          <span className="material-symbols-outlined text-lg">3d_rotation</span>
        </button>

        {/* Follow Driver / Recenter GPS Button */}
        <button
          onClick={() => {
            setIsFollowMode(true);
            if (mapRef.current) {
              mapRef.current.flyTo([startLat, startLng], 15, { duration: 0.8 });
            }
          }}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            isFollowMode ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'bg-[#111418]/95 border-white/20 text-gray-300 hover:text-white'
          }`}
          title="Recenter GPS on Chauffeur"
        >
          <span className="material-symbols-outlined text-lg">near_me</span>
        </button>

        {/* Monrovia Real-Time Traffic Overlay Toggle */}
        <button
          id="btn-traffic-overlay-toggle"
          onClick={() => {
            const nextState = !showTrafficOverlay;
            setShowTrafficOverlay(nextState);
            if (nextState) {
              speakGuidance('Monrovia real-time traffic congestion overlay enabled.');
            }
          }}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            showTrafficOverlay
              ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'bg-[#111418]/95 border-white/20 text-gray-400 hover:text-white'
          }`}
          title={showTrafficOverlay ? 'Hide Real-Time Traffic Congestion' : 'Show Real-Time Monrovia Traffic Congestion'}
        >
          <span className="material-symbols-outlined text-lg">traffic</span>
        </button>

        {/* Traffic Advisory Details Panel Button */}
        <button
          id="btn-traffic-advisory-panel"
          onClick={() => setShowTrafficPanel(!showTrafficPanel)}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            showTrafficPanel
              ? 'bg-[#e9c349] border-[#e9c349] text-black font-bold'
              : 'bg-[#111418]/95 border-white/20 text-gray-300 hover:text-white'
          }`}
          title="Monrovia Corridor Delay Advisory"
        >
          <span className="material-symbols-outlined text-lg">commute</span>
        </button>

        {/* Voice Guidance Toggle (English Speech) */}
        <button
          onClick={() => {
            const nextMuted = !isVoiceMuted;
            setIsVoiceMuted(nextMuted);
            if (!nextMuted) {
              speakGuidance('English voice guidance enabled in Liberia.');
            }
          }}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            isVoiceMuted ? 'bg-rose-950/50 border-rose-700 text-rose-400' : 'bg-[#111418]/95 border-white/20 text-emerald-400 hover:text-white'
          }`}
          title={isVoiceMuted ? 'Unmute English GPS Voice' : 'Mute GPS Voice'}
        >
          <span className="material-symbols-outlined text-lg">
            {isVoiceMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
      </div>

      {/* Monrovia Real-Time Traffic Advisory Panel Drawer */}
      {showTrafficPanel && (
        <div className="absolute top-16 right-16 z-[1001] w-80 sm:w-96 max-w-[calc(100vw-5rem)] bg-[#0d1015]/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">traffic</span>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Monrovia Traffic Advisory</h4>
                <p className="text-[10px] text-gray-400 font-mono">Live Congestion & Corridors</p>
              </div>
            </div>
            <button
              onClick={() => setShowTrafficPanel(false)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Traffic Legend */}
          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono mb-3 bg-black/40 p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Free Flow (45+ km/h)</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span>Moderate (25-40 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Heavy (10-25 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-700"></span>
              <span>Bottleneck (&lt;10 km/h)</span>
            </div>
          </div>

          {/* Corridors List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {MONROVIA_TRAFFIC_CORRIDORS.map((corridor) => (
              <div
                key={corridor.id}
                onClick={() => {
                  if (mapRef.current && corridor.coords.length > 0) {
                    mapRef.current.flyTo(corridor.coords[0], 15, { duration: 1 });
                  }
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                      {corridor.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{corridor.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${corridor.color}20`,
                        color: corridor.color,
                        border: `1px solid ${corridor.color}40`,
                      }}
                    >
                      {corridor.speedKmH} km/h
                    </span>
                    {corridor.delayMins > 0 ? (
                      <p className="text-[9px] font-mono font-bold text-rose-400 mt-1">+{corridor.delayMins}m delay</p>
                    ) : (
                      <p className="text-[9px] font-mono font-bold text-emerald-400 mt-1">Clear</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>Layer Status: {showTrafficOverlay ? 'Active on Map' : 'Layer Hidden'}</span>
            <button
              onClick={() => setShowTrafficOverlay(!showTrafficOverlay)}
              className="text-amber-400 hover:underline font-bold"
            >
              {showTrafficOverlay ? 'Hide Overlay' : 'Show Overlay'}
            </button>
          </div>
        </div>
      )}

      {/* Speedometer & Country Badge (Bottom Left for Phones) */}
      <div className="absolute left-3 bottom-20 z-[1000] flex items-center gap-2 pointer-events-none">
        <div className="w-12 h-12 rounded-2xl bg-[#0c0f12]/95 backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center justify-center pointer-events-auto">
          <span className="text-sm font-black font-mono text-white leading-none tracking-tight">{liveSpeed}</span>
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">km/h</span>
        </div>
        <div className="w-9 h-9 rounded-full border-2 border-rose-500 bg-white flex items-center justify-center shadow-lg pointer-events-auto">
          <span className="text-[11px] font-black text-black leading-none">50</span>
        </div>
        <div className="hidden xs:flex px-2 py-1 rounded-full bg-[#0c0f12]/80 backdrop-blur border border-white/10 items-center gap-1.5 pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider font-mono">Liberia</span>
        </div>
      </div>

      {/* Bottom Driver Navigation Card (ETA, Distance, Arrival Clock) */}
      {etaDuration !== null && etaDistance !== null && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] max-w-lg mx-auto bg-[#0b0e14]/95 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                Live GPS Routing Active
              </p>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                Fastest Route
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight font-sans">
                {etaDuration}
              </h2>
              <span className="text-xs font-bold text-gray-400">min</span>
              <span className="text-xs text-[#e9c349] font-mono ml-2 font-bold">
                {etaDistance.toFixed(1)} km
              </span>
              <span className="text-xs text-gray-400 ml-auto font-mono">
                ETA <strong className="text-white">{getFormattedArrivalTime(etaDuration)}</strong>
              </span>
            </div>

            <p className="text-[10px] text-gray-400 font-medium mt-1 truncate">
              Destination: <span className="text-white font-semibold">{destinationName || 'Destination Lock in Liberia'}</span>
            </p>
          </div>

          <button
            onClick={() => {
              setIsLineCleared(true);
              setSelectedClientCoords(null);
              setDestinationName('');
            }}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 active:scale-95"
            title="Clear Route"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
