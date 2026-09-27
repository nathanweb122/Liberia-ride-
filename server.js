const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const createWebhookRouter = require('./webhooks');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Mount real-time driver mobile location update webhooks
app.set('io', io);
app.use('/webhooks', createWebhookRouter(io));
app.use('/api/webhooks', createWebhookRouter(io));

io.on('connection', (socket) => {
  console.log(`[Socket Connected]: ${socket.id}`);

  // Relays live driver coordinates directly to listening clients
  socket.on('driverLocationUpdate', (data) => {
    const { driverId, tripId, lat, lng, heading } = data;
    
    io.emit(`location_update_${tripId}`, {
      driverId,
      lat,
      lng,
      heading: heading || 0,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected]: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
