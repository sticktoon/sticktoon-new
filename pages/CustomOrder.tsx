import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateBadgeMockup } from '../geminiService.ts';
import { 
  Upload, Wand2, Loader2, ShoppingCart, Download, RotateCcw, RotateCw,
  Plus, Minus, X, Info, CheckCircle2, Sparkles, Eye, Palette, Settings2, ZoomIn
} from 'lucide-react';
import { API_BASE_URL } from '../config/api.ts';
import { formatPrice } from '../constants.tsx';
import { Badge, Category } from '../types.ts';

interface ImageState {
  img: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface CustomOrderProps {
  addToCart: (badge: Badge, quantity?: number) => void;
  user?: { role?: string } | null;
}

interface CustomOrderDraft {
  fastener: string;
  quantity: number;
  prompt: string;
  zoom: number;
  rotation: number;
  bgColor: string;
  imageSrc?: string;
  imageX?: number;
  imageY?: number;
}

const CUSTOM_ORDER_DRAFT_KEY = 'sticktoon-custom-order-draft-v1';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type StoredAuthUser = { role?: string };

const readStoredAuthUser = (key: string): StoredAuthUser | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredAuthUser) : null;
  } catch {
    return null;
  }
};

export default function CustomOrder({ addToCart, user }: CustomOrderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fastener, setFastener] = useState('Pin-Badge');
  const [quantity, setQuantity] = useState(1);
  const [prompt, setPrompt] = useState('');
  
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, imgX: 0, imgY: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  const imageStateRef = useRef<ImageState | null>(imageState);
  const zoomRef = useRef(zoom);
  const isDraggingRef = useRef(isDragging);
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);

  useEffect(() => { imageStateRef.current = imageState; }, [imageState]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const isAdmin = useCallback(() => {
    if (user?.role === 'admin') return true;
    const storefrontToken = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    const storefrontUser = readStoredAuthUser('user');
    const adminUser = readStoredAuthUser('adminUser');

    return Boolean(
      (storefrontToken && storefrontUser?.role === 'admin') ||
      (adminToken && adminUser?.role === 'admin')
    );
  }, [user?.role]);

  const getAdminAuthToken = useCallback(() => {
    const adminToken = localStorage.getItem('adminToken');
    const storefrontToken = localStorage.getItem('token');
    const adminUser = readStoredAuthUser('adminUser');
    const storefrontUser = readStoredAuthUser('user');

    if (adminToken && adminUser?.role === 'admin') return adminToken;
    if (storefrontToken && storefrontUser?.role === 'admin') return storefrontToken;
    return null;
  }, []);

  const backgroundPresets = [
    '#FFFFFF', '#000000', '#E5E7EB', '#C7D2FE', '#B11494', '#6D28D9',
    '#1E3A8A', '#3B82F6', '#78350F', '#FDE68A', '#991B1B',
    '#EF4444', '#FBCFE8', '#F97316'
  ];

  const fasteners = [
    { id: 'Pin-Badge', label: 'Pin-Badge' },
    { id: 'Fridge Magnetic-Badge', label: 'Fridge Magnetic-Badge' }
  ];

  const CANVAS_PX = 400;
  const BADGE_MM = 58;
  const OUTER_BADGE_MM = 70;
  const PRINT_DPI = 300;
  const MM_TO_INCH = 25.4;
  
  const CANVAS_SIZE = Math.round((BADGE_MM * PRINT_DPI) / MM_TO_INCH);
  const OUTER_CANVAS_SIZE = Math.round((OUTER_BADGE_MM * PRINT_DPI) / MM_TO_INCH);
  const BASE_PRICE = 69;

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(CUSTOM_ORDER_DRAFT_KEY);
      if (!savedDraft) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(savedDraft) as Partial<CustomOrderDraft>;
      const restoredFastener = typeof draft.fastener === 'string' ? draft.fastener : 'Pin-Badge';
      const restoredQuantity = clamp(Number(draft.quantity) || 1, 1, 999);
      const restoredPrompt = typeof draft.prompt === 'string' ? draft.prompt : '';
      const restoredZoom = clamp(Number(draft.zoom) || 1, 0.2, 5);
      const restoredRotation = clamp(Number(draft.rotation) || 0, -180, 180);
      const restoredBgColor = typeof draft.bgColor === 'string' ? draft.bgColor : '#FFFFFF';

      setFastener(restoredFastener);
      setQuantity(restoredQuantity);
      setPrompt(restoredPrompt);
      setZoom(restoredZoom);
      setRotation(restoredRotation);
      setBgColor(restoredBgColor);

      const imageSrc = typeof draft.imageSrc === 'string' ? draft.imageSrc : '';
      if (imageSrc) {
        const img = new Image();
        img.onload = () => {
          const fitScale = Math.max(CANVAS_PX / img.width, CANVAS_PX / img.height);
          setImageState({
            img,
            x: Number(draft.imageX) || 0,
            y: Number(draft.imageY) || 0,
            scale: fitScale * restoredZoom,
            rotation: restoredRotation,
          });
          setDraftReady(true);
        };
        img.onerror = () => {
          setDraftReady(true);
        };
        img.src = imageSrc;
        return;
      }
    } catch (error) {
      console.error('Failed to restore custom order draft', error);
      localStorage.removeItem(CUSTOM_ORDER_DRAFT_KEY);
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const timer = window.setTimeout(() => {
      const draft: CustomOrderDraft = {
        fastener,
        quantity,
        prompt,
        zoom,
        rotation,
        bgColor,
      };

      if (imageState?.img?.src) {
        draft.imageSrc = imageState.img.src;
        draft.imageX = imageState.x;
        draft.imageY = imageState.y;
      }

      localStorage.setItem(CUSTOM_ORDER_DRAFT_KEY, JSON.stringify(draft));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [draftReady, fastener, quantity, prompt, zoom, rotation, bgColor, imageState]);

  useEffect(() => {
    if (!imageState) return;
    const baseScale = Math.max(CANVAS_PX / imageState.img.width, CANVAS_PX / imageState.img.height);
    setImageState(prev => prev ? { ...prev, scale: baseScale * zoom } : prev);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewCanvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displaySize = CANVAS_PX;
    if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;
    }

    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const cx = CANVAS_PX / 2;
    const cy = CANVAS_PX / 2;
    const OUTER_PX = CANVAS_PX;
    const INNER_PX = (BADGE_MM / OUTER_BADGE_MM) * CANVAS_PX;

    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    ctx.fillStyle = "hsl(222, 47%, 8%)";
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, OUTER_PX / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
    ctx.fill();

    if (imageState) {
      ctx.save();
      ctx.translate(cx + imageState.x, cy + imageState.y);
      ctx.rotate((imageState.rotation * Math.PI) / 180);
      ctx.scale(imageState.scale, imageState.scale);
      ctx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
      ctx.restore();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, OUTER_PX / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(168,85,247,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, INNER_PX / 2, 0, Math.PI * 2);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "hsl(145, 55%, 42%)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (preview) {
      const pDpr = Math.max(window.devicePixelRatio || 1, 2);
      const pDisplaySize = 250;
      if (preview.width !== pDisplaySize * pDpr || preview.height !== pDisplaySize * pDpr) {
        preview.width = pDisplaySize * pDpr;
        preview.height = pDisplaySize * pDpr;
      }
      const pCtx = preview.getContext("2d")!;
      pCtx.save();
      pCtx.scale(pDpr, pDpr);
      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = "high";

      const pSize = pDisplaySize;
      pCtx.clearRect(0, 0, pSize, pSize);
      pCtx.save();
      pCtx.beginPath();
      pCtx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2);
      pCtx.clip();
      pCtx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
      pCtx.fill();

      if (imageState) {
        const previewScale = pSize / INNER_PX;
        pCtx.save();
        pCtx.translate(pSize / 2, pSize / 2);
        pCtx.scale(previewScale, previewScale);
        pCtx.translate(imageState.x, imageState.y);
        pCtx.rotate((imageState.rotation * Math.PI) / 180);
        pCtx.scale(imageState.scale, imageState.scale);
        pCtx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
        pCtx.restore();
      }
      pCtx.restore();

      pCtx.beginPath();
      pCtx.arc(pSize / 2, pSize / 2, pSize / 2 - 1, 0, Math.PI * 2);
      pCtx.strokeStyle = "hsl(145, 55%, 42%)";
      pCtx.lineWidth = 2;
      pCtx.stroke();
      pCtx.restore();
    }
  }, [imageState, bgColor, CANVAS_PX, BADGE_MM, OUTER_BADGE_MM]);

  useEffect(() => { draw(); }, [draw]);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const imageUrl = await generateBadgeMockup(prompt);
      const img = new Image();
      img.onload = () => {
        const fitScale = Math.max(CANVAS_PX / img.width, CANVAS_PX / img.height);
        setZoom(1); setRotation(0);
        setImageState({ img, x: 0, y: 0, scale: fitScale, rotation: 0 });
      };
      img.src = imageUrl;
    } catch (error) {
      setErrorMessage('Failed to generate badge design');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally { setLoading(false); }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const fitScale = Math.max(CANVAS_PX / img.width, CANVAS_PX / img.height);
        setZoom(1); setRotation(0);
        setImageState({ img, x: 0, y: 0, scale: fitScale, rotation: 0 });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFile(file); };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleRatio = CANVAS_PX / rect.width;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * scaleRatio, y: (e.touches[0].clientY - rect.top) * scaleRatio };
    return { x: (e.clientX - rect.left) * scaleRatio, y: (e.clientY - rect.top) * scaleRatio };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageState) return;
    const coords = getCanvasCoords(e);
    setIsDragging(true);
    dragStart.current = { x: coords.x, y: coords.y, imgX: imageState.x, imgY: imageState.y };
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !imageState) return;
    const coords = getCanvasCoords(e);
    setImageState((prev) => prev ? { ...prev, x: dragStart.current.imgX + coords.x - dragStart.current.x, y: dragStart.current.imgY + coords.y - dragStart.current.y } : prev);
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setImageState((prev) => {
      if (!prev) return prev;
      const baseScale = Math.max(CANVAS_PX / prev.img.width, CANVAS_PX / prev.img.height);
      return { ...prev, scale: baseScale * newZoom };
    });
  };

  const handleRotationChange = (newRot: number) => {
    setRotation(newRot);
    setImageState((prev) => (prev ? { ...prev, rotation: newRot } : prev));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartDist.current = dist;
        pinchStartZoom.current = zoomRef.current;
      } else if (e.touches.length === 1 && imageStateRef.current) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleRatio = CANVAS_PX / rect.width;
        const x = (e.touches[0].clientX - rect.left) * scaleRatio;
        const y = (e.touches[0].clientY - rect.top) * scaleRatio;
        setIsDragging(true);
        dragStart.current = {
          x,
          y,
          imgX: imageStateRef.current.x,
          imgY: imageStateRef.current.y,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current > 0) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = currentDist / pinchStartDist.current;
        const newZoom = Math.max(0.2, Math.min(5, pinchStartZoom.current * ratio));
        handleZoomChange(newZoom);
      } else if (e.touches.length === 1 && isDraggingRef.current && imageStateRef.current) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleRatio = CANVAS_PX / rect.width;
        const x = (e.touches[0].clientX - rect.left) * scaleRatio;
        const y = (e.touches[0].clientY - rect.top) * scaleRatio;
        setImageState((prev) =>
          prev
            ? {
                ...prev,
                x: dragStart.current.imgX + x - dragStart.current.x,
                y: dragStart.current.imgY + y - dragStart.current.y,
              }
            : prev
        );
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist.current = 0;
      }
      if (e.touches.length === 0) {
        setIsDragging(false);
      }
    };

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      handleZoomChange(Math.max(0.2, Math.min(5, zoomRef.current + delta)));
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);
    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [handleZoomChange]);

  const getFullCircleBlob = (): Promise<string> => {
    return new Promise((resolve) => {
      const EXPORT_OUTER = OUTER_CANVAS_SIZE;
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_OUTER; offCanvas.height = EXPORT_OUTER;
      const ctx = offCanvas.getContext("2d")!;
      const cx = EXPORT_OUTER / 2;
      const scale = EXPORT_OUTER / CANVAS_PX;
      ctx.beginPath(); ctx.arc(cx, cx, EXPORT_OUTER / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor; ctx.fill();
      if (imageState) {
        ctx.save();
        ctx.translate(cx + imageState.x * scale, cx + imageState.y * scale);
        ctx.rotate((imageState.rotation * Math.PI) / 180);
        ctx.scale(imageState.scale * scale, imageState.scale * scale);
        ctx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
        ctx.restore();
      }
      resolve(offCanvas.toDataURL("image/png"));
    });
  };

  const getInnerCircleBlob = (): Promise<string> => {
    return new Promise((resolve) => {
      const INNER_PX = (BADGE_MM / OUTER_BADGE_MM) * CANVAS_PX;
      const EXPORT_SIZE = CANVAS_SIZE;
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_SIZE; offCanvas.height = EXPORT_SIZE;
      const ctx = offCanvas.getContext("2d")!;
      const cx = EXPORT_SIZE / 2;
      ctx.beginPath(); ctx.arc(cx, cx, EXPORT_SIZE / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor; ctx.fill();
      if (imageState) {
        const previewScale = EXPORT_SIZE / INNER_PX;
        ctx.save(); ctx.translate(cx, cx); ctx.scale(previewScale, previewScale);
        ctx.translate(imageState.x, imageState.y);
        ctx.rotate((imageState.rotation * Math.PI) / 180);
        ctx.scale(imageState.scale, imageState.scale);
        ctx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
        ctx.restore();
      }
      resolve(offCanvas.toDataURL("image/png"));
    });
  };

  const handleDownloadPrintFile = async () => {
    if (!imageState) { setErrorMessage('Please upload or generate an image first'); setTimeout(() => setErrorMessage(null), 3000); return; }
    const adminAuthToken = getAdminAuthToken();
    if (!adminAuthToken || !isAdmin()) {
      setErrorMessage('Admin access required');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setDownloading(true);
    try {
      const [outerDataUrl, innerDataUrl] = await Promise.all([getFullCircleBlob(), getInnerCircleBlob()]);
      const response = await fetch(`${API_BASE_URL}/api/badge-doc/download`, {
        method: 'POST', headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuthToken}`,
        },
        body: JSON.stringify({ image: innerDataUrl, printImage: outerDataUrl, name: `Custom ${fastener}`, quantity }),
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'StickToon-Badge-Print.docx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) { setErrorMessage('Failed to download print file'); setTimeout(() => setErrorMessage(null), 3000); }
    finally { setDownloading(false); }
  };

  const handleAddToCart = async () => {
    if (!imageState) { setErrorMessage('Please upload or generate an image first'); setTimeout(() => setErrorMessage(null), 3000); return; }
    setLoading(true);
    try {
      const [outerDataUrl, innerDataUrl] = await Promise.all([getFullCircleBlob(), getInnerCircleBlob()]);
      const customBadge: Badge = {
        id: `custom-${Date.now()}`, name: `CUSTOM ${fastener.toUpperCase()}`, price: BASE_PRICE,
        category: Category.CUSTOM, image: innerDataUrl, printImage: outerDataUrl,
        details: `Custom designed ${fastener} badge.`, color: 'bg-white'
      };
      addToCart(customBadge, quantity);
    } catch (e) { setErrorMessage('Failed to add badge to cart'); setTimeout(() => setErrorMessage(null), 3000); }
    finally { setLoading(false); }
  };

  const handleReset = () => { setImageState(prev => prev ? { ...prev, x: 0, y: 0 } : prev); setZoom(1); setRotation(0); };

  const handleDownloadPreview = async () => {
    if (!imageState) return;
    const dataUrl = await getInnerCircleBlob();
    const a = document.createElement('a'); a.href = dataUrl; a.download = `badge-preview-58mm-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDownloadTemplate = async () => {
    if (!imageState) return;
    const dataUrl = await getFullCircleBlob();
    const a = document.createElement('a'); a.href = dataUrl; a.download = `badge-template-70mm-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 relative font-sans text-slate-900">
      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-red-700 font-bold text-sm">
          <X className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-4 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Badge Designer
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Template: <span className="font-mono text-yellow-700 font-black">{OUTER_BADGE_MM}mm / {BADGE_MM}mm</span>
            </p>
          </div>
          {/* Price Tag in Header */}
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-xl font-black text-slate-900">{formatPrice(BASE_PRICE * quantity)}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-3 py-4 pb-20 sm:px-4 sm:py-5 lg:pb-5 lg:h-[calc(100vh-73px)] lg:overflow-hidden">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start lg:h-full">
          {/* ===== LEFT PANEL: Config + Controls ===== */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-yellow-600" /> Configuration
              </h3>

              {/* Fastener */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Fastener Type</label>
                <select value={fastener} onChange={(e) => setFastener(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-yellow-500">
                  {fasteners.map(f => <option key={f.id} value={f.id} className="bg-white">{f.label}</option>)}
                </select>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Image Upload */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-yellow-600" /> Image
                </h3>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 hover:border-yellow-500 hover:text-yellow-800 hover:bg-yellow-50 transition-all">
                  <Upload className="h-3.5 w-3.5" /> Upload Image
                </button>
                {imageState && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Image loaded
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              {/* Canvas Controls */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <ZoomIn className="w-3.5 h-3.5 text-yellow-600" /> Controls
                </h3>

                {/* Zoom */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Zoom</label>
                    <span className="text-[11px] font-mono font-bold text-yellow-700">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input type="range" min="0.2" max="5" step="0.01" value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Rotate</label>
                    <span className="text-[11px] font-mono font-bold text-yellow-700">{rotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" step="1" value={rotation}
                    onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>

                {/* Background */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1.5 block flex items-center gap-1">
                    <Palette className="w-3 h-3 text-yellow-600" /> Background
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {backgroundPresets.map(color => (
                      <button key={color} onClick={() => setBgColor(color)}
                        className={`w-full aspect-square rounded-md border-2 transition-all ${bgColor === color ? 'border-yellow-500 scale-110 shadow-sm' : 'border-slate-200 hover:border-slate-400'}`}
                        style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleReset}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" /> Replace
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CENTER: Canvas ===== */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Canvas Area */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 flex-1 flex flex-col shadow-sm"
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-yellow-600" />
                  {OUTER_BADGE_MM}mm Canvas
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drag • Scroll to zoom</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full rounded-xl cursor-grab active:cursor-grabbing shadow-lg ring-1 ring-slate-200"
                  style={{ aspectRatio: "1/1", width: "100%", maxWidth: "min(100%, 420px)", touchAction: "none" }}
                  onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                />
              </div>
            </div>

            {/* Guide Legend */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-yellow-500 rounded" />
                  <span className="text-[10px] font-bold text-slate-600">{OUTER_BADGE_MM}mm Cut</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 border-t-2 border-dashed border-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600">{BADGE_MM}mm Visible</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT PANEL: Preview & Price ===== */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-2">
                <Eye className="w-3.5 h-3.5 text-yellow-600" /> Final Preview
              </h3>
              <div className="flex justify-center">
                <canvas ref={previewCanvasRef} width={250} height={250}
                  className="rounded-full shadow-md w-full max-w-[180px] h-auto ring-2 ring-slate-200"
                  style={{ aspectRatio: '1 / 1' }} />
              </div>

              {/* Qty + Price */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-9 flex-shrink-0">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-full flex-shrink-0 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center border-r border-slate-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-8 min-w-0 h-full bg-transparent text-center font-black text-slate-900 focus:outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-full flex-shrink-0 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center border-l border-slate-200">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-lg font-black text-slate-900">{formatPrice(BASE_PRICE * quantity)}</span>
                  </div>
                </div>
                <button onClick={handleAddToCart} disabled={loading || !imageState}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-slate-900 font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                {isAdmin() && (
                  <button onClick={handleDownloadPrintFile} disabled={downloading || !imageState}
                    className="w-full h-8 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} {downloading ? 'Generating...' : 'Print File'}
                  </button>
                )}
                {isAdmin() && imageState && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleDownloadPreview}
                      className="h-7 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-all">
                      <Download className="w-2.5 h-2.5" /> Preview
                    </button>
                    <button onClick={handleDownloadTemplate}
                      className="h-7 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-100 transition-all">
                      <Download className="w-2.5 h-2.5" /> Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md p-3 lg:hidden shadow-lg">
        <button onClick={() => setMobileToolsOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-3 text-sm font-black text-slate-900 flex items-center justify-center gap-2 shadow-md">
          <Settings2 className="w-4 h-4" /> Open Design Tools
        </button>
      </div>

      {/* Mobile Tools Drawer */}
      {mobileToolsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileToolsOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white border-t border-slate-200 p-5 text-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Design Tools</h3>
              <button onClick={() => setMobileToolsOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Fastener Type</label>
                <select value={fastener} onChange={(e) => setFastener(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900">
                  {fasteners.map((f) => <option key={f.id} value={f.id} className="bg-white">{f.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Quantity</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center font-bold text-slate-900" />
                  <button onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button onClick={() => fileInputRef.current?.click()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-700 hover:border-yellow-500 transition-all">
                <Upload className="h-5 w-5 text-yellow-600" /> Upload Image
              </button>

              {imageState && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Canvas Controls</h4>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Zoom</label>
                      <span className="text-xs font-mono font-bold text-yellow-700">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input type="range" min="0.2" max="5" step="0.01" value={zoom}
                      onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-yellow-500" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Rotate</label>
                      <span className="text-xs font-mono font-bold text-yellow-700">{rotation}°</span>
                    </div>
                    <input type="range" min="-180" max="180" step="1" value={rotation}
                      onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-yellow-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleReset}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800">
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800">
                      <Upload className="h-3 w-3" /> Replace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
