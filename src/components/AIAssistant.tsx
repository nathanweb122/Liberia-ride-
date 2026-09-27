import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Sparkles, HelpCircle, ArrowRight, Bot, Compass, CreditCard, ClipboardCheck, ArrowUpRight, Volume2, VolumeX, Phone, PhoneOff, Mic, MicOff, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audio?: string;
}

export interface AIAssistantProps {
  onNavigate?: (screen: 'landing' | 'auth' | 'client-portal' | 'profile' | 'chat' | 'trip' | 'rider' | 'chauffeur' | 'logistics' | 'contact' | 'contact-us' | 'admin-portal', options?: { tab?: 'login' | 'signup', tier?: 'Normal' | 'VIP' }) => void;
  isLoggedIn?: boolean;
  currentUser?: any;
}

const QUICK_PROMPTS = [
  { text: "How to book a premium ride?", icon: Compass },
  { text: "How do I pay with MTN or Orange Money?", icon: CreditCard },
  { text: "How do I track my ride live on the map?", icon: Bot },
  { text: "What is the compliance hub/dashboard?", icon: ClipboardCheck },
];

// Offline & fallback concierge knowledge engine to guarantee 100% response uptime
function getClientFallbackConciergeReply(userMessage: string): string {
  const msg = (userMessage || '').toLowerCase();

  if (
    msg.includes('book') ||
    msg.includes('ride') ||
    msg.includes('fleet') ||
    msg.includes('vehicle') ||
    msg.includes('taxi') ||
    msg.includes('kekeh') ||
    msg.includes('bike') ||
    msg.includes('car') ||
    msg.includes('order')
  ) {
    return `### How to Book a Premium Ride with Obsidian 🚗

To book an elite ride with the Liberia Ride Elite fleet, please follow these simple steps:

1. **Access the Portal**: Click the golden **"Dashboard"** or **"Client Portal"** button in the top navigation bar.
2. **Choose your Class**: In the **"Fleet Discovery"** section, discover our premium options:
   - **Mercedes S-Class (Luxury Taxi)**: Operated by Captain Voss (plates 44-OB-21), presenting ultimate executive prestige.
   - **Luxury Bike Express**: Operated by Marcus Thorne (plates 77-BR-902), perfect for overtaking central Monrovia traffic.
   - **Kekeh Executive**: Operated by Helena Kesselly (plates 12-KK-442), embodying open-air elegance.
   - **VIP Delivery**: Secure dispatch of high-value cargo and confidential packages.
3. **Set your Route**: Specify your high-class pickup spot (e.g. Royal Grand Hotel, Mamba Point, or Farmington Airport) and destination.
4. **Acquire Live Progress**: Confirm the dispatch. Your select chauffeur will receive the request instantly, appearing live on your route tracker!`;
  }

  if (
    msg.includes('pay') ||
    msg.includes('momo') ||
    msg.includes('orange') ||
    msg.includes('mtn') ||
    msg.includes('money') ||
    msg.includes('billing') ||
    msg.includes('transact') ||
    msg.includes('cost') ||
    msg.includes('fare') ||
    msg.includes('rate') ||
    msg.includes('price')
  ) {
    return `### Performing Secure Mobile Money Transactions with MoMo Pay 💰

Obsidian integrates directly with Liberia's premier payment providers: **MTN Mobile Money (MoMo)** and **Orange Money**.

1. **Locate Payment Hub**: In the main Client Portal, choose the **"Momo Pay"** or **"Mobile Money Hub"** tab.
2. **Configure Provider**: Select your active service network (MTN MoMo or Orange Money) and enter your contact billing number (+231...).
3. **Execute Authorization**: Specify the amount in USD or LRD (we automatically support dual-currency transactions with real-time conversion) and click **"Process Mobile Payment"**.
4. **Approve Transaction**: Consent to the instant validation push on your phone to finalize your booking balance. All transactions sync to our ledger.`;
  }

  if (
    msg.includes('track') ||
    msg.includes('map') ||
    msg.includes('live') ||
    msg.includes('gps') ||
    msg.includes('route') ||
    msg.includes('moving') ||
    msg.includes('move') ||
    msg.includes('location')
  ) {
    return `### Tracking Chauffeurs Live with Route Intelligence 🗺️

Our custom Monrovia operational map features live GPS tracking:

1. **Activate a Ride**: When your booking is dispatch-approved, navigate to the **"Trip Status"** tab.
2. **Simulate/Track live**: Watch your vehicle travel smoothly in real-time between pickup spots and destinations across Sinkor and Mamba Point.
3. **Radial Pulse Ring**: The driver's marker is enhanced with an active radar pulse, ensuring high visual clarity of your active trip status.`;
  }

  if (
    msg.includes('create') ||
    msg.includes('register') ||
    msg.includes('account') ||
    msg.includes('sign up') ||
    msg.includes('login') ||
    msg.includes('sign in') ||
    msg.includes('auth') ||
    msg.includes('join') ||
    msg.includes('driver') ||
    msg.includes('chauffeur')
  ) {
    return `### Creating and Managing Your Account 🔑

Creating a premium client or fleet partner account is effortless:

1. **Client Registration**:
   - Access the top-right **"Dashboard"** button. If you are not authenticated, our **Elite Auth Portal** will appear.
   - Enter your email, establish a secure password, and instantiate your account instantly.
2. **Fleet Partner specializations (Chauffeurs / Riders)**:
   - Expand the **"Join Fleet"** menu in the top navigation panel.
   - Select your operational division: **Bike & Kekeh Rider**, **Luxury Chauffeur**, or **Logistics Partner**.
   - Input your credentials and register to log into your dedicated telemetry workspace!`;
  }

  if (
    msg.includes('contact') ||
    msg.includes('ceo') ||
    msg.includes('collins') ||
    msg.includes('howe') ||
    msg.includes('manager') ||
    msg.includes('tech') ||
    msg.includes('phone') ||
    msg.includes('call') ||
    msg.includes('whatsapp') ||
    msg.includes('support') ||
    msg.includes('number')
  ) {
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

You can also navigate to the **"Contact Us"** page in our navigation menu to submit an instant direct inquiry or use our live chat!`;
  }

  if (
    msg.includes('compliance') ||
    msg.includes('admin') ||
    msg.includes('sheet') ||
    msg.includes('dashboard') ||
    msg.includes('sheets') ||
    msg.includes('cert') ||
    msg.includes('kyc') ||
    msg.includes('revenue') ||
    msg.includes('growth')
  ) {
    return `### Corporate Compliance Hub & Bookkeeping Sync 📊

Liberia Ride Elite operates with the absolute highest tier of operational standards:

1. **Google Sheets Sync**: Bookings and financial audits are streamed programmatically to secure spreadsheets, guaranteeing seamless enterprise bookkeeping.
2. **Admin Portal**: Accessible on the landing page, allowing dispatch compliance personnel to perform KYC reviews, auditing active booking lists, and analyze dual-currency revenue curves through Recharts dashboards.`;
  }

  return `### Welcome to Obsidian Concierge 🌸

I am your elite AI Concierge, dedicated to helping you master the Liberia Ride Elite platform in Monrovia. 

Here are some helpful inquiries you can explore:
- **"How to book a premium ride?"** - Step-by-step instructions on ride scheduling.
- **"How does Mobile Money (MTN MoMo/Orange) billing work?"** - Discover payment security.
- **"How do I create a client or driver account?"** - Join as a VIP member or join our fleet.
- **"How does real-time Map tracking work?"** - Learn about our animated route trackers.

To coordinate immediately, you can also log in to your **Dashboard** or register via the **Join Fleet** menu!`;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onNavigate, isLoggedIn, currentUser }) => {
  const isVip = isLoggedIn && (
    currentUser?.clientTier === 'VIP' || 
    currentUser?.isVip === true || 
    (currentUser?.rating && currentUser.rating.toLowerCase().includes('vip'))
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'avatar' | 'chat' | 'voice'>('chat');
  const [showGuidelineOverlay, setShowGuidelineOverlay] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initial welcome message
    return [{
      id: 'welcome',
      role: 'assistant',
      text: "Welcome to Obsidian Concierge. I am your elite AI Assistant, dedicated to helping you guide and navigate our premium ride-booking portal, Direct Dispatch, MoMo billing, and operations dashboards in Monrovia. How may I elevate your experience today?",
      timestamp: new Date()
    }];
  });
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);
  const [liveVoiceStatus, setLiveVoiceStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [liveVoiceVoice, setLiveVoiceVoice] = useState('Kore');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceThinking, setIsVoiceThinking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Set default active tab depending on VIP tier
  useEffect(() => {
    if (isVip) {
      setActiveTab('avatar');
    } else {
      setActiveTab('chat');
    }
  }, [isVip]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmPlayerRef = useRef<any>(null);

  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioCtxRef = useRef<AudioContext | null>(null);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  const stopCurrentAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {}
      currentAudioSourceRef.current = null;
    }
    if (currentAudioCtxRef.current && currentAudioCtxRef.current.state !== 'closed') {
      try {
        currentAudioCtxRef.current.close();
      } catch (e) {}
      currentAudioCtxRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    activeUtterancesRef.current = [];
    setPlayingMessageId(null);
  };

  const initializePCMPlayer = () => {
    if (pcmPlayerRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      let nextPlayTime = 0;

      pcmPlayerRef.current = {
        audioCtx,
        playChunk: (base64Data: string) => {
          if (!audioCtx) return;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          try {
            const binary = window.atob(base64Data);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }

            const numSamples = len / 2;
            const float32Data = new Float32Array(numSamples);
            const dataView = new DataView(bytes.buffer);
            for (let i = 0; i < numSamples; i++) {
              const int16Val = dataView.getInt16(i * 2, true);
              float32Data[i] = int16Val / 32768.0;
            }

            const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
            audioBuffer.getChannelData(0).set(float32Data);

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);

            const currentTime = audioCtx.currentTime;
            if (nextPlayTime < currentTime) {
              nextPlayTime = currentTime;
            }

            source.start(nextPlayTime);
            nextPlayTime += audioBuffer.duration;
          } catch (err) {
            console.error("PCM Chunk play error:", err);
          }
        },
        clear: () => {
          nextPlayTime = 0;
          if (audioCtx && audioCtx.state !== 'closed') {
            try {
              audioCtx.close();
            } catch (e) {}
          }
          pcmPlayerRef.current = null;
        }
      };
    } catch (e) {
      console.error("Failed to initialize PCMPlayer:", e);
    }
  };

  const endLiveVoiceSession = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (pcmPlayerRef.current) {
      pcmPlayerRef.current.clear();
    }

    setLiveVoiceStatus('disconnected');
    setIsLiveVoiceMode(false);
    setActiveTab(current => current === 'voice' ? 'chat' : current);
  };

  const startLiveVoiceSession = async (overrideVoice?: string) => {
    stopCurrentAudio();
    setIsLiveVoiceMode(true);
    setLiveVoiceStatus('connecting');

    const voiceToUse = overrideVoice || liveVoiceVoice;

    // 1. Pre-initialize and resume AudioContexts synchronously inside user gesture (before await)
    // This is required for iOS Safari to allow audio playback and capture.
    initializePCMPlayer();
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        const micAudioCtx = new AudioContextClass({ sampleRate: 16000 });
        if (micAudioCtx.state === 'suspended') {
          micAudioCtx.resume();
        }
        audioContextRef.current = micAudioCtx;
      } catch (e) {
        console.error("Failed to pre-initialize micAudioCtx inside user gesture:", e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      mediaStreamRef.current = stream;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-voice?isVip=${isVip}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveVoiceStatus('connected');

        const setupMsg = {
          setup: {
            model: "agents/agent_7501kwrxadq2ekh902e5jt7x6sxw/branches/agtbrch_9201kwrxadq3eg49e3xhgv9hnz2a",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceToUse
                  }
                }
              },
              systemInstruction: {
                parts: [
                  {
                    text: `You are the premium, highly-polished AI voice assistant for Ride Elite Liberia, based in Monrovia.
Your voice name is ${voiceToUse}. Keep all replies extremely short, conversational, and natural.

CRITICAL VOICE INSTRUCTION:
- Speak COMPLETELY naturally, with warm, beautiful human-like voice inflections, smooth pauses, and relaxed conversational pacing.
- Absolutely AVOID sounding stiff, robotic, or reading like a formal text-to-speech engine.
- Use warm, spoken contractions (e.g., "I'm", "you're", "don't", "we'll") instead of written formal combinations ("I am", "you are", "do not", "we will").
- Adopt the delightful, warm, and highly-polished persona of a friendly, professional black woman from Monrovia, Liberia. Your vocal tone should sound exceptionally welcoming, polite, and elegant—blending the high-class luxury aesthetic of the Obsidian brand with beautiful African hospitality and local warmth.
- Keep your sentences short and sweet, and respond like a real caring human being. Assist users in real time with quick instructions, billing help, fleet availability, or airport transfers in Monrovia.
- IMPORTANT: Do NOT speak or greet the user automatically on connection. Only speak and respond when the user actually speaks or asks a question first.`
                  }
                ]
              }
            }
          }
        };
        ws.send(JSON.stringify(setupMsg));

        let micAudioCtx = audioContextRef.current;
        if (!micAudioCtx && AudioContextClass) {
          try {
            micAudioCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = micAudioCtx;
          } catch (e) {
            console.error("Failed to create micAudioCtx in onopen:", e);
          }
        }

        if (micAudioCtx) {
          if (micAudioCtx.state === 'suspended') {
            micAudioCtx.resume();
          }

          const source = micAudioCtx.createMediaStreamSource(stream);
          const processor = micAudioCtx.createScriptProcessor(2048, 1, 1);
          scriptProcessorRef.current = processor;

          processor.onaudioprocess = (e) => {
          if (isMicMuted) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          let binary = '';
          const bytes = new Uint8Array(pcm16.buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Audio = window.btoa(binary);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm",
                    data: base64Audio
                  }
                ]
              }
            }));
          }
        };

        source.connect(processor);
        processor.connect(micAudioCtx.destination);
      }
    };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.data) {
                if (pcmPlayerRef.current) {
                  pcmPlayerRef.current.playChunk(part.inlineData.data);
                }
              }
            }
          }

          if (response.serverContent?.interrupted) {
            console.log("Interrupted by user");
            if (pcmPlayerRef.current) {
              pcmPlayerRef.current.clear();
              initializePCMPlayer();
            }
          }
        } catch (err) {
          console.error("Live Voice WebSocket parse error:", err);
        }
      };

      ws.onclose = () => {
        endLiveVoiceSession();
      };

      ws.onerror = (e) => {
        console.error("Live Voice WS error:", e);
        setLiveVoiceStatus('error');
      };

    } catch (err) {
      console.error("Live Voice failed:", err);
      setLiveVoiceStatus('error');
    }
  };

  const toggleMicMute = () => {
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMute;
      });
    }
  };

  const playMessageAudio = async (msg: ChatMessage) => {
    stopCurrentAudio();
    if (!msg.text) return;

    if (msg.audio) {
      try {
        setPlayingMessageId(msg.id);
        const binaryString = window.atob(msg.audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext unsupported");
        }

        // Try decoding as standard audio format (MP3/WAV/etc.)
        const audioCtxForStandard = new AudioContextClass();
        currentAudioCtxRef.current = audioCtxForStandard;

        if (audioCtxForStandard.state === 'suspended') {
          await audioCtxForStandard.resume().catch(e => console.log("Failed to resume standard audio ctx:", e));
        }

        try {
          const bufferCopy = bytes.buffer.slice(0);
          const decodedBuffer = await audioCtxForStandard.decodeAudioData(bufferCopy);
          
          const source = audioCtxForStandard.createBufferSource();
          source.buffer = decodedBuffer;
          source.connect(audioCtxForStandard.destination);
          
          source.onended = () => {
            setPlayingMessageId(currentId => currentId === msg.id ? null : currentId);
          };
          
          currentAudioSourceRef.current = source;
          source.start(0);
        } catch (decodeErr) {
          // If decoding fails, fall back to raw Int16 PCM parsing (Gemini format)
          console.log("Decoding as standard audio failed, parsing as raw Int16 PCM:", decodeErr);
          
          const numSamples = len / 2;
          const int16Array = new Int16Array(numSamples);
          const dataView = new DataView(bytes.buffer);
          for (let i = 0; i < numSamples; i++) {
            int16Array[i] = dataView.getInt16(i * 2, true);
          }

          const audioCtxForPCM = new AudioContextClass({ sampleRate: 24000 });
          currentAudioCtxRef.current = audioCtxForPCM;

          if (audioCtxForPCM.state === 'suspended') {
            await audioCtxForPCM.resume().catch(e => console.log("Failed to resume PCM audio ctx:", e));
          }

          const audioBuffer = audioCtxForPCM.createBuffer(1, numSamples, 24000);
          const channelData = audioBuffer.getChannelData(0);

          for (let i = 0; i < numSamples; i++) {
            channelData[i] = int16Array[i] / 32768.0;
          }

          const source = audioCtxForPCM.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtxForPCM.destination);

          source.onended = () => {
            setPlayingMessageId(currentId => currentId === msg.id ? null : currentId);
          };

          currentAudioSourceRef.current = source;
          source.start(0);
        }
      } catch (err) {
        console.warn("PCM voice playback failed, falling back to Web Speech:", err);
        fallbackSpeechPlay(msg);
      }
    } else {
      fallbackSpeechPlay(msg);
    }
  };

  const fallbackSpeechPlay = (msg: ChatMessage) => {
    if (!window.speechSynthesis) return;
    try {
      // Cancel any ongoing speech synthesis immediately
      window.speechSynthesis.cancel();
      setPlayingMessageId(msg.id);

      // Strip guide note from spoken text
      const speakableText = msg.text.split("\n\n---\n\n💡")[0];

      const cleanText = speakableText
        .replace(/[#*`_~]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove emoji patterns to avoid the synthesizer speaking emoji names or stalling
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        setPlayingMessageId(null);
        return;
      }

      // Split text into natural sentences to bypass Chrome's 15-second cutoff and stay perfectly stable
      const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+(\s|$)/g) || [cleanText];
      const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);

      if (cleanSentences.length === 0) {
        setPlayingMessageId(null);
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural')) && 
        v.lang.startsWith('en') && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('susan'))
      ) || voices.find(v => 
        v.name.toLowerCase().includes('google') && v.lang.startsWith('en')
      ) || voices.find(v => 
        v.name.toLowerCase().includes('natural') && v.lang.startsWith('en')
      ) || voices.find(v => 
        v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira'))
      ) || voices.find(v => 
        v.lang.startsWith('en')
      );

      // Store in ref to prevent browser garbage collection stopping speech midway
      const utterancesQueue: SpeechSynthesisUtterance[] = [];
      activeUtterancesRef.current = utterancesQueue;

      cleanSentences.forEach((sentence, idx) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        if (premiumVoice) {
          utterance.voice = premiumVoice;
        }
        utterance.rate = 0.98; // Professional, conversational pacing
        utterance.pitch = 0.95; // Delightful warm tone

        if (idx === cleanSentences.length - 1) {
          utterance.onend = () => {
            setPlayingMessageId(currentId => currentId === msg.id ? null : currentId);
            activeUtterancesRef.current = [];
          };
          utterance.onerror = () => {
            setPlayingMessageId(currentId => currentId === msg.id ? null : currentId);
            activeUtterancesRef.current = [];
          };
        }

        utterancesQueue.push(utterance);
        window.speechSynthesis.speak(utterance);
      });
    } catch (e) {
      console.error("SpeechSynthesis error:", e);
      setPlayingMessageId(null);
      activeUtterancesRef.current = [];
    }
  };

  // Stop sound when unmounting
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      endLiveVoiceSession();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Alert indicator if a new message comes in while closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Interrupt any currently playing response immediately
    stopCurrentAudio();

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      // Build simplified history array for backend
      const historyPayload = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          voice: liveVoiceVoice
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        text: data.reply || "I apologize. I am temporarily unable to synthesize a response.",
        timestamp: new Date(),
        audio: data.audio
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Autoplay the assistant reply if not muted
      if (!isMuted) {
        // Delay slightly for smooth transitions
        setTimeout(() => {
          playMessageAudio(assistantMsg);
        }, 100);
      }
    } catch (error) {
      console.error("AI Assistant response failure:", error);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        text: "I apologize, Chauffeur Command reports a momentary network disruption. Please check your connectivity or secrets configuration and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputVal);
  };

  const toggleWidget = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (!nextState) {
      // Quiet down immediately when closing the panel
      stopCurrentAudio();
    } else {
      setHasNewMessage(false);
    }
  };

  // Render markdown inline structures elegantly
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      let content: React.ReactNode = line;
      
      // Check subheadings
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="text-[#ffc174] font-bold text-xs sm:text-xs uppercase tracking-widest mb-1.5 mt-2.5 border-b border-[#ffc174]/10 pb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h4 key={i} className="text-[#ffc174] font-bold text-xs sm:text-sm uppercase tracking-widest mb-2 mt-3 pb-1 border-b border-[#ffc174]/15">
            {line.replace('## ', '')}
          </h4>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h4 key={i} className="text-[#ffc174] font-bold text-sm sm:text-base uppercase tracking-wider mb-2.5 mt-4">
            {line.replace('# ', '')}
          </h4>
        );
      }
      
      // Check numbered lists or bullet points
      const isBullet = line.startsWith('- ') || line.startsWith('* ');
      const isNumber = line.match(/^\d+\.\s/);
      
      if (isBullet || isNumber) {
        const cleanLine = isBullet ? line.substring(2) : line.replace(/^\d+\.\s/, '');
        const prefix = isBullet ? '• ' : line.match(/^\d+\.\s/)?.[0] || '';
        
        // Handle bold ** inside bullet
        const parts = cleanLine.split('**');
        return (
          <div key={i} className="pl-4 -indent-4 mb-1 text-[11px] sm:text-xs text-white/90 leading-relaxed font-sans">
            <span className="text-primary font-bold">{prefix}</span>
            {parts.map((part, pi) => 
              pi % 2 === 1 
                ? <strong key={pi} className="text-primary font-semibold">{part}</strong> 
                : part
            )}
          </div>
        );
      }
      
      // Default paragraphs with dynamic bold tags
      if (line.includes('**')) {
        const parts = line.split('**');
        content = parts.map((part, pi) => 
          pi % 2 === 1 
            ? <strong key={pi} className="text-primary font-semibold">{part}</strong> 
            : part
        );
      }
      
      return (
        <p key={i} className={`${line.trim() === '' ? 'h-1.5' : 'mb-1 text-[11px] sm:text-xs leading-relaxed text-slate-300 font-sans'}`}>
          {content}
        </p>
      );
    });
  };

  // Extract clickable system navigation CTA links in real time
  const getActionButtons = (msgText: string) => {
    const actions: { label: string; onClick: () => void }[] = [];
    if (!onNavigate) return actions;

    const textLower = msgText.toLowerCase();

    if (textLower.includes("book") || textLower.includes("ride") || textLower.includes("fleet") || textLower.includes("vehicle") || textLower.includes("taxi") || textLower.includes("chauffeur")) {
      actions.push({
        label: isLoggedIn ? "🚗 Open Ride Booking Portal" : "🚗 Create Account / Log In to Book",
        onClick: () => onNavigate(isLoggedIn ? 'client-portal' : 'auth')
      });
    }
    if (textLower.includes("create") || textLower.includes("register") || textLower.includes("account") || textLower.includes("sign up") || textLower.includes("auth")) {
      actions.push({
        label: "🔑 Launch Account Registration",
        onClick: () => onNavigate('auth')
      });
    }
    if (textLower.includes("pay") || textLower.includes("momo") || textLower.includes("orange") || textLower.includes("money") || textLower.includes("billing")) {
      actions.push({
        label: isLoggedIn ? "💰 Go to Mobile Money Hub" : "🔑 Sign In to Pay with MoMo",
        onClick: () => onNavigate(isLoggedIn ? 'client-portal' : 'auth')
      });
    }
    if (textLower.includes("track") || textLower.includes("map") || textLower.includes("live") || textLower.includes("gps") || textLower.includes("route")) {
      actions.push({
        label: "🗺️ Go to Trip Tracking Map",
        onClick: () => onNavigate(isLoggedIn ? 'client-portal' : 'landing')
      });
    }
    if (textLower.includes("profile") || textLower.includes("avatar") || textLower.includes("avatar change")) {
      actions.push({
        label: "👤 Update Avatar & Profile",
        onClick: () => onNavigate(isLoggedIn ? 'profile' : 'auth')
      });
    }
    if (textLower.includes("compliance") || textLower.includes("admin") || textLower.includes("kyc")) {
      actions.push({
        label: "🔐 Open Admin Control Center",
        onClick: () => {
          onNavigate('landing');
          // Trigger the Admin Panel view after a short delay
          setTimeout(() => {
            const adminButton = document.getElementById('open-admin-portal-button') || document.querySelector('[onClick*="admin"]');
            if (adminButton) (adminButton as HTMLButtonElement).click();
          }, 350);
        }
      });
    }

    return actions;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Invite Tooltip Tag */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.0, duration: 0.8 }}
          className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/85 backdrop-blur-md text-[#ffc174] border border-[#ffc174]/20 rounded-lg px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest pointer-events-none hidden sm:flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#ffc174]" />
          <span>Ask Obsidian Guide</span>
        </motion.div>
      )}

      {/* Floating Action Button (FAB) */}
      <motion.button
        id="obsidian-ai-fab"
        onClick={toggleWidget}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex items-center justify-center w-14 h-14 rounded-full border border-primary/40 bg-surface-container-high shadow-[0_0_20px_rgba(233,195,73,0.3)] hover:shadow-[0_0_30px_rgba(233,195,73,0.5)] text-primary cursor-pointer transition-colors ${isOpen ? 'bg-background border-white/10' : ''}`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Bot className="w-7 h-7 text-primary animate-pulse" />
              {hasNewMessage && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="obsidian-ai-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`absolute bottom-18 right-0 ${
              activeTab === 'avatar' 
                ? 'w-[350px] sm:w-[500px] md:w-[650px] h-[600px]' 
                : 'w-[350px] sm:w-[400px] h-[550px]'
            } max-h-[80vh] flex flex-col bg-surface-container/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300`}
          >
            {/* Header */}
            <div className="bg-surface-container-high px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  {isLiveVoiceMode ? (
                    <div className="relative">
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Phone className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#e9c349] animate-spin-slow" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bodoni text-xs font-bold uppercase tracking-widest text-[#e9c349]">
                      {isLiveVoiceMode ? 'Live Voice Call' : 'Obsidian AI Guide'}
                    </h3>
                    {isLoggedIn && (
                      <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        isVip 
                          ? 'bg-[#e9c349]/20 text-[#e9c349] border border-[#e9c349]/30' 
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {isVip ? 'VIP' : 'Standard'}
                      </span>
                    )}
                  </div>
                  <p className="text-[8px] text-zinc-400 tracking-wider uppercase">
                    {isLiveVoiceMode ? (
                      <span className="text-emerald-400 font-semibold animate-pulse">
                        {liveVoiceStatus === 'connecting' ? 'Connecting...' : 'Live Connected'}
                      </span>
                    ) : (
                      isVip ? 'Elite Multi-Mode Concierge' : 'Text-Only Assistant'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Premium Voice Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                    title="Change Gemini Voice Profile"
                    className="text-zinc-400 hover:text-[#e9c349] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 flex items-center gap-1 border border-white/5 bg-black/20"
                  >
                    <span className="text-[9px] font-bold text-[#e9c349] uppercase tracking-wider">{liveVoiceVoice}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>
                  {isVoiceMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-32 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                      <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest px-2.5 py-1 border-b border-white/5">
                        Gemini Voice
                      </p>
                      {[
                        { name: "Kore", desc: "Warm Female" },
                        { name: "Zephyr", desc: "Elegant Female" },
                        { name: "Puck", desc: "Energetic Male" },
                        { name: "Charon", desc: "Calm Male" },
                        { name: "Fenrir", desc: "Deep Male" }
                      ].map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => {
                            setLiveVoiceVoice(v.name);
                            setIsVoiceMenuOpen(false);
                            // If live voice session is active, restart it with new voice
                            if (isLiveVoiceMode) {
                              endLiveVoiceSession();
                              startLiveVoiceSession(v.name);
                            }
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-[9px] font-bold transition-all flex items-center justify-between hover:bg-white/5 ${
                            liveVoiceVoice === v.name ? 'text-[#e9c349] bg-white/[0.02]' : 'text-zinc-300'
                          }`}
                        >
                          <span>{v.name}</span>
                          <span className="text-[6.5px] text-zinc-500 font-normal uppercase tracking-wider">{v.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isVip && (
                  <button
                    onClick={() => {
                      if (isLiveVoiceMode) {
                        endLiveVoiceSession();
                      } else {
                        startLiveVoiceSession();
                      }
                    }}
                    title={isLiveVoiceMode ? "End Live Voice Call" : "Start Live Voice Call"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isLiveVoiceMode
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 animate-pulse'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isLiveVoiceMode ? (
                      <PhoneOff className="w-4 h-4 text-red-400" />
                    ) : (
                      <Phone className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    if (nextMute) {
                      stopCurrentAudio();
                    }
                  }}
                  title={isMuted ? "Unmute Voice" : "Mute Voice"}
                  className="text-zinc-400 hover:text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#e9c349]" />}
                </button>
                <button 
                  onClick={toggleWidget}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Tab Switcher */}
            <div className="flex bg-black/40 p-1 border-b border-white/10 gap-1 shrink-0">
              <button
                onClick={() => {
                  stopCurrentAudio();
                  endLiveVoiceSession();
                  setActiveTab('avatar');
                }}
                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'avatar' 
                    ? 'bg-[#e9c349] text-black shadow-md font-extrabold' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Avatar</span>
              </button>
              <button
                onClick={() => {
                  stopCurrentAudio();
                  endLiveVoiceSession();
                  setActiveTab('chat');
                }}
                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'chat' 
                    ? 'bg-[#e9c349] text-black shadow-md font-extrabold' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Text Chat</span>
              </button>
            </div>

            {activeTab === 'avatar' && (
              <div className="flex-1 w-full relative bg-slate-950 overflow-hidden flex flex-col">
                {isVip ? (
                  <div className="w-full h-full flex flex-col relative">
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 border border-white/10 rounded-full px-3 py-1 text-[9px] uppercase tracking-wider font-bold text-[#e9c349] shadow-lg backdrop-blur-md">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>Live 3D AI Concierge</span>
                    </div>
                    
                    <iframe 
                      src="https://bey.chat/46212136-0a04-4045-be1f-1afdea92dd72" 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      allowFullScreen
                      allow="camera; microphone; fullscreen"
                      style={{ border: 'none', width: '100%', height: '100%', flexGrow: 1 }}
                    ></iframe>
                    
                    {/* Guidelines overlay */}
                    {showGuidelineOverlay && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/85 border border-white/15 rounded-xl p-2.5 pr-8 text-center backdrop-blur-sm z-10 transition-all">
                        <p className="text-[10px] text-zinc-300 font-sans leading-normal">
                          Tap the mic icon inside the avatar screen to talk with our elite concierge live.
                        </p>
                        <button 
                          onClick={() => setShowGuidelineOverlay(false)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                    <div className="space-y-6 max-w-sm">
                      <div className="w-14 h-14 rounded-full bg-[#e9c349]/10 border border-[#e9c349]/30 flex items-center justify-center mx-auto text-[#e9c349] shadow-[0_0_20px_rgba(233,195,73,0.1)]">
                        <Lock className="w-6 h-6" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 bg-[#e9c349]/20 border border-[#e9c349]/30 rounded-full px-3 py-1 text-[9px] uppercase tracking-widest font-black text-[#e9c349]">
                          VIP Premium Feature
                        </div>
                        <h4 className="font-bodoni text-sm font-bold text-white tracking-wide uppercase">3D Live Avatar Locked</h4>
                        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                          The real-time 3D video avatar and direct voice interactions are exclusive premium assets reserved for VIP Premium Accounts.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 max-w-[240px] mx-auto w-full">
                        <button
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate('auth', { tab: 'signup', tier: 'VIP' });
                              setIsOpen(false);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#e9c349] text-black font-sans text-[10px] font-bold uppercase tracking-wider hover:bg-opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#e9c349]/10"
                        >
                          Register a VIP Account
                        </button>
                        <button
                          onClick={() => setActiveTab('chat')}
                          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-sans text-[10px] font-bold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Use Standard Text Chat
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {activeTab === 'chat' && (
              <>
                {isLiveVoiceMode ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-black/60 p-6 text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      {/* Pulsing indicator rings */}
                      <span className="absolute inline-flex h-24 w-24 rounded-full bg-emerald-500/10 animate-ping duration-1000"></span>
                      <span className="absolute inline-flex h-16 w-16 rounded-full bg-emerald-500/20 animate-pulse"></span>
                      
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                        <Phone className="w-6 h-6 animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Live voice connection</h4>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                        {liveVoiceStatus === 'connecting' 
                          ? 'Establishing secure link to Obsidian Fleet Intelligence...' 
                          : 'Connected. Speak into your microphone to talk with your AI Concierge.'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsMicMuted(!isMicMuted)}
                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          isMicMuted
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                      </button>
                      <button
                        type="button"
                        onClick={endLiveVoiceSession}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-600 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                      {messages.map((msg, index) => {
                        const actionCTAs = msg.role === 'assistant' ? getActionButtons(msg.text) : [];
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[90%] rounded-xl px-3.5 py-2.5 shadow-md ${
                                msg.role === 'user'
                                  ? 'bg-[#e9c349] text-black font-semibold rounded-tr-none'
                                  : 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-none'
                              }`}
                            >
                              <div className="space-y-0.5">
                                {msg.role === 'user' ? (
                                  <p className="text-xs sm:text-xs leading-relaxed font-sans">{msg.text}</p>
                                ) : (
                                  renderMessageText(msg.text)
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between gap-4 mt-2 border-t border-white/5 pt-1.5">
                                {msg.role === 'assistant' ? (
                                  <button
                                    onClick={() => {
                                      if (playingMessageId === msg.id) {
                                        stopCurrentAudio();
                                      } else {
                                        playMessageAudio(msg);
                                      }
                                    }}
                                    className={`flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer p-0.5 rounded hover:bg-white/5 ${
                                      playingMessageId === msg.id 
                                        ? 'text-[#ffc174] animate-pulse' 
                                        : 'text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {playingMessageId === msg.id ? (
                                      <>
                                        <span className="flex h-1.5 w-1.5 relative">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc174] opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ffc174]"></span>
                                        </span>
                                        <span>Stop Voice</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 className="w-3 h-3 text-[#ffc174]" />
                                        <span>Speak</span>
                                      </>
                                    )}
                                  </button>
                                ) : <div />}
                                
                                <span className={`text-[8px] block opacity-60 ${
                                  msg.role === 'user' ? 'text-black/80' : 'text-zinc-400'
                                }`}>
                                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Inline Actions CTAs */}
                            {actionCTAs.length > 0 && (
                              <div className="mt-2 flex flex-col gap-1 w-full max-w-[85%]">
                                {actionCTAs.map((act, actIdx) => (
                                  <button
                                    key={actIdx}
                                    onClick={() => {
                                      act.onClick();
                                      // Close widget smoothly after initiating intent
                                      setIsOpen(false);
                                    }}
                                    className="text-left w-full py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary hover:text-white font-sans text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-all cursor-pointer group"
                                  >
                                    <span>{act.label}</span>
                                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Loader */}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white/5 border border-white/5 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts Panel */}
                    {messages.length === 1 && (
                      <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                        <p className="text-[9px] text-[#ffc174] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Quick Guidance Directives
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {QUICK_PROMPTS.map((qp, idx) => {
                            const IconComp = qp.icon;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(qp.text)}
                                className="w-full text-left text-[11px] bg-white/5 hover:bg-primary/5 hover:text-white border border-white/5 hover:border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2 text-zinc-300 transition-all cursor-pointer group"
                              >
                                <IconComp className="w-4 h-4 text-primary opacity-80 group-hover:opacity-100 flex-shrink-0" />
                                <span className="truncate flex-1 font-sans">{qp.text}</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all text-primary" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Message Input Footer */}
                    <form 
                      onSubmit={handleFormSubmit}
                      className="p-3 border-t border-white/10 bg-surface-container-high/90 flex gap-2 items-center"
                    >
                      <input
                        id="ai-assistant-input"
                        type="text"
                        placeholder="Ask Obsidian anything..."
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary/60 placeholder-on-surface-variant/50 transition-colors"
                      />
                      <button
                        id="ai-assistant-submit"
                        type="submit"
                        disabled={!inputVal.trim() || isLoading}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-black hover:bg-primary-variant hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
