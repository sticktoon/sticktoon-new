import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateBadgeMockup } from '../geminiService.ts';
import { 
  Upload, Wand2, Loader2, ShoppingCart, Download, RotateCcw, RotateCw,
  Plus, Minus, X, Info, CheckCircle2
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
}

export default function CustomOrder({ addToCart }: CustomOrderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Badge Configuration
  const [fastener, setFastener] = useState('Pin-Badge');
  const [quantity, setQuantity] = useState(1);
  const [prompt, setPrompt] = useState('');
  
  // Image State
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, imgX: 0, imgY: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const backgroundPresets = [
    '#FFFFFF', '#000000', '#E5E7EB', '#C7D2FE', '#B11494', '#6D28D9',
    '#1E3A8A', '#3B82F6', '#78350F', '#FDE68A', '#991B1B',
    '#EF4444', '#FBCFE8', '#F97316'
  ];

  const fasteners = [
    { id: 'Pin-Badge', label: 'Pin-Badge' },
    { id: 'Fridge Magnetic-Badge', label: 'Fridge Magnetic-Badge' }
  ];

  // Constants
  const CANVAS_PX = 400; // Display size
  const BADGE_MM = 58;
  const OUTER_BADGE_MM = 70;
  const PRINT_DPI = 300;
  const MM_TO_INCH = 25.4;
  
  const CANVAS_SIZE = Math.round((BADGE_MM * PRINT_DPI) / MM_TO_INCH); // 68 5px - 58mm print
  const OUTER_CANVAS_SIZE = Math.round((OUTER_BADGE_MM * PRINT_DPI) / MM_TO_INCH); // 827px - 70mm print
  const BASE_PRICE = 69;

  // Re-fit image when badge size changes
  useEffect(() => {
    if (!imageState) return;
    const baseScale = Math.max(CANVAS_PX / imageState.img.width, CANVAS_PX / imageState.img.height);
    setImageState(prev => prev ? { ...prev, scale: baseScale * zoom } : prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw everything
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = CANVAS_PX / 2;
    const cy = CANVAS_PX / 2;
    const OUTER_PX = CANVAS_PX;
    const INNER_PX = (BADGE_MM / OUTER_BADGE_MM) * CANVAS_PX;

    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    ctx.fillStyle = "hsl(210, 14%, 91%)";
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    // Clip to outer circle and draw image
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

    // Outer circle (solid black)
    ctx.beginPath();
    ctx.arc(cx, cy, OUTER_PX / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner guide circle (dashed green)
    ctx.beginPath();
    ctx.arc(cx, cy, INNER_PX / 2, 0, Math.PI * 2);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "hsl(145, 55%, 42%)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner preview canvas
    if (preview) {
      const pCtx = preview.getContext("2d")!;
      const pSize = preview.width;
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
    }
  }, [imageState, bgColor, CANVAS_PX, BADGE_MM, OUTER_BADGE_MM]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Load image from AI generation
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const imageUrl = await generateBadgeMockup(prompt);
      const img = new Image();
      img.onload = () => {
        const fitScale = Math.max(CANVAS_PX / img.width, CANVAS_PX / img.height);
        setZoom(1);
        setRotation(0);
        setImageState({ img, x: 0, y: 0, scale: fitScale, rotation: 0 });
      };
      img.src = imageUrl;
    } catch (error) {
      console.error('AI generation error:', error);
      setErrorMessage('Failed to generate badge design');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Load image from file
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const fitScale = Math.max(CANVAS_PX / img.width, CANVAS_PX / img.height);
        setZoom(1);
        setRotation(0);
        setImageState({ img, x: 0, y: 0, scale: fitScale, rotation: 0 });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Pan handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleRatio = CANVAS_PX / rect.width;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleRatio,
        y: (e.touches[0].clientY - rect.top) * scaleRatio,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleRatio,
      y: (e.clientY - rect.top) * scaleRatio,
    };
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
    const dx = coords.x - dragStart.current.x;
    const dy = coords.y - dragStart.current.y;
    setImageState((prev) =>
      prev ? { ...prev, x: dragStart.current.imgX + dx, y: dragStart.current.imgY + dy } : prev
    );
  };

  const handlePointerUp = () => setIsDragging(false);

  // Zoom
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setImageState((prev) => {
      if (!prev) return prev;
      const baseScale = Math.max(CANVAS_PX / prev.img.width, CANVAS_PX / prev.img.height);
      return { ...prev, scale: baseScale * newZoom };
    });
  };

  // Rotation
  const handleRotationChange = (newRot: number) => {
    setRotation(newRot);
    setImageState((prev) => (prev ? { ...prev, rotation: newRot } : prev));
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.2, Math.min(5, zoom + delta));
    handleZoomChange(newZoom);
  };

  // Export functions
  const getFullCircleBlob = (): Promise<string> => {
    return new Promise((resolve) => {
      const EXPORT_OUTER = OUTER_CANVAS_SIZE; // 827px - 70mm
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_OUTER;
      offCanvas.height = EXPORT_OUTER;
      const ctx = offCanvas.getContext("2d")!;
      const cx = EXPORT_OUTER / 2;
      const scale = EXPORT_OUTER / CANVAS_PX;

      ctx.beginPath();
      ctx.arc(cx, cx, EXPORT_OUTER / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
      ctx.fill();

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
      const INNER_PX = (BADGE_MM / OUTER_BADGE_MM) * CANVAS_PX; // Inner circle size on display canvas
      const EXPORT_SIZE = CANVAS_SIZE; // 685px - 58mm export
      
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_SIZE;
      offCanvas.height = EXPORT_SIZE;
      const ctx = offCanvas.getContext("2d")!;
      const cx = EXPORT_SIZE / 2;

      ctx.beginPath();
      ctx.arc(cx, cx, EXPORT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
      ctx.fill();

      if (imageState) {
        // Scale from inner display circle to inner export size
        const previewScale = EXPORT_SIZE / INNER_PX;
        ctx.save();
        ctx.translate(cx, cx);
        ctx.scale(previewScale, previewScale);
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
    if (!imageState) {
      setErrorMessage('Please upload or generate an image first');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setDownloading(true);
    try {
      const [outerDataUrl, innerDataUrl] = await Promise.all([getFullCircleBlob(), getInnerCircleBlob()]);

      const response = await fetch(`${API_BASE_URL}/api/badge-doc/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: innerDataUrl,
          printImage: outerDataUrl,
          name: `Custom ${fastener}`,
          quantity,
        }),
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StickToon-Badge-Print.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Print file download error:', e);
      setErrorMessage('Failed to download print file');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!imageState) {
      setErrorMessage('Please upload or generate an image first');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const [outerDataUrl, innerDataUrl] = await Promise.all([getFullCircleBlob(), getInnerCircleBlob()]);

      const customBadge: Badge = {
        id: `custom-${Date.now()}`,
        name: `CUSTOM ${fastener.toUpperCase()}`,
        price: BASE_PRICE,
        category: Category.CUSTOM,
        image: innerDataUrl,
        printImage: outerDataUrl,
        details: `Custom designed ${fastener} badge.`,
        color: 'bg-white'
      };
      addToCart(customBadge, quantity);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to add badge to cart');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageState(prev => prev ? { ...prev, x: 0, y: 0 } : prev);
    setZoom(1);
    setRotation(0);
  };

  const handleDownloadPreview = async () => {
    if (!imageState) return;
    try {
      const dataUrl = await getInnerCircleBlob();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `badge-preview-58mm-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download preview error:', e);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!imageState) return;
    try {
      const dataUrl = await getFullCircleBlob();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `badge-template-70mm-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download template error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
          <X className="w-5 h-5" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Custom Badge Designer
            </h1>
            <p className="text-sm text-slate-600 font-medium mt-1">
              Button Badge Template: <span className="font-mono text-yellow-600">{OUTER_BADGE_MM}mm / {BADGE_MM}mm</span>
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Control Panel */}
          <div className={`w-full lg:w-80 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl transition-all duration-300 ${panelOpen ? '' : 'hidden lg:block'}`}>
            <div className="p-6 space-y-6">
              {/* Badge Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Badge Configuration</h3>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Fastener Type:</label>
                  <select 
                    value={fastener} 
                    onChange={(e) => setFastener(e.target.value)} 
                    className="w-full mt-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-sm font-semibold text-white"
                  >
                    {fasteners.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Quantity:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-yellow-500/20 font-black text-lg text-white transition-colors"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                      className="flex-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-center font-bold text-white" 
                    />
                    <button 
                      onClick={() => setQuantity(quantity + 1)} 
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-yellow-500/20 font-black text-lg text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-700"></div>

              {/* Image Upload */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Image Upload</h3>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/jpeg,image/png,image/gif" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full h-24 rounded-xl border-2 border-dashed border-yellow-500/30 text-slate-300 font-bold text-sm flex flex-col items-center justify-center gap-2 hover:border-yellow-500/60 hover:text-yellow-400 hover:bg-slate-700/30 transition-all"
                >
                  <Upload className="w-8 h-8" />
                  <span>Upload Image</span>
                  <span className="text-[10px] font-normal text-slate-500">or drag and drop</span>
                </button>
                {imageState && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs font-semibold text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Image loaded successfully
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-700"></div>

              {/* AI Generator */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">AI Generator</h3>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="Describe your badge design..." 
                  className="w-full h-20 px-3 py-2 bg-slate-700 border border-yellow-500/30 rounded-xl text-sm text-white placeholder-slate-400 resize-none focus:border-yellow-500 focus:outline-none" 
                />
                <button 
                  onClick={handleGenerateImage} 
                  disabled={loading || !prompt.trim()} 
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Wand2 className="w-4 h-4" /> Generate</>}
                </button>
              </div>


            </div>
          </div>

          {/* Center: Main Canvas */}
          <div className="flex-1 space-y-6">
            {!imageState && (
              <div
                className="mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-16 cursor-pointer transition-all hover:border-yellow-500 hover:bg-yellow-50/50"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-4 h-16 w-16 text-slate-400" />
                <p className="text-lg font-bold text-slate-700">Drop an image here or click to upload</p>
                <p className="mt-2 text-sm text-slate-500">JPG, PNG, GIF supported</p>
              </div>
            )}

            {/* Canvas */}
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  {OUTER_BADGE_MM}mm Artwork Canvas
                </p>
                <p className="text-xs text-slate-500">Drag image to position • Scroll to zoom</p>
              </div>
              <canvas
                ref={canvasRef}
                width={CANVAS_PX}
                height={CANVAS_PX}
                className="max-w-full rounded-lg cursor-grab active:cursor-grabbing touch-none mx-auto shadow-lg"
                style={{ aspectRatio: "1/1", width: "100%", maxWidth: CANVAS_PX }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onWheel={handleWheel}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              />
            </div>

            {/* Guide Legend */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Guide</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-0.5 w-8 bg-black" />
                  <span className="text-sm text-slate-700 font-medium">{OUTER_BADGE_MM}mm – Cut boundary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-0.5 w-8 border-t-2 border-dashed border-green-600" />
                  <span className="text-sm text-slate-700 font-medium">{BADGE_MM}mm – Visible area</span>
                </div>
              </div>
            </div>

            {/* Order Actions & Downloads */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Price & Cart */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 border border-yellow-500/20 rounded-xl">
                    <span className="text-xs font-bold text-yellow-400 uppercase">Total Price:</span>
                    <span className="text-lg font-black text-white">{formatPrice(BASE_PRICE * quantity)}</span>
                  </div>
                  <button 
                    onClick={handleAddToCart} 
                    disabled={loading || !imageState} 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>
                  <button 
                    onClick={handleDownloadPrintFile} 
                    disabled={downloading || !imageState} 
                    className="w-full h-10 rounded-xl border-2 border-yellow-500/40 text-yellow-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {downloading ? 'Generating...' : 'Download Word File'}
                  </button>
                </div>

                {/* Download Images */}
                {imageState && (
                  <div className="flex-1 space-y-3">
                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Download Images</h3>
                    <button 
                      onClick={handleDownloadPreview}
                      className="w-full h-10 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-500 transition-all"
                    >
                      <Download className="w-4 h-4" /> Preview (58mm)
                    </button>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition-all"
                    >
                      <Download className="w-4 h-4" /> Template (70mm)
                    </button>
                    <button 
                      onClick={async () => {
                        if (!imageState) return;
                        try {
                          const [outerDataUrl, innerDataUrl] = await Promise.all([getFullCircleBlob(), getInnerCircleBlob()]);
                          const response = await fetch(`${API_BASE_URL}/api/badge-doc/download`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: innerDataUrl, printImage: outerDataUrl, name: `Custom ${fastener}`, quantity }),
                          });
                          if (!response.ok) throw new Error('Save failed');
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `StickToon-Badge-${Date.now()}.docx`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (e) {
                          console.error('Save error:', e);
                        }
                      }}
                      className="w-full h-10 rounded-xl bg-yellow-500 text-slate-900 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all"
                    >
                      <Download className="w-4 h-4" /> Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Preview & Controls */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 text-center">
                Final Badge Preview ({BADGE_MM}mm)
              </h3>
              <div className="flex justify-center">
                <canvas 
                  ref={previewCanvasRef} 
                  width={250} 
                  height={250} 
                  className="rounded-full shadow-2xl" 
                  style={{ width: 250, height: 250 }} 
                />
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">
                This is what your customer will see on the finished badge
              </p>
            </div>

            {/* Canvas Controls - shown when image is loaded */}
            {imageState && (
              <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Canvas Controls</h3>
                  
                {/* Zoom Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">Zoom</label>
                    <span className="text-xs font-mono text-yellow-400">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="5" 
                    step="0.01" 
                    value={zoom} 
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))} 
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-500">20%</span>
                    <span className="text-[10px] text-slate-500">500%</span>
                  </div>
                </div>

                {/* Rotation Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">Rotate</label>
                    <span className="text-xs font-mono text-yellow-400">{rotation}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="-180" 
                    max="180" 
                    step="1" 
                    value={rotation} 
                    onChange={(e) => handleRotationChange(parseInt(e.target.value))} 
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-500">-180°</span>
                    <span className="text-[10px] text-slate-500">180°</span>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Background:</label>
                  <div className="grid grid-cols-7 gap-2">
                    {backgroundPresets.map(color => (
                      <button 
                        key={color} 
                        onClick={() => setBgColor(color)} 
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${bgColor === color ? 'border-yellow-500 scale-110' : 'border-slate-600 hover:border-slate-500'}`} 
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleReset}
                    className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Replace
                  </button>
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 rounded-full p-2">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-green-800 uppercase tracking-wide mb-2">Manufacturing Info</h4>
                  <p className="text-[11px] font-semibold text-green-700 leading-relaxed">
                    The {OUTER_BADGE_MM}mm design wraps around the badge. Only the center {BADGE_MM}mm is visible to customers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
