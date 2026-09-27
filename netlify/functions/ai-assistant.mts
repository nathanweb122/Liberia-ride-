import type { Config } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// Elite rule-based conversational fallback concierge, used if the model call fails
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

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let message: string | undefined;
  let history: Array<{ role: string; text: string }> | undefined;

  try {
    const body = await req.json();
    message = body.message;
    history = body.history;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    // Netlify AI Gateway injects GEMINI_API_KEY automatically at runtime — no config needed.
    const ai = new GoogleGenAI({});

    const contents: Array<{ role: string; parts: { text: string }[] }> = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        const role = turn.role === "assistant" ? "model" : "user";
        contents.push({ role, parts: [{ text: turn.text || "" }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I am here to guide you with any services in Liberia.";
    return Response.json({ reply, success: true });
  } catch (error: any) {
    console.warn("AI Gateway request failed, using concierge fallback:", error?.message || error);
    const reply = getFallbackConciergeReply(message);
    return Response.json({ reply, success: true, isFallback: true });
  }
};

export const config: Config = {
  path: "/api/ai-assistant",
};
