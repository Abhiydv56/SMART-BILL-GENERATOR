import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Check,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Languages,
  ArrowRight,
  Info,
  ShieldAlert,
  Send,
  RefreshCw,
  Loader2,
  Radio,
  Square,
  Zap,
} from 'lucide-react';
import { Product, CartItem, Language } from '../types';
import { formatINR, formatQuantity } from '../utils/formatters';
import {
  parseVoiceBillingCommand,
  speakConfirmation,
  ParsedVoiceItem,
  VoiceParseResult
} from '../utils/voiceParser';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface VoiceBillingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentCart: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  lang: Language;
}

export const VoiceBillingAssistant: React.FC<VoiceBillingAssistantProps> = ({
  isOpen,
  onClose,
  products,
  currentCart,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  lang,
}) => {
  // Voice & Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechLang, setSpeechLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
  const [autoApply, setAutoApply] = useState(true);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [lastActionMessage, setLastActionMessage] = useState<string>('');
  const [addedItemsSummary, setAddedItemsSummary] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [engineNote, setEngineNote] = useState<string>('');

  // Permission & Error states
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualText, setManualText] = useState('');

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Silence auto-detection refs
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef(false);
  const lastSpokenTimeRef = useRef<number>(Date.now());
  const pendingTranscriptRef = useRef<string>('');
  const hasProcessedCurrentPhraseRef = useRef(false);

  // Play audio chime
  const playChime = useCallback((type: 'success' | 'alert') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // AudioContext gestures
    }
  }, []);

  // Apply parsed items to cart
  const executeItems = useCallback((items: ParsedVoiceItem[], isAuto: boolean = false) => {
    let addedCount = 0;
    let removedCount = 0;
    const addedNames: string[] = [];

    for (const item of items) {
      if (item.action === 'clear') {
        onClearCart();
        setLastActionMessage('Cart cleared (कार्ट खाली कर दिया)');
        if (audioFeedback) speakConfirmation('Cart khali kar diya gaya hai', speechLang);
        return;
      }

      if (item.product && item.action === 'add') {
        onAddToCart(item.product, item.quantity);
        addedCount++;
        addedNames.push(`${item.quantity} ${item.product.name}`);
      } else if (item.product && item.action === 'remove') {
        onRemoveFromCart(item.product.id);
        removedCount++;
      }
    }

    if (addedCount > 0 || removedCount > 0) {
      playChime('success');
      const msg = addedCount > 0
        ? `Added: ${addedNames.join(', ')}`
        : `Removed ${removedCount} items`;
      setLastActionMessage(msg);
      setAddedItemsSummary(prev => [...prev, ...addedNames]);

      if (audioFeedback) {
        const spoken = speechLang === 'hi-IN'
          ? `${addedCount > 0 ? `${addedNames[0]} जोड़ दिया` : 'सामान हटा दिया'}`
          : `${addedCount > 0 ? `Added ${addedNames[0]} to cart` : 'Item removed'}`;
        speakConfirmation(spoken, speechLang);
      }
    }
  }, [audioFeedback, speechLang, onAddToCart, onRemoveFromCart, onClearCart, playChime]);

  // Process final text transcript and add matched items to cart
  const handleFinalSpeech = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;

    setTranscript(clean);
    setInterimTranscript('');
    hasProcessedCurrentPhraseRef.current = true;
    pendingTranscriptRef.current = '';

    const result = parseVoiceBillingCommand(clean, products);
    setParseResult(result);

    if (autoApply && result.items.length > 0) {
      const validItems = result.items.filter(i => i.product || i.action === 'clear');
      if (validItems.length > 0) {
        executeItems(validItems, true);
      }
    }
  }, [products, autoApply, executeItems]);

  // Setup real-time audio volume visualizer and silence detector from microphone stream
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 100);
        setAudioLevel(normalized);

        // Silence detection: if user was speaking and now silent for 1.8s, auto-stop recording
        if (normalized > 0.08) {
          hasSpokenRef.current = true;
          lastSpokenTimeRef.current = Date.now();
        } else if (hasSpokenRef.current) {
          const silentDuration = Date.now() - lastSpokenTimeRef.current;
          if (silentDuration > 1800) {
            // Auto-stop recording on silence!
            hasSpokenRef.current = false;
            stopRecording();
            return;
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio visualizer setup error:', e);
    }
  };

  // Clean up audio hardware & recording
  const stopAudioTracks = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  };

  // Send recorded audio blob to server for high-accuracy Gemini transcription
  const sendAudioToServer = async (blob: Blob) => {
    setIsTranscribing(true);
    setEngineNote('AI से आवाज़ समझ रहे हैं (Transcribing with AI)...');

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = (reader.result as string) || '';
          const pureBase64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(pureBase64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;
      const cleanMimeType = (blob.type || 'audio/webm').split(';')[0];

      const res = await fetch('/api/transcribe-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: cleanMimeType,
          languageHint: speechLang === 'hi-IN' ? 'Hindi / Hinglish' : 'English / Hinglish',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.transcript && data.transcript.trim()) {
        const text = data.transcript.trim();
        handleFinalSpeech(text);
        setEngineNote('');
      } else if (pendingTranscriptRef.current) {
        handleFinalSpeech(pendingTranscriptRef.current);
        setEngineNote('');
      } else {
        setEngineNote('कोई आवाज़ नहीं सुनाई दी, कृपया पुनः बोलें (No clear speech detected)');
        setTimeout(() => setEngineNote(''), 4000);
      }
    } catch (err: any) {
      console.error('Failed to transcribe audio via server:', err);
      // Fallback: if server had an issue but Web Speech got a transcript, use it!
      if (pendingTranscriptRef.current) {
        handleFinalSpeech(pendingTranscriptRef.current);
      }
      setEngineNote('');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    setErrorMessage('');
    setTranscript('');
    setInterimTranscript('');
    setParseResult(null);
    setLastActionMessage('');
    setEngineNote('Listening... (सुन रहे हैं)');
    hasSpokenRef.current = false;
    hasProcessedCurrentPhraseRef.current = false;
    pendingTranscriptRef.current = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionState('error');
      setErrorMessage('Microphone recording is not supported in this browser. Please use Google Chrome or type in the command bar.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermissionState('granted');
      setupAudioVisualizer(stream);

      // Determine supported mime type for MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        stopAudioTracks();

        if (recordedBlob.size > 500) {
          await sendAudioToServer(recordedBlob);
        } else if (pendingTranscriptRef.current) {
          handleFinalSpeech(pendingTranscriptRef.current);
          setIsTranscribing(false);
          setEngineNote('');
        } else {
          setIsTranscribing(false);
          setEngineNote('');
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      // Parallel Web Speech Recognition with live stream & silence debounce auto-apply
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = speechLang;

          rec.onresult = (event: any) => {
            let interim = '';
            let latestFinal = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                latestFinal += res[0].transcript;
              } else {
                interim += res[0].transcript;
              }
            }

            const currentSpoken = (latestFinal || interim).trim();
            if (currentSpoken) {
              pendingTranscriptRef.current = currentSpoken;
              setInterimTranscript(interim);
              if (latestFinal) setTranscript(latestFinal);

              // Auto-finalize on speech pause (1.2s debounce)
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                if (pendingTranscriptRef.current && !hasProcessedCurrentPhraseRef.current) {
                  handleFinalSpeech(pendingTranscriptRef.current);
                  stopRecording();
                }
              }, 1200);
            }
          };

          rec.onerror = (e: any) => {
            console.log('WebSpeech notification (fallback handled by MediaRecorder):', e.error);
          };

          rec.onend = () => {
            // If ended with unfinalized transcript, immediately apply!
            if (pendingTranscriptRef.current && !hasProcessedCurrentPhraseRef.current) {
              handleFinalSpeech(pendingTranscriptRef.current);
            }
          };

          rec.start();
          recognitionRef.current = rec;
        } catch {
          // ignore web speech startup error
        }
      }

    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      setIsRecording(false);
      stopAudioTracks();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
        setMicPermissionState('denied');
        setErrorMessage(
          lang === 'hi'
            ? 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र URL बार में 🔒 या 🎙️ आइकन पर क्लिक करके अनुमति दें (Allow करें)।'
            : 'Microphone access was blocked. Please click the 🔒 or mic icon in your browser URL bar to allow microphone access.'
        );
      } else {
        setMicPermissionState('error');
        setErrorMessage(
          lang === 'hi'
            ? 'माइक्रोफ़ोन चालू करने में त्रुटि हुई। कृपया जांचें कि माइक कनेक्टेड है।'
            : 'Could not access microphone hardware. Please check your audio settings.'
        );
      }
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    setIsRecording(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
        stopAudioTracks();
      }
    } else {
      stopAudioTracks();
    }
  };

  // Toggle recording button
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Auto-start recording on modal open
  useEffect(() => {
    let timer: any;
    if (isOpen) {
      timer = setTimeout(() => {
        startRecording();
      }, 400);
    } else {
      if (isRecording) {
        stopRecording();
      }
      stopAudioTracks();
    }
    return () => {
      if (timer) clearTimeout(timer);
      stopAudioTracks();
    };
  }, [isOpen]);

  // Spacebar push-to-talk handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' && !e.repeat && !isRecording && !isTranscribing) {
        e.preventDefault();
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, isRecording, isTranscribing]);

  // Switch voice language
  const handleLangChange = (newLang: 'hi-IN' | 'en-IN') => {
    setSpeechLang(newLang);
    if (isRecording) {
      stopRecording();
    }
  };

  // Handle Manual Command Form Submit
  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    handleFinalSpeech(manualText.trim());
    setManualText('');
  };

  // Quick Preset Prompts tailored to active products
  const samplePrompts = [
    { text: '2 packet Maggi aur 1 Amul Butter', label: '2 Maggi + 1 Butter' },
    { text: '1 kg Basmati Rice aur 1 kg Cheeni', label: '1kg Rice + 1kg Sugar' },
    { text: '2 Lux Soap aur 2 Parle-G', label: '2 Soap + 2 Parle-G' },
    { text: '1 Fortune Oil aur 1 Tata Salt', label: '1 Oil + 1 Salt' },
    { text: '1 Amul Milk aur aadha kilo Atta', label: '1 Milk + 0.5kg Atta' },
    { text: '1 kg Aloo aur 1 kg Pyaz', label: '1kg Aloo + 1kg Pyaz' },
  ];

  if (!isOpen) return null;

  const activeTranscriptText = transcript || interimTranscript || pendingTranscriptRef.current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xs border transition-all ${
              isRecording
                ? 'bg-red-500/80 border-red-300 animate-pulse'
                : 'bg-white/15 border-white/20'
            }`}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">
                  {lang === 'hi' ? 'लाइव वॉइस बिलिंग असिस्टेंट' : 'Live Voice Cart Builder'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/40 border border-emerald-300/40 text-emerald-100 flex items-center gap-1 font-mono">
                  <Radio className="w-2.5 h-2.5 text-emerald-300 animate-pulse" />
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">
                {lang === 'hi'
                  ? 'माइक दबाकर बोलें: "2 मैगी, 1 किलो चीनी और 2 साबुन" सीधे बिल में जुड़ जाएगा'
                  : 'Speak naturally: "2 packet Maggi, 1 kg sugar, and 2 soaps" to auto-build cart'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Feedback Toggle */}
            <button
              type="button"
              onClick={() => setAudioFeedback(!audioFeedback)}
              title={audioFeedback ? 'Mute Voice Responses' : 'Enable Voice Responses'}
              className={`p-2 rounded-lg transition-colors text-white ${
                audioFeedback ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              {audioFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar: Language + Auto-apply */}
        <div className="px-6 py-2.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-neutral-500" />
            <span className="font-medium text-neutral-700">Voice Language:</span>
            <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleLangChange('hi-IN')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  speechLang === 'hi-IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                🇮🇳 हिन्दी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('en-IN')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  speechLang === 'en-IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Hinglish / Indian Eng
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={e => setAutoApply(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
              />
              <span className="font-semibold text-neutral-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'hi' ? 'तुरंत कार्ट में जोड़ें (Auto-Add ON)' : 'Auto-add to cart on speech'}
              </span>
            </label>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Permission Denied Alert & Helper Card */}
          {micPermissionState === 'denied' && (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-900">
                    {lang === 'hi'
                      ? '⚠️ माइक्रोफ़ोन अनुमति (Microphone Permission) ब्लॉक या बंद है'
                      : '⚠️ Microphone Permission Required'}
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {errorMessage || (lang === 'hi'
                      ? 'ब्राउज़र ने माइक का उपयोग रोक रखा है। कृपया ऊपर ब्राउज़र के एड्रेस बार (URL bar) में 🔒 (लॉक) या 🎙️ (माइक) आइकन पर क्लिक करके Microphone को "Allow" (अनुमति दें) करें।'
                      : 'The browser blocked microphone access. Please click the 🔒 or mic icon in your browser URL bar and change Microphone to "Allow".')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200">
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'माइक पुनः चालू करें (Retry)' : 'Retry Microphone'}</span>
                </button>
                <span className="text-[11px] text-amber-800 font-medium">
                  {lang === 'hi' ? 'या नीचे लिखकर भी तुरंत बिल बना सकते हैं:' : 'Or type your command below:'}
                </span>
              </div>
            </div>
          )}

          {micPermissionState === 'error' && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Status Toast Banner */}
          {lastActionMessage && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm block">{lastActionMessage}</span>
                  <span className="text-emerald-100 text-[11px]">
                    सामान बिल में जुड़ गया है! कुल: {currentCart.reduce((sum, i) => sum + i.quantity, 0)} वस्तुएं
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-lg shadow-sm text-xs flex items-center gap-1"
              >
                <span>बिल देखें</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Big Microphone Card & Sound Wave */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-neutral-100 border border-neutral-200 text-center relative overflow-hidden">
            {/* Pulsing rings when recording */}
            {isRecording && (
              <>
                <div
                  className="absolute w-48 h-48 rounded-full bg-emerald-500/15 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                <div
                  className="absolute w-36 h-36 rounded-full bg-emerald-500/25 animate-pulse"
                />
              </>
            )}

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 focus:outline-none ${
                isRecording
                  ? 'bg-gradient-to-tr from-rose-500 to-red-600 text-white ring-8 ring-rose-200 animate-pulse'
                  : isTranscribing
                  ? 'bg-neutral-400 text-white cursor-wait'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white ring-8 ring-emerald-100 hover:scale-105'
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-8 h-8 mb-1 animate-spin" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Adding</span>
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-7 h-7 mb-1 fill-white" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Tap to Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Tap to Speak</span>
                </>
              )}
            </button>

            {/* Real Audio Volume Soundwave Bars */}
            <div className="h-7 flex items-center justify-center gap-1 mt-4">
              {[0.2, 0.5, 0.8, 1.0, 0.7, 0.9, 0.4, 0.8, 0.6, 1.0, 0.7, 0.5, 0.3].map((heightMul, i) => {
                const barHeight = isRecording
                  ? Math.max(4, audioLevel * 28 * heightMul)
                  : isTranscribing
                  ? 8
                  : 4;
                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isRecording
                        ? audioLevel > 0.05
                          ? 'bg-emerald-500'
                          : 'bg-emerald-300'
                        : isTranscribing
                        ? 'bg-teal-400 animate-pulse'
                        : 'bg-neutral-300'
                    }`}
                    style={{
                      height: `${barHeight}px`,
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-2 text-xs font-semibold">
              {isTranscribing ? (
                <div className="flex items-center gap-2 text-teal-700 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{engineNote || 'AI द्वारा पहचान व बिल में जोड़ना जारी है...'}</span>
                </div>
              ) : isRecording ? (
                <div className="space-y-1">
                  <p className="text-emerald-700 font-bold text-sm">
                    {lang === 'hi' ? '🎤 सुन रहे हैं... बोलें, रुकने पर सामान स्वतः कार्ट में जुड़ जाएगा' : '🎤 Listening... speak items, will auto-add on pause'}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Tip: Press Spacebar to speak or tap "Tap to Stop"
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-neutral-700 font-bold">
                    {lang === 'hi' ? 'माइक बटन दबाकर बोलें या नीचे दिए उदाहरण आज़माएं' : 'Click microphone to speak, or use sample chips below'}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    {lang === 'hi' ? 'शॉर्टकट: होल्ड स्पेसबार (Hold Space) से भी बोल सकते हैं' : 'Shortcut: Hold Spacebar to speak'}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Demo Voice Chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-[11px] font-bold text-neutral-400 self-center">Try:</span>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFinalSpeech(p.text)}
                  className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800 border border-neutral-200 hover:border-emerald-300 rounded-full shadow-2xs transition-all active:scale-95"
                >
                  "{p.label}"
                </button>
              ))}
            </div>
          </div>

          {/* Quick Command Bar (Type or paste voice command) */}
          <form onSubmit={handleManualCommandSubmit} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'hi' ? 'बोलकर या लिखकर कमांड दें (Command Bar):' : 'Spoken or Typed Voice Command:'}
              </span>
              <span className="text-[11px] text-neutral-400">Press Enter</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder={lang === 'hi' ? 'उदा: 2 packet maggi aur 1 kg cheeni aur 2 lux sabun' : 'e.g. 2 packet Maggi, 1 kg Sugar, and 2 Lux Soap'}
                className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <span>+ {lang === 'hi' ? 'जोड़ें' : 'Apply'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Live Transcript Display Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {lang === 'hi' ? 'पहचाने गए शब्द (Speech Transcript):' : 'Spoken Speech Transcript:'}
              </span>
              {activeTranscriptText && (
                <button
                  type="button"
                  onClick={() => {
                    setTranscript('');
                    setParseResult(null);
                    setInterimTranscript('');
                    pendingTranscriptRef.current = '';
                  }}
                  className="text-neutral-400 hover:text-neutral-600 text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="p-3 bg-neutral-900 text-white rounded-xl font-mono text-sm min-h-[64px] flex flex-col justify-center border border-neutral-800 shadow-inner">
              {activeTranscriptText ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-400 font-semibold">{transcript || activeTranscriptText}</span>
                    {interimTranscript && transcript !== interimTranscript && (
                      <span className="text-neutral-400 italic ml-1"> {interimTranscript}...</span>
                    )}
                  </div>
                  {/* Instant force add button */}
                  <button
                    type="button"
                    onClick={() => handleFinalSpeech(activeTranscriptText)}
                    className="self-start sm:self-auto px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'hi' ? 'तुरंत कार्ट में जोड़ें' : 'Add to Cart Now'}</span>
                  </button>
                </div>
              ) : isTranscribing ? (
                <span className="text-emerald-400 italic animate-pulse">
                  AI ऑडियो का विश्लेषण कर रहा है... (Transcribing audio with Gemini)...
                </span>
              ) : isRecording ? (
                <span className="text-emerald-300 text-xs italic animate-pulse">
                  {lang === 'hi'
                    ? 'सुन रहे हैं... बोलिए जैसे "2 मैगी और 1 किलो चीनी"...'
                    : 'Listening... say items e.g. "2 Maggi and 1 kg Sugar"...'}
                </span>
              ) : (
                <span className="text-neutral-500 text-xs italic">
                  {lang === 'hi'
                    ? 'आपकी आवाज़ यहां लाइव दिखाई देगी... (उदा: "2 पैकेट मैगी और 1 किलो आशीर्वाद आटा")'
                    : 'Spoken transcript will appear here... (e.g. "2 packet Maggi and 1 kg Aashirvaad Atta")'}
                </span>
              )}
            </div>
          </div>

          {/* Parsed Items Breakdown / Review List */}
          {parseResult && parseResult.items.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === 'hi' ? 'पहचाना गया सामान (Parsed Cart Items)' : 'Detected Inventory Items'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const valid = parseResult.items.filter(i => i.product || i.action === 'clear');
                    executeItems(valid, false);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'hi' ? 'पुनः कार्ट में जोड़ें' : 'Add All to Cart'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {parseResult.items.map((item, idx) => {
                  const isSuccess = !!item.product;
                  const isClear = item.action === 'clear';

                  if (isClear) {
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="font-bold">Command: Clear entire cart (पूरा बिल खाली करें)</span>
                        </div>
                        <button
                          type="button"
                          onClick={onClearCart}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700"
                        >
                          Execute Clear
                        </button>
                      </div>
                    );
                  }

                  if (!isSuccess) {
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-semibold">{item.error || 'उत्पाद नहीं मिला'}</p>
                            <p className="text-[11px] text-amber-700">
                              Spoken query: <span className="font-mono">"{item.rawQuery}"</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-neutral-500 font-medium italic">
                          Check inventory
                        </span>
                      </div>
                    );
                  }

                  const product = item.product!;
                  const itemTotal = product.price * item.quantity;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-emerald-300 transition-all shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          item.action === 'remove'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.action === 'remove' ? '-' : '+'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{product.name}</span>
                            {product.nameHi && (
                              <span className="text-[11px] text-neutral-500">({product.nameHi})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-neutral-500 text-[11px] mt-0.5">
                            <span>₹{product.price} / {product.unit}</span>
                            <span>•</span>
                            <span>Stock: {product.stock}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Confidence: {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Action Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity > 1) {
                                item.quantity -= 1;
                                setParseResult({ ...parseResult });
                              }
                            }}
                            className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 shadow-2xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold font-mono px-2 text-neutral-900">
                            {formatQuantity(item.quantity, product.unit)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              item.quantity += 1;
                              setParseResult({ ...parseResult });
                            }}
                            className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <div className="font-bold text-emerald-700 font-mono text-sm">
                            {formatINR(itemTotal)}
                          </div>
                          <div className="text-[10px] text-neutral-400">incl. GST</div>
                        </div>

                        {/* Individual Add button */}
                        <button
                          type="button"
                          onClick={() => executeItems([item], false)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tips / Spoken Voice Cheat Sheet */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'hi' ? 'दुकानदार के लिए बोलकर बिलिंग की टिप्स:' : 'Voice POS Kirana Cheat Sheet:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-emerald-700">सामान जोड़ना (Add Items):</span>
                <p className="mt-0.5">"2 packet maggi aur 1 kilo cheeni aur 2 lux sabun"</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-rose-700">सामान हटाना (Remove Items):</span>
                <p className="mt-0.5">"amul butter hata do" या "remove lux soap"</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-amber-700">वजन / Loose Items:</span>
                <p className="mt-0.5">"aadha kilo atta", "1 kilo basmati rice", "500 gram paneer"</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-blue-700">पूरा बिल साफ़ करना (Clear Cart):</span>
                <p className="mt-0.5">"cart khali karo" या "clear cart"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span className="font-semibold text-neutral-800">
              Current Bill: <strong className="text-emerald-700 text-sm">{currentCart.length}</strong> items in cart ({formatINR(currentCart.reduce((sum, i) => sum + i.total, 0))})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{lang === 'hi' ? 'बिल में देखें (View POS Bill)' : 'Done / View Bill'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
