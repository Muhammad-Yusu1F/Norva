import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Flashlight, RefreshCw, X, AlertCircle, Sparkles, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { decodeQrFromImageElement, decodeCanvasWithZxing } from '../lib/qrScanner';

interface LiveQrScannerProps {
  onScanSuccess: (qrCodeData: string, snapshotImage?: string) => void;
  onScanImage?: (imageBase64: string) => void;
  onClose: () => void;
}

export const LiveQrScanner: React.FC<LiveQrScannerProps> = ({ onScanSuccess, onScanImage, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("Chekdagi QR-kodni kadrga to'g'rilang");

  const animationFrameId = useRef<number | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const streamRef = useRef<MediaStream | null>(null);

  // Play pleasant feedback sound on QR scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // Upward chirp

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or supported
    }

    try {
      if (navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch {
      // ignore
    }
  };

  // Start Camera
  const startCamera = async () => {
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Ushbu brauzerda kamera qo'llab-quvvatlanmaydi yoki xavfsiz (HTTPS) ulanish mavjud emas.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.onloadedmetadata = () => {
          if (!isMountedRef.current) return;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((playErr) => {
              if (playErr.name !== 'AbortError' && playErr.name !== 'NotAllowedError') {
                console.warn('Video play error suppressed:', playErr);
              }
            });
          }
        };
      }

      // Check capabilities (Torch, Zoom, Continuous Auto Focus)
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities.torch));

        if (capabilities.zoom) {
          const maxZ = Math.min(Number(capabilities.zoom.max || 1), 4);
          setMaxZoom(maxZ);
          setZoomLevel(1);
        } else {
          setMaxZoom(1);
        }

        // Apply continuous focus mode for crisp text/thermal receipt reading
        try {
          if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
            await (videoTrack as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            });
          }
        } catch {}
      }
    } catch (err: any) {
      if (!isMountedRef.current || err.name === 'AbortError') return;
      console.error('Camera access error:', err);
      let msg = "Kameraga ulanishda xatolik yuz berdi.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Kamera ruxsati berilmadi. Iltimos brauzer sozlamalarida kameraga ruxsat bering.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "Qurilmada kamera topilmadi.";
      }
      setError(msg);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [facingMode]);

  // Capture current video frame as high-res photo for AI receipt analysis
  const capturePhotoForAi = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isProcessing) return;

    try {
      setIsProcessing(true);
      setScanStatus("Chek rasmi olinmoqda...");
      playBeep();

      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, vw, vh);
        const photoBase64 = canvas.toDataURL('image/jpeg', 0.92);

        // Stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (onScanImage) {
          onScanImage(photoBase64);
        } else {
          onScanSuccess(photoBase64);
        }
      }
    } catch (e) {
      console.error("Capture photo error:", e);
      setIsProcessing(false);
      setError("Chekni suratga olishda xatolik yuz berdi.");
    }
  };

  // High-performance, multi-tier QR scanning loop throttled to ~80ms (12fps)
  useEffect(() => {
    let active = true;

    const scanFrame = async (now: number) => {
      if (!active || isProcessing) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Throttle: process frame every ~80ms to avoid locking the UI thread
      if (video && video.readyState >= 2 && canvas && now - lastScanTimestamp.current >= 80) {
        lastScanTimestamp.current = now;

        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          if (vw > 0 && vh > 0) {
            // Downscale frame to optimal processing width (max 720px) for speed & noise suppression
            const scale = Math.min(1, 720 / Math.max(vw, vh));
            const targetW = Math.round(vw * scale);
            const targetH = Math.round(vh * scale);

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, targetW, targetH);

              // Helper to safely obtain crisp receipt frame snapshot for AI OCR
              const getFrameSnapshot = (): string | undefined => {
                try {
                  const snapCanvas = document.createElement('canvas');
                  snapCanvas.width = video.videoWidth || targetW;
                  snapCanvas.height = video.videoHeight || targetH;
                  const snapCtx = snapCanvas.getContext('2d');
                  if (snapCtx) {
                    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
                    return snapCanvas.toDataURL('image/jpeg', 0.90);
                  }
                  return canvas.toDataURL('image/jpeg', 0.85);
                } catch {
                  return undefined;
                }
              };

              // 1. Tier 1: Hardware GPU BarcodeDetector (instant 0.005s detection on modern phones)
              if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                try {
                  if (!barcodeDetectorRef.current) {
                    barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                  }
                  const barcodes = await barcodeDetectorRef.current.detect(video);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    const detectedText = barcodes[0].rawValue.trim();
                    if (detectedText.length > 0) {
                      setIsProcessing(true);
                      setScanStatus("QR-kod aniqlandi! ⚡");
                      playBeep();
                      const snapshot = getFrameSnapshot();
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach((track) => track.stop());
                      }
                      onScanSuccess(detectedText, snapshot);
                      return;
                    }
                  }
                } catch {
                  // fall through to Tier 2 & 3
                }
              }

              // 2. Tier 2: ZXing Reader on canvas with HybridBinarizer
              const zxingResult = decodeCanvasWithZxing(canvas);
              if (zxingResult && zxingResult.trim().length > 0) {
                setIsProcessing(true);
                setScanStatus("QR-kod o'qildi! ⚡");
                playBeep();
                const snapshot = getFrameSnapshot();
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop());
                }
                onScanSuccess(zxingResult.trim(), snapshot);
                return;
              }

              // 3. Tier 3: jsQR Center ROI (optimal for user pointing target at center)
              const boxSize = Math.round(Math.min(targetW, targetH) * 0.7);
              const boxX = Math.round((targetW - boxSize) / 2);
              const boxY = Math.round((targetH - boxSize) / 2);
              const centerData = ctx.getImageData(boxX, boxY, boxSize, boxSize);
              let qrCode = jsQR(centerData.data, centerData.width, centerData.height, {
                inversionAttempts: 'attemptBoth',
              });

              // If center didn't catch it, scan full downscaled frame
              if (!qrCode || !qrCode.data) {
                const fullData = ctx.getImageData(0, 0, targetW, targetH);
                qrCode = jsQR(fullData.data, fullData.width, fullData.height, {
                  inversionAttempts: 'attemptBoth',
                });
              }

              if (qrCode && qrCode.data && qrCode.data.trim().length > 0) {
                setIsProcessing(true);
                setScanStatus("QR-kod o'qildi! ⚡");
                playBeep();
                const snapshot = getFrameSnapshot();
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop());
                }
                onScanSuccess(qrCode.data.trim(), snapshot);
                return;
              }
            }
          }
        } catch (scanErr) {
          // Never let an exception crash the rAF loop
          console.warn("Scan frame notice:", scanErr);
        }
      }

      if (active) {
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameId.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [stream, isProcessing, onScanSuccess]);

  // Toggle Flashlight/Torch
  const toggleTorch = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextState = !torchOn;
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  // Toggle Zoom (1x -> 2x -> 3x -> 1x)
  const toggleZoom = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        let nextZoom = zoomLevel + 1;
        if (nextZoom > Math.min(maxZoom, 3)) {
          nextZoom = 1;
        }
        await (videoTrack as any).applyConstraints({
          advanced: [{ zoom: nextZoom }],
        });
        setZoomLevel(nextZoom);
      } catch (e) {
        console.warn('Zoom change failed', e);
      }
    }
  };

  // Switch between front/back cameras
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Fallback: Scan QR from uploaded image file
  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setScanStatus("Rasmdan QR-kod qidirilmoqda...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setIsProcessing(false);
        setError("Rasmni o'qib bo'lmadi.");
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          const qrResult = await decodeQrFromImageElement(img);
          if (qrResult && qrResult.data) {
            playBeep();
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            onScanSuccess(qrResult.data.trim(), base64Data);
            return;
          }

          // Fallback to server AI Vision parser
          const res = await fetch('/api/parse-qr-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data }),
          });
          const resData = await res.json();
          if (res.ok && resData && resData.success && resData.data) {
            playBeep();
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            onScanSuccess(resData.data.qrData || `r=${resData.data.fiscalNumber || ''}&s=${resData.data.amount * 100}&name=${encodeURIComponent(resData.data.title || '')}`, base64Data);
            return;
          }

          setError("Rasmdan QR-kod topilmadi. Chekni yorug'roq joyda yaqinroqdan suratga oling yoki 'Chekni Rasmga Olish' usulidan foydalaning.");
        } catch {
          setError("Rasmdan QR-kodni o'qishda xatolik yuz berdi.");
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        setError("Rasm faylini ochib bo'lmadi.");
      };
      img.src = base64Data;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between p-4 select-none">
      {/* Hidden canvas for image analysis */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileScan}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between text-white py-3 px-2 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center border border-emerald-500/30">
            <Sparkles size={18} className="text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-1.5">
              <span>Chek QR Skaneri</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                AI + Soliq OFD
              </span>
            </h4>
            <p className="text-[11px] text-gray-400">0.05 soniyada avtomatik aniqlash</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white border border-white/20 cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Center Viewfinder Container */}
      <div className="relative w-full max-w-md flex-1 flex items-center justify-center overflow-hidden rounded-3xl my-2 border border-white/10 shadow-2xl bg-gray-950">
        
        {/* Live Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark Vignette Overlay around target */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Scan Frame Target Box */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-transparent rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
          
          {/* Corner Guides */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_8px_#34d399]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_8px_#34d399]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_8px_#34d399]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_8px_#34d399]" />

          {/* Animated Laser Scanning Line */}
          <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#34d399] animate-[bounce_2s_infinite_ease-in-out]" />

          {/* Center Target Indicator */}
          <div className="w-12 h-12 rounded-full border border-emerald-400/30 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>

        {/* Overlay Instructions Badge */}
        <div className="absolute bottom-6 px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/15 text-white text-xs font-semibold flex items-center gap-2 shadow-lg z-10 max-w-[90%] text-center">
          <Camera size={14} className="text-emerald-400 shrink-0" />
          <span className="truncate">{scanStatus}</span>
        </div>

        {/* Zoom badge indicator button inside viewfinder if supported */}
        {maxZoom > 1 && (
          <button
            type="button"
            onClick={toggleZoom}
            className="absolute top-4 right-4 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs font-black border border-white/20 backdrop-blur-md z-20 flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <ZoomIn size={12} className="text-amber-400" />
            <span>{zoomLevel}x</span>
          </button>
        )}

        {/* Error Notification */}
        {error && (
          <div className="absolute top-6 inset-x-4 bg-rose-950/95 border border-rose-600 text-white p-3.5 rounded-2xl text-xs flex items-start gap-2.5 backdrop-blur-md z-30 shadow-2xl animate-in fade-in">
            <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-white/60 hover:text-white p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-around py-3 px-2 z-20">
        
        {/* Flashlight Button */}
        {hasTorch ? (
          <button
            type="button"
            onClick={toggleTorch}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer border ${
              torchOn
                ? 'bg-amber-400 text-gray-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
          >
            <Flashlight size={20} />
          </button>
        ) : (
          <div className="w-12" />
        )}

        {/* Big Capture Button for Instant AI Receipt Photo */}
        <button
          type="button"
          onClick={capturePhotoForAi}
          disabled={isProcessing}
          title="Chekni suratga olish"
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center p-1 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer border-2 border-white/40"
        >
          <div className="w-full h-full rounded-full border-2 border-white flex items-center justify-center">
            <Camera size={26} />
          </div>
        </button>

        {/* Gallery / File Picker Fallback */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Rasmni tanlash"
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <ImageIcon size={20} />
        </button>

        {/* Camera Switcher (Front/Back) */}
        <button
          type="button"
          onClick={switchCamera}
          title="Kamerani almashtirish"
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
};
