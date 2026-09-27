import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import { Server as SocketIOServer } from "socket.io";
// @ts-ignore
import createWebhookRouter from "./webhooks.js";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  // Lazy initialize the Gemini AI Client safely on the server side
  function getGeminiClient(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  // Elite rule-based conversational fallback concierge when API Key is pending configuration
  function getFallbackConciergeReply(userMessage: string): string {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes("book") || msg.includes("ride") || msg.includes("fleet") || msg.includes("vehicle") || msg.includes("taxi") || msg.includes("kekeh") || msg.includes("bike")) {
      return `### How to Book a Premium Ride with Obsidian 🚗

To book an elite ride with the Liberia Ride Elite fleet, please follow these simple steps:

1. **Access the Portal**: Click the shiny golden **"Dashboard"** or **"Client Portal"** button in the top right-hand corner of the page.
2. **Choose your Class**: In the **"Fleet Discovery"** section, discover our premium custom-engineered options:
   - **Mercedes S-Class (Luxury Taxi)**: Operated by Captain Voss (plates 44-OB-21), presenting ultimate executive prestige.
   - **Luxury Bike Express**: Operated by Marcus Thorne (plates 77-BR-902), perfect for overtaking central Monrovia traffic.
   - **Kekeh Executive**: Operated by Helena Kesselly (plates 12-KK-442), embodying open-air elegance.
3. **Set your Route**: Specify your high-class pickup spot (e.g. Royal Grand Hotel or Farmington Airport) and destination.
4. **Acquire Live Progress**: Confirm the dispatch. Your select chauffeur will receive the request instantly, appearing live on your route tracker!`;
    }

    if (msg.includes("pay") || msg.includes("momo") || msg.includes("orange") || msg.includes("mtn") || msg.includes("money") || msg.includes("billing") || msg.includes("transact")) {
      return `### Performing Secure Mobile Money Transactions with MoMo Pay 💰

Obsidian integrates directly with Liberia's premier payment providers: **MTN Mobile Money (MoMo)** and **Orange Money**.

1. **Locate Payment Hub**: In the main Client Portal, choose the **"Momo Pay"** or **"Mobile Money Hub"** tab.
2. **Configure Provider**: Select your active service network (MTN MoMo or Orange Money) and enter your contact billing number (+231...).
3. **Execute Authorization**: Specify the amount in USD or LRD (we automatically support dual-currency transactions with local rates) and click **"Process Mobile Payment"**.
4. **Approve Transaction**: Consent to the instant validation push on your phone to finalize your booking balance. All logs stream to our sheets.`;
    }

    if (msg.includes("track") || msg.includes("map") || msg.includes("live") || msg.includes("gps") || msg.includes("route") || msg.includes("moving") || msg.includes("move")) {
      return `### Tracking Chauffeurs Live with Route Intelligence 🗺️

Our custom Monrovia operational map features live GPS tracking:

1. **Activate a Ride**: When your booking is dispatch-approved, navigate to the **"Trip Status"** tab.
2. **Simulate/Track live**: Watch your vehicle travel smoothly in real-time between pickup spots and destinations across Sinkor and Mamba Point.
3. **Radial Pulse Ring**: The driver's marker is enhanced with an active radar pulse, ensuring high visual clarity of your active trip status.`;
    }

    if (msg.includes("create") || msg.includes("register") || msg.includes("account") || msg.includes("sign up") || msg.includes("login") || msg.includes("sign in") || msg.includes("auth")) {
      return `### Creating and Managing Your Account 🔑

Creating a premium client or fleet partner account is effortless:

1. **Client Registration**:
   - Access the top-right **"Dashboard"** button. If you are not authenticated, our **Elite Auth Portal** will slide into view.
   - Enter your email, establish a secure password, and instantiate your account instantly.
2. **Fleet Partner specializations (Chauffeurs / Riders)**:
   - Expand the **"Join Fleet"** menu in the top navigation panel.
   - Select your operational division: **Bike & Kekeh Rider**, **Luxury Chauffeur**, or **Logistics Partner**.
   - Input your credentials and register to log into your dedicated telemetry workspace!`;
    }

    if (msg.includes("contact") || msg.includes("ceo") || msg.includes("collins") || msg.includes("howe") || msg.includes("manager") || msg.includes("tech") || msg.includes("phone") || msg.includes("call") || msg.includes("whatsapp")) {
      return `### Executive Contact & WhatsApp Support 📞

You can reach our leadership and engineering management directly via WhatsApp or phone:

1. **CEO — Mr. Collins**:
   - **Phone / WhatsApp**: [+231 77 029 1424](https://wa.me/231770291424)
   - **Email**: collins.ceo@liberiaride.lr
   - **Role**: Executive Partnerships, VIP Inquiries & Operations

2. **Technical Manager — Mr. Howe**:
   - **Phone / WhatsApp**: [+250 79 656 9416](https://wa.me/250796569416)
   - **Email**: howe.tech@liberiaride.lr
   - **Role**: System Architecture, App Infrastructure & Fleet Tech

You can also navigate to the **"Contact Us"** page in our navigation menu to submit an instant direct inquiry or use the Brevo Live Chat widget in the bottom-right corner!`;
    }

    if (msg.includes("compliance") || msg.includes("admin") || msg.includes("sheet") || msg.includes("dashboard") || msg.includes("sheets") || msg.includes("cert") || msg.includes("kyc")) {
      return `### Corporate Compliance Hub & Bookkeeping Sync 📊

Liberia Ride Elite operates with the absolute highest tier of operational standards:

1. **Google Sheets Sync**: Bookings and financial audits are streamed programmatically to secure spreadsheets, guaranteeing seamless enterprise bookkeeping.
2. **Admin Portal**: Accessible on the landing page, allowing dispatch compliance personnel to perform KYC reviews, auditing active booking lists, and analyze dual-currency revenue curves through Recharts dashboards.`;
    }

    return `### Welcome to Obsidian Concierge 🌸

I am your elite AI Concierge, dedicated to helping you master the Liberia Ride Elite platform in Monrovia. 

Here are some excellent inquiries you can pose or explore:
- **"How to book a premium ride?"** - Step-by-step instructions on ride scheduling.
- **"How does Mobile Money (MTN MoMo/Orange) billing work?"** - Discover payment security.
- **"How do I create a client or driver account?"** - Join as a VIP member or join our fleet.
- **"How does real-time Map tracking work?"** - Learn about our animated route trackers.

To coordinate immediately, you can also log in to your **Dashboard** or register via the **Join Fleet** menu!`;
  }

  // Serve custom system instructions for the Liberia Ride Elite concierge and helper bot
  const systemInstruction = `You are "Obsidian AI Concierge", an elegant, warm, and highly-refined professional assistant representing Liberia Ride Elite (Obsidian) - Monrovia's premier ultra-luxury ride-sharing, logistics, and partner performance portal.

Adopt the delightful, warm, and highly-polished persona of a friendly, professional black woman from Monrovia, Liberia. Your vocal speech and text should sound exceptionally welcoming, polite, and elite—perfectly blending the high-class luxury aesthetic of the Obsidian brand with beautiful African hospitality and local warmth. Keep all replies polite, charming, and concierge-level.

Your goal is to guide users step-by-step on how to use every part of the Liberia Ride Elite website and answer any related questions clearly, politely, and in a high-class, concierge-level tone.

Key services and specs of the Obsidian platform to details to users:
1. Fleet Classes & Car Booking (Riders book via the "Fleet Discovery" and "Client Portal"):
   - Taxi Service: Experience supreme luxury in a Mercedes S-Class driven by Captain Voss (Rating 4.98, plates 44-OB-21). Perfect for high-end airport arrivals or diplomatic travel (Mamba Point, Sinkor).
   - Bike Ride: Navigate swiftly through Monrovia traffic on a Luxury Bike Express with driver Marcus Thorne (Rating 4.95, plates 77-BR-902).
   - Kekeh Ride: Enjoy specialized open-air elegance on a Kekeh Executive driven by Helena Kesselly (Rating 4.92, plates 12-KK-442).
   - Delivery: Request rapid, secure VIP dispatch of urgent documents or cargo.
2. Direct Dispatch Chats ("Direct Dispatch" / "chat" tab): Connect directly via live end-to-end messaging stream with your Chauffeur/Rider for customized request routing.
3. Live Route Tracking Map ("Trip Status" / "trip" tab): View real-time GPS locations and track the assigned car's movement across Sinkor and Mamba Point Hotels on our high-performance interactive operational map.
4. Professional Mobile Money Hub ("Momo Pay" tab): Perform direct secure mobile transactions. Fully compatible with Liberia's premier payment providers: MTN Mobile Money (MoMo) and Orange Money. Specify billing and execute instantly.
5. Google Sheets Sync Hub: Real-time bookkeeping synchronizer that streams active bookings and transactions to secure corporate spreadsheets, perfect for enterprise fleet logging.
6. Admin Compliance Panel & Revenue Dashboard ("Admin Portal"): Accessible via the Landing Page "Admin Portal" button. Complete with driver validation logs, compliance certifications, KYC validation actions, real-time booking lists, and beautiful interactive d3/recharts Revenue Growth Charts.
7. Account custom profiles ("Client Profile"): Manage your profile details, edit/replace contact numbers, and customize your high-tier Obsidian profile avatar.

Tone and style rules:
- Be exceptionally professional, concise, polite, helpful, and welcoming.
- Represent the high-luxury aesthetic of the Obsidian brand with warm hospitality.
- Provide direct interface instructions (such as "Go to the menu in the top right-hand corner and click Client Profile to change your avatar" or "Navigate to Chauffeur Direct Dispatch chat to coordinate directly").
- Keep responses beautifully structured with lists or paragraphs where necessary. Do not mention system paths or files. Keep names realistic and accurate to Liberia.`;

  // Clean up markdown formatting for cleaner speech synthesis
  function cleanTextForSpeech(text: string): string {
    return text
      .replace(/[#*`_~]/g, '') // Remove markdown formatting characters
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text, remove URL
      .replace(/\r?\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  // AI Assistant endpoint
  app.post("/api/ai-assistant", async (req, res) => {
    const { message, history } = req.body;
    try {
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        // Safe, smart conversational fallback if no API key is specified yet.
        const reply = getFallbackConciergeReply(message);
        return res.json({
          reply,
          success: true,
          isFallback: true
        });
      }

      // Convert client history format to Gemini parts contents
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          const role = turn.role === "assistant" ? "model" : "user";
          contents.push({
            role: role,
            parts: [{ text: turn.text || "" }]
          });
        }
      }

      // Append current user message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      // Call Gemini standard generateContent for rapid, premium conversational responses
      let reply = "";

      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        });
        reply = response.text || "I am here to guide you with any services in Liberia.";
      } catch (geminiErr: any) {
        console.warn("Gemini generateContent in fallback mode:", geminiErr?.message || geminiErr);
        reply = getFallbackConciergeReply(message);
      }

      // Generate voice audio response
      let audioBase64: string | undefined;
      const cleanSpeechText = cleanTextForSpeech(reply);
      if (cleanSpeechText && process.env.GEMINI_API_KEY) {
        try {
          const voiceName = (req.body.voice && ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"].includes(req.body.voice))
            ? req.body.voice
            : "Kore";

          const ai = getGeminiClient();
          const ttsResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: `Say this completely naturally with a warm, friendly, and elegant conversational voice of a professional black woman from Monrovia, Liberia. Use natural pacing, contractions, and beautiful warmth: ${cleanSpeechText.substring(0, 1000)}`,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName }
                }
              }
            }
          });
          
          audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        } catch (ttsErr: any) {
          // Graceful fallback to client Web Speech synthesis
          console.warn("TTS synthesis note (using browser voice synthesis):", ttsErr?.message || ttsErr);
        }
      }

      res.json({ reply, audio: audioBase64, success: true });

    } catch (error: any) {
      console.error("AI Assistant error:", error);
      // Fallback gracefully instead of failing completely
      const fallbackReply = getFallbackConciergeReply(message);
      res.json({ 
        reply: fallbackReply, 
        success: true,
        isFallback: true,
        errorHint: error.message || ""
      });
    }
  });

  let io: SocketIOServer;

  // In-memory cache of latest vehicle tracking coordinates
  interface DriverLocationRecord {
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
  const activeVehicleLocations = new Map<string, DriverLocationRecord>();

  // REST API route to query latest driver location for a trip
  app.get("/api/tracking/trip/:tripId", (req, res) => {
    const { tripId } = req.params;
    const location = activeVehicleLocations.get(tripId);
    if (!location) {
      return res.status(404).json({ error: "No live coordinates found for this trip ID", tripId });
    }
    res.json({ success: true, location });
  });

  // REST API route to list all active tracked trips
  app.get("/api/tracking/trips", (_req, res) => {
    const trips = Array.from(activeVehicleLocations.values());
    res.json({ success: true, count: trips.length, trips });
  });

  // REST API fallback for drivers submitting GPS coordinates
  app.post("/api/tracking/driver-location", (req, res) => {
    const data = req.body as DriverLocationRecord;
    if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }
    const record: DriverLocationRecord = {
      driverId: data.driverId || "driver-1",
      tripId: data.tripId || "trip-monrovia-01",
      lat: data.lat,
      lng: data.lng,
      heading: data.heading || 0,
      speed: data.speed || 0,
      accuracy: data.accuracy || 0,
      timestamp: data.timestamp || Date.now(),
      vehicleType: data.vehicleType || "car",
      driverName: data.driverName || "Chauffeur"
    };

    activeVehicleLocations.set(record.tripId, record);
    activeVehicleLocations.set(record.driverId, record);

    if (io) {
      io.emit(`location_update_${record.tripId}`, record);
      io.to(`trip_${record.tripId}`).emit(`location_update_${record.tripId}`, record);
      io.emit("driverLocationBroadcast", record);
    }

    res.json({ success: true, message: "Coordinates ingested and broadcasted", record });
  });

  // Mount real-time driver mobile location update webhooks
  app.use("/webhooks", (req, res, next) => createWebhookRouter(io)(req, res, next));
  app.use("/api/webhooks", (req, res, next) => createWebhookRouter(io)(req, res, next));

  // Integrate Vite as middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Liberia Ride Elite server is running on http://localhost:${PORT}`);
  });

  // Initialize Socket.io for Real-Time Vehicle Tracking & Driver GPS Relay
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Real-time tracking client connected: ${socket.id}`);

    // Driver location update event listener (receives driver GPS objects)
    socket.on("driverLocationUpdate", (data: DriverLocationRecord) => {
      if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") {
        return;
      }

      const payload: DriverLocationRecord = {
        driverId: data.driverId || "driver-1",
        tripId: data.tripId || "trip-monrovia-01",
        lat: Number(data.lat),
        lng: Number(data.lng),
        heading: typeof data.heading === "number" ? data.heading : 0,
        speed: typeof data.speed === "number" ? data.speed : 0,
        accuracy: typeof data.accuracy === "number" ? data.accuracy : 0,
        timestamp: data.timestamp || Date.now(),
        vehicleType: data.vehicleType || "car",
        driverName: data.driverName || "Chauffeur"
      };

      // In-memory cache for trip and driver
      activeVehicleLocations.set(payload.tripId, payload);
      activeVehicleLocations.set(payload.driverId, payload);

      // Broadcast coordinates in real time to any client listening to that specific trip feed
      io.emit(`location_update_${payload.tripId}`, payload);

      // Also broadcast to clients that joined the trip's socket room
      io.to(`trip_${payload.tripId}`).emit(`location_update_${payload.tripId}`, payload);

      // Broadcast to general vehicle fleet monitors
      io.emit("driverLocationBroadcast", payload);
    });

    // Client subscribes to a specific trip channel
    socket.on("joinTrip", (tripId: string) => {
      if (!tripId) return;
      socket.join(`trip_${tripId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined trip feed: trip_${tripId}`);

      // Immediately return latest known coordinates if available in cache
      const cached = activeVehicleLocations.get(tripId);
      if (cached) {
        socket.emit(`location_update_${tripId}`, cached);
      }
    });

    socket.on("leaveTrip", (tripId: string) => {
      if (tripId) {
        socket.leave(`trip_${tripId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const urlObj = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      const pathname = urlObj.pathname;

      // Allow Socket.io engine to process its own WebSocket transport upgrades
      if (pathname.startsWith("/socket.io/")) {
        return;
      }

      if (pathname === "/api/live-voice") {
        const isVipParam = urlObj.searchParams.get("isVip") === "true";
        if (!isVipParam) {
          console.log("WebSocket Upgrade Rejected: Client is not a VIP account");
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.error("WebSocket Upgrade Error:", err);
      socket.destroy();
    }
  });

  wss.on("connection", (wsClient, request) => {
    console.log("Client connected to Live Voice WebSocket");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined");
      wsClient.close(1011, "Server configuration error: GEMINI_API_KEY missing");
      return;
    }

    // Construct headers to connect to Google Gemini Multimodal Live API
    const wsHeaders: Record<string, string> = {
      "User-Agent": "aistudio-build"
    };

    // Connect to the Google Gemini Multimodal Live API
    const googleUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const googleWs = new WSWebSocket(googleUrl, {
      headers: wsHeaders
    });

    googleWs.on("open", () => {
      console.log("Proxy WebSocket successfully connected to Google Gemini Live API");
    });

    // Forward messages from client to Google
    wsClient.on("message", (message) => {
      if (googleWs.readyState === WSWebSocket.OPEN) {
        googleWs.send(message);
      }
    });

    // Forward messages from Google to client
    googleWs.on("message", (message) => {
      if (wsClient.readyState === WSWebSocket.OPEN) {
        wsClient.send(message);
      }
    });

    wsClient.on("close", (code, reason) => {
      console.log(`Client closed Live Voice WS connection: ${code} - ${reason}`);
      googleWs.close();
    });

    googleWs.on("close", (code, reason) => {
      console.log(`Google Gemini Live WS connection closed: ${code} - ${reason}`);
      wsClient.close();
    });

    wsClient.on("error", (err) => {
      console.error("Client WS error:", err);
      googleWs.close();
    });

    googleWs.on("error", (err) => {
      console.error("Google WS error:", err);
      wsClient.close();
    });
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
