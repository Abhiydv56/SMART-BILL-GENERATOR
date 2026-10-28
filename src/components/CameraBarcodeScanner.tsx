import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
  Plus,
  Repeat,
  Upload,
  Keyboard,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product, Language } from '../types';
import { formatINR } from '../utils/formatters';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product, quantity?: number) => void;
  onUnknownBarcode?: (barcode: string) => void;
  lang: Language;
}

// POS Audio Beep Synthesizer using Web Audio API
function playScannerBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // 1800Hz clear crisp retail scanner chirp
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    // Mobile haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(80);
    }
  } catch (err) {
    console.debug('Audio beep unavailable', err);
  }
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
  onUnknownBarcode,
  lang,
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [lastScannedResult, setLastScannedResult] = useState<{
    text: string;
    product?: Product;
    time: number;
  } | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'pos-camera-barcode-reader';
  const isMountedRef = useRef(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Initialize camera scanner directly when opened
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    isMountedRef.current = true;
    setCameraError('');
    setIsPermissionDenied(false);
    setUnknownCode(null);
    setLastScannedResult(null);
    setManualCode('');

    // Short timeout to ensure the container element is rendered in DOM
    const timer = setTimeout(() => {
      startScanner({ facingMode: 'environment' });
    }, 150);

    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraConfig?: string | { facingMode: string }) => {
    try {
      setCameraError('');
      setIsPermissionDenied(false);

      if (scannerRef.current) {
        await stopScanner();
      }

      const container = document.getElementById(readerElementId);
      if (!container) {
        console.warn('Reader element not yet mounted');
        return;
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 15,
        qrbox: { width: 280, height: 170 },
        aspectRatio: 1.333333,
      };

      const targetConfig = cameraConfig || { facingMode: 'environment' };

      try {
        await html5QrCode.start(
          targetConfig,
          scanConfig,
          (decodedText: string) => {
            handleBarcodeDetected(decodedText);
          },
          () => {
            // Frame scanned with no barcode - ignore
          }
        );
      } catch (firstErr: unknown) {
        // If back camera failed (e.g., Overconstrained on desktop/webcam), fallback to front camera
        if (typeof targetConfig !== 'string' && targetConfig.facingMode === 'environment') {
          console.warn('Environment camera failed, falling back to user/webcam camera', firstErr);
          await html5QrCode.start(
            { facingMode: 'user' },
            scanConfig,
            (decodedText: string) => {
              handleBarcodeDetected(decodedText);
            },
            () => {}
          );
        } else {
          throw firstErr;
        }
      }

      if (isMountedRef.current) {
        setIsScanning(true);
        // After camera stream successfully starts, safely query cameras for switcher without permission errors
        Html5Qrcode.getCameras()
          .then(devices => {
            if (isMountedRef.current && devices && devices.length > 0) {
              setCameras(devices);
              if (typeof targetConfig === 'string') {
                setSelectedCameraId(targetConfig);
              } else {
                setSelectedCameraId(devices[0].id);
              }
            }
          })
          .catch(err => {
            console.debug('Camera list background query info:', err);
          });
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      console.error('Failed to start camera scanner', err);
      const msg = err instanceof Error ? err.message : String(err);
      const isPerm =
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('notallowederror') ||
        msg.toLowerCase().includes('denied');

      setIsPermissionDenied(isPerm);

      if (isPerm) {
        setCameraError(
          lang === 'hi'
            ? 'कैमरा अनुमति अस्वीकृत (Permission Denied)। कृपया ब्राउज़र एड्रेस बार में कैमरा आइकन पर क्लिक करके अनुमति दें।'
            : 'Camera permission denied. Please click the camera/lock icon in your browser address bar to allow camera access.'
        );
      } else if (msg.toLowerCase().includes('notfounderror') || msg.toLowerCase().includes('device not found')) {
        setCameraError(
          lang === 'hi'
            ? 'इस डिवाइस पर कोई कैमरा नहीं मिला। आप नीचे फ़ोटो अपलोड कर सकते हैं या बारकोड टाइप कर सकते हैं।'
            : 'No camera found on this device. You can upload an image or type the barcode below.'
        );
      } else {
        setCameraError(
          lang === 'hi'
            ? `कैमरा शुरू नहीं हो सका (${msg})। कृपया नीचे दिए गए विकल्पों का उपयोग करें।`
            : `Unable to access camera (${msg}). Please use the alternate options below.`
        );
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.debug('Error stopping scanner', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Switch between cameras
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    await startScanner(nextCamId);
  };

  // Handle detection with throttle (prevent duplicate scans within 1.5s)
  const handleBarcodeDetected = (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedCodeRef.current === cleanCode && now - lastScannedTimeRef.current < 1500) {
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScannedTimeRef.current = now;

    // Search in catalog by barcode or SKU
    const matchedProduct = products.find(
      p =>
        p.barcode.toLowerCase() === cleanCode.toLowerCase() ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (soundEnabled) {
      playScannerBeep();
    }

    if (matchedProduct) {
      setUnknownCode(null);
      setLastScannedResult({
        text: cleanCode,
        product: matchedProduct,
        time: now,
      });

      // Add 1 unit of product to cart
      onProductScanned(matchedProduct, 1);

      // If single scan mode, close modal after short delay
      if (!continuousMode) {
        setTimeout(() => {
          onClose();
        }, 650);
      }
    } else {
      // Barcode not found in catalog
      setUnknownCode(cleanCode);
      setLastScannedResult({
        text: cleanCode,
        time: now,
      });
    }
  };

  // Scan from photo / image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setCameraError('');

      let qrScanner = scannerRef.current;
      if (!qrScanner) {
        qrScanner = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = qrScanner;
      }

      if (qrScanner.isScanning) {
        await qrScanner.stop();
        setIsScanning(false);
      }

      const decodedText = await qrScanner.scanFile(file, true);
      handleBarcodeDetected(decodedText);
    } catch (err: unknown) {
      console.error('File scan error', err);
      setCameraError(
        lang === 'hi'
          ? 'तस्वीर में बारकोड नहीं पहचाना जा सका। कृपया स्पष्ट तस्वीर लें या नीचे टाइप करें।'
          : 'Could not detect a clear barcode in this photo. Please upload a clear picture or type below.'
      );
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>{lang === 'hi' ? 'कैमरा बारकोड स्कैनर' : 'Camera Barcode Scanner'}</span>
                {isScanning && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {lang === 'hi'
                  ? 'कैमरे के सामने बारकोड रखें (EAN, UPC, Code 128)'
                  : 'Point camera at barcode (EAN-13, EAN-8, UPC, Code 128)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch Camera (Front/Back)"
                className="p-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
              className="p-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[260px] max-h-[320px] overflow-hidden">
          {/* html5-qrcode video viewport */}
          <div id={readerElementId} className="w-full max-h-[320px] overflow-hidden" />

          {/* Camera Error Message / Permission Denied State */}
          {cameraError && (
            <div className="absolute inset-0 bg-neutral-900/95 text-white p-5 flex flex-col items-center justify-center text-center space-y-3 z-20 overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-300 uppercase tracking-wider">
                  {isPermissionDenied
                    ? (lang === 'hi' ? 'अनुमति अस्वीकृत' : 'Camera Permission Required')
                    : (lang === 'hi' ? 'कैमरा समस्या' : 'Camera Unavailable')}
                </p>
                <p className="text-xs text-neutral-200 max-w-sm leading-relaxed">{cameraError}</p>
              </div>

              {/* Recovery Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startScanner({ facingMode: 'environment' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'पुनः प्रयास करें' : 'Retry Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lang === 'hi' ? 'फ़ोटो अपलोड करें' : 'Upload Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg shadow-xs transition-colors"
                >
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'hi' ? 'बारकोड टाइप करें' : 'Type Barcode'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Scan Overlay Graphic: Laser line & Corner Brackets */}
          {isScanning && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
              <div className="relative w-64 h-36 border-2 border-emerald-400/70 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center overflow-hidden">
                {/* Animated scanning laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />

                {/* Corner reticle decorations */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input for image barcode scanning */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Status / Feedback / Alternate Inputs Area */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3 overflow-y-auto">
          {/* File processing loader */}
          {isProcessingFile && (
            <div className="p-2.5 bg-sky-50 border border-sky-300 rounded-xl flex items-center gap-2 text-xs text-sky-900">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span>
                {lang === 'hi' ? 'छवि से बारकोड पढ़ा जा रहा है...' : 'Scanning barcode from photo...'}
              </span>
            </div>
          )}

          {/* Success scan pill */}
          {lastScannedResult?.product && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 block">
                    {lastScannedResult.product.name}
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Added 1 unit · {formatINR(lastScannedResult.product.price)}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-mono text-[10px] font-bold">
                {lastScannedResult.text}
              </span>
            </div>
          )}

          {/* Unknown barcode warning */}
          {unknownCode && !lastScannedResult?.product && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'hi'
                      ? 'बारकोड कैटलॉग में नहीं मिला'
                      : 'Barcode not found in catalog'}
                    :
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded text-[11px]">
                  {unknownCode}
                </span>
              </div>

              {onUnknownBarcode && (
                <button
                  type="button"
                  onClick={() => {
                    onUnknownBarcode(unknownCode);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hi'
                      ? 'इस बारकोड के साथ नया उत्पाद जोड़ें'
                      : 'Add New Product with this Barcode'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Manual Barcode / SKU entry form */}
          {(showManualInput || cameraError) && (
            <form
              onSubmit={handleManualSubmit}
              className="flex items-center gap-2 p-2 bg-white rounded-xl border border-neutral-300 shadow-2xs"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder={
                    lang === 'hi'
                      ? 'बारकोड या SKU टाइप करें...'
                      : 'Type barcode or SKU manually...'
                  }
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-transparent border-none outline-none font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors"
              >
                {lang === 'hi' ? 'जोड़ें' : 'Add'}
              </button>
            </form>
          )}

          {/* Quick Demo Barcodes Shortcut Pill */}
          <div className="p-2 bg-neutral-100 rounded-lg text-[11px] text-neutral-600 flex items-center justify-between">
            <span className="flex items-center gap-1 text-neutral-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'hi' ? 'डेमो बारकोड:' : 'Demo Barcodes:'}</span>
            </span>
            <div className="flex gap-1">
              {products.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBarcodeDetected(p.barcode)}
                  className="px-1.5 py-0.5 bg-white hover:bg-neutral-200 border border-neutral-300 rounded text-[10px] font-mono text-neutral-800 transition-colors"
                  title={`Scan ${p.name}`}
                >
                  {p.barcode}
                </button>
              ))}
            </div>
          </div>

          {/* Scanner Mode Controls & Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setContinuousMode(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  continuousMode
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                }`}
                title="Continuous mode stays open to scan multiple items quickly"
              >
                <Repeat className="w-3 h-3" />
                <span>
                  {continuousMode
                    ? (lang === 'hi' ? 'लगातार स्कैन' : 'Continuous')
                    : (lang === 'hi' ? 'सिंगल स्कैन' : 'Single')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 transition-colors"
                title="Upload photo of barcode"
              >
                <Upload className="w-3 h-3 text-neutral-500" />
                <span>{lang === 'hi' ? 'तस्वीर' : 'Photo'}</span>
              </button>

              {!showManualInput && !cameraError && (
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 transition-colors"
                  title="Enter barcode manually"
                >
                  <Keyboard className="w-3 h-3 text-neutral-500" />
                  <span>{lang === 'hi' ? 'टाइप' : 'Type'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950 bg-neutral-200 hover:bg-neutral-300 rounded-lg transition-colors"
            >
              {lang === 'hi' ? 'पूर्ण' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
