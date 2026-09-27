/**
 * webhooks.js - Real-Time Vehicle Tracking Express Server & Socket.io Relay
 *
 * Configures an Express server with Socket.io to:
 * 1. Listen for 'driverLocationUpdate' events from driver mobile devices.
 * 2. Broadcast real-time location coordinates to client-side maps for specific trip IDs.
 * 3. Ingest incoming HTTP webhook location update pings from mobile GPS trackers.
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit Monrovia, Liberia land coordinates (Broad Street / Sinkor)
const MONROVIA_LAND_CENTER = [6.3156, -10.8074];

// In-memory cache of latest vehicle telemetry per trip
export const latestVehiclePositions = new Map();

/**
 * Normalizes and guards against missing, NaN, or (0,0) ocean coordinates.
 */
export function sanitizeCoordinates(lat, lng) {
  let parsedLat = parseFloat(lat);
  let parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng) || (parsedLat === 0 && parsedLng === 0)) {
    return [MONROVIA_LAND_CENTER[0], MONROVIA_LAND_CENTER[1]];
  }
  return [parsedLat, parsedLng];
}

/**
 * Configures Socket.io event listeners for real-time driver tracking.
 *
 * @param {SocketIOServer} ioInstance - Socket.io server instance
 */
export function setupSocketServer(ioInstance) {
  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.io Connected]: ${socket.id}`);

    // Client joins a specific trip tracking channel / room
    socket.on('joinTrip', (tripId) => {
      if (!tripId) return;
      socket.join(`trip_${tripId}`);
      console.log(`[Socket.io] Client ${socket.id} joined trip room: trip_${tripId}`);

      // Instantly deliver latest known coordinates if already in cache
      const cached = latestVehiclePositions.get(tripId);
      if (cached) {
        socket.emit(`location_update_${tripId}`, cached);
      }
    });

    socket.on('leaveTrip', (tripId) => {
      if (tripId) socket.leave(`trip_${tripId}`);
    });

    // Listen for 'driverLocationUpdate' from driver mobile devices
    socket.on('driverLocationUpdate', (data = {}) => {
      const driverId = data.driverId || 'driver_01';
      const tripId = data.tripId || 'trip_liberia_101';

      // Sanitize coordinates and prevent the (0,0) ocean bug
      const [lat, lng] = sanitizeCoordinates(data.lat, data.lng);

      const locationPayload = {
        driverId: String(driverId),
        tripId: String(tripId),
        lat,
        lng,
        heading: typeof data.heading === 'number' ? Math.round(data.heading) : 0,
        speed: typeof data.speed === 'number' ? Math.max(0, data.speed) : 0,
        accuracy: typeof data.accuracy === 'number' ? Math.max(0, data.accuracy) : 0,
        timestamp: data.timestamp || Date.now(),
        driverName: data.driverName || 'Chauffeur',
        vehicleType: data.vehicleType || 'car'
      };

      // Cache latest position in memory
      latestVehiclePositions.set(tripId, locationPayload);
      latestVehiclePositions.set(driverId, locationPayload);

      // Emit real-time location update to client-side maps for this specific trip ID
      ioInstance.emit(`location_update_${tripId}`, locationPayload);

      // Also emit to clients joined in the trip socket room
      ioInstance.to(`trip_${tripId}`).emit(`location_update_${tripId}`, locationPayload);

      // Broadcast to global fleet monitoring dashboard
      ioInstance.emit('driverLocationBroadcast', locationPayload);

      console.log(`[Driver GPS Broadcast] Trip: ${tripId} | Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} | Heading: ${locationPayload.heading}° | Speed: ${locationPayload.speed} km/h`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io Disconnected]: ${socket.id} (${reason})`);
    });
  });

  return ioInstance;
}

/**
 * Creates Express Webhook Router for HTTP pings from mobile devices
 */
export function createWebhookRouter(ioInstance) {
  const router = express.Router();
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  // Ingest HTTP POST/GET location update pings from driver mobile devices
  const handleLocationPing = (req, res) => {
    try {
      const payload = req.method === 'GET' ? req.query : (req.body && Object.keys(req.body).length > 0 ? req.body : req.query);

      const driverId = payload.driverId || payload.driver_id || 'driver_01';
      const tripId = payload.tripId || payload.trip_id || 'trip_liberia_101';
      const [lat, lng] = sanitizeCoordinates(payload.lat || payload.latitude, payload.lng || payload.longitude);

      const locationRecord = {
        driverId: String(driverId),
        tripId: String(tripId),
        lat,
        lng,
        heading: parseFloat(payload.heading || payload.bearing) || 0,
        speed: parseFloat(payload.speed || payload.velocity) || 0,
        accuracy: parseFloat(payload.accuracy) || 0,
        timestamp: parseInt(payload.timestamp, 10) || Date.now(),
        source: 'http_webhook'
      };

      // Store in memory
      latestVehiclePositions.set(tripId, locationRecord);

      // Broadcast via Socket.io
      const activeIo = ioInstance || req.app.get('io') || global.io;
      if (activeIo) {
        activeIo.emit(`location_update_${tripId}`, locationRecord);
        activeIo.to(`trip_${tripId}`).emit(`location_update_${tripId}`, locationRecord);
        activeIo.emit('driverLocationBroadcast', locationRecord);
      }

      return res.status(200).json({
        success: true,
        message: 'Location update ping received and broadcasted in real-time to client maps',
        tripId,
        coords: { lat, lng },
        heading: locationRecord.heading,
        speed: locationRecord.speed,
        timestamp: locationRecord.timestamp
      });
    } catch (err) {
      console.error('[Webhook Error]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  router.post('/location', handleLocationPing);
  router.post('/driver-ping', handleLocationPing);
  router.post('/', handleLocationPing);
  router.get('/location', handleLocationPing);
  router.get('/driver-ping', handleLocationPing);
  router.get('/', handleLocationPing);

  router.get('/latest/:tripId', (req, res) => {
    const { tripId } = req.params;
    const location = latestVehiclePositions.get(tripId);
    if (!location) {
      return res.status(404).json({ success: false, error: `No coordinates for trip "${tripId}"` });
    }
    return res.status(200).json({ success: true, location });
  });

  return router;
}

// Instantiate Express App and HTTP Server
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store io on app
app.set('io', io);

// Mount webhooks router
app.use('/webhooks', createWebhookRouter(io));
app.use('/api/webhooks', createWebhookRouter(io));

// Configure Socket.io listener for 'driverLocationUpdate'
setupSocketServer(io);

// Standalone server execution check (e.g. node webhooks.js)
const isMainModule = process.argv[1] && process.argv[1].endsWith('webhooks.js');
if (isMainModule) {
  const PORT = process.env.WEBHOOK_PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[webhooks.js] Express + Socket.io Server running on http://localhost:${PORT}`);
  });
}

export { app, server, io };
export default createWebhookRouter;
