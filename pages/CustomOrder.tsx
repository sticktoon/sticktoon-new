import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateBadgeMockup } from '../geminiService.ts';
import { 
  Upload, Wand2, Loader2, CheckCircle2, Sparkles, 
  Image as ImageIcon, X, Box, Type, QrCode, 
  Palette, Layers, User, Info, MousePointer, Eraser, 
  Grid3X3, AlignCenter, AlignVerticalJustifyCenter, FlipHorizontal, FlipVertical,
  RotateCcw, Copy, Clipboard, Lock, Share2, Trash2, Undo2, Redo2, Eye,
  Plus, Minus, Save, ShoppingCart, ChevronDown, Check, Move, RotateCw,
  AlertCircle, Edit3, Ban, FileStack, Files, Maximize2, Minimize2,
  ChevronUp
} from 'lucide-react';
import { formatPrice } from '../constants.tsx';
import { Badge, Category } from '../types.ts';

interface BadgeElement {
  id: string;
  type: 'text' | 'image' | 'qr';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}
type CanvasElement = {
  id: string;
  type: "text" | "image" | "qr";
  x: number; // percentage (0–100)
  y: number; // percentage (0–100)
  content?: string;
  src?: string;
};

type InteractionType = 'drag' | 'resize' | 'rotate' | null;

interface CustomOrderProps {
  addToCart: (badge: Badge, quantity?: number) => void;
}

export default function CustomOrder({ addToCart }: CustomOrderProps) {
  const [activeTool, setActiveTool] = useState('model'); 
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true); // Auto-open on mobile
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Customization State
  const [fastener, setFastener] = useState('Pin-Badge');
  const [quantity, setQuantity] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [elements, setElements] = useState<BadgeElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [bgColor, setBgColor] = useState('#FFFFFF'); 

  // QR Specific State
  const [qrUrl, setQrUrl] = useState('https://web.whatsapp.com');
  const [qrFgColor, setQrFgColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');

  // Zoom State - ENABLED (for uploaded images only)
  const [zoom, setZoom] = useState(1.2);
  
  const [undoStack, setUndoStack] = useState<BadgeElement[][]>([]);
const [redoStack, setRedoStack] = useState<BadgeElement[][]>([]);
const pushToHistory = (current: BadgeElement[]) => {
  setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(current))]);
  setRedoStack([]); // clear redo when new action happens
};

  const backgroundPresets = [
    '#TRANSPARENT', '#000000', '#E5E7EB', '#C7D2FE', '#B11494', '#6D28D9',
    '#1E3A8A', '#3B82F6', '#78350F', '#FDE68A', '#991B1B',
    '#EF4444', '#FBCFE8', '#F97316', '#FACC_15', '#FEF08A',
    '#BBF7D0', '#A3E635', '#A1A1AA', '#166534', '#2DD4BF',
    '#0D9488', '#115E59', '#1E293B', '#FFFFFF'
  ];

  const fasteners = [
    { id: 'Pin-Badge', label: 'Pin-Badge' },
    { id: 'Fridge Magnetic-Badge', label: 'Fridge Magnetic-Badge' }
  ];


  // Interaction State
  const [interaction, setInteraction] = useState<{
    type: InteractionType;
    startX: number;
    startY: number;
    startElemX: number;
    startElemY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Display size (screen viewing) - scaled up for better visibility
  const SCREEN_DPI = 96;
  const MM_TO_INCH = 25.4;
  const BADGE_MM = 58;
  const OUTER_BADGE_MM = 70;
  const DISPLAY_SCALE = 1.2; // Scale factor for larger display
  
  const DISPLAY_CANVAS_SIZE = Math.round((BADGE_MM * SCREEN_DPI) / MM_TO_INCH * DISPLAY_SCALE); // ~263px - 58mm on screen (scaled)
  const DISPLAY_OUTER_CANVAS_SIZE = Math.round((OUTER_BADGE_MM * SCREEN_DPI) / MM_TO_INCH * DISPLAY_SCALE); // ~317px - 70mm on screen (scaled)

  // Export size (print quality - 300 DPI)
  const PRINT_DPI = 300;
  const CANVAS_SIZE = Math.round((BADGE_MM * PRINT_DPI) / MM_TO_INCH); // 685px - 58mm print
  const OUTER_CANVAS_SIZE = Math.round((OUTER_BADGE_MM * PRINT_DPI) / MM_TO_INCH); // 827px - 70mm print

  const BASE_PRICE = 69;
 const INNER_CIRCLE_DIAMETER = CANVAS_SIZE; // exact 58mm


  const hexToRgbParams = (hex: string) => {
    if (hex === '#TRANSPARENT') return '255-255-255';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}-${g}-${b}`;
  };

  const handleMouseDown = (e: React.MouseEvent, type: InteractionType, id: string) => {
    e.stopPropagation();
    const elem = elements.find(el => el.id === id);
    if (!elem) return;

    setSelectedId(id);
    setInteraction({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startElemX: elem.x,
      startElemY: elem.y,
      startWidth: elem.width,
      startHeight: elem.height,
      startRotation: elem.rotation
    });
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, type: InteractionType, id: string) => {
    e.stopPropagation();
    const elem = elements.find(el => el.id === id);
    if (!elem) return;
    const touch = e.touches[0];

    setSelectedId(id);
    setInteraction({
      type,
      startX: touch.clientX,
      startY: touch.clientY,
      startElemX: elem.x,
      startElemY: elem.y,
      startWidth: elem.width,
      startHeight: elem.height,
      startRotation: elem.rotation
    });
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!interaction || !selectedId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - interaction.startX;
    const dy = touch.clientY - interaction.startY;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedId) return el;
      if (interaction.type === 'drag') return { ...el, x: interaction.startElemX + dx, y: interaction.startElemY + dy };
      if (interaction.type === 'resize') return { ...el, width: Math.max(20, interaction.startWidth + dx), height: Math.max(20, interaction.startHeight + dy) };
      if (interaction.type === 'rotate') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return el;
        const centerX = rect.left + el.x + el.width / 2;
        const centerY = rect.top + el.y + el.height / 2;
        const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        return { ...el, rotation: (angle * 180) / Math.PI + 90 };
      }
      return el;
    }));
  }, [interaction, selectedId]);

  const handleTouchEnd = useCallback(() => setInteraction(null), []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!interaction || !selectedId) return;
    const dx = e.clientX - interaction.startX;
    const dy = e.clientY - interaction.startY;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedId) return el;
      if (interaction.type === 'drag') return { ...el, x: interaction.startElemX + dx, y: interaction.startElemY + dy };
      if (interaction.type === 'resize') return { ...el, width: Math.max(20, interaction.startWidth + dx), height: Math.max(20, interaction.startHeight + dy) };
      if (interaction.type === 'rotate') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return el;
        const centerX = rect.left + el.x + el.width / 2;
        const centerY = rect.top + el.y + el.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        return { ...el, rotation: (angle * 180) / Math.PI + 90 };
      }
      return el;
    }));
  }, [interaction, selectedId]);

  const handleMouseUp = useCallback(() => setInteraction(null), []);

  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1; // Scroll down = zoom out, scroll up = zoom in
      const newZoom = Math.max(0.5, Math.min(3, prev * delta)); // Limit zoom between 0.5x and 3x
      return newZoom;
    });
  }, []);

  useEffect(() => {
    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [interaction, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
      return () => {
        canvas.removeEventListener('wheel', handleCanvasWheel);
      };
    }
  }, [handleCanvasWheel]);

  const captureCanvasAsDataURL = async (): Promise<string> => {
    // Use a reasonable export size (not too large, clear enough)
    const EXPORT_SIZE = 500; // 500px final badge image
    const EXPORT_OUTER = Math.round(EXPORT_SIZE * (OUTER_BADGE_MM / BADGE_MM)); // ~603px for 70mm
    
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Scale from display coordinates to export coordinates
    const scale = EXPORT_OUTER / DISPLAY_OUTER_CANVAS_SIZE;
    // Offset to show only the center 58mm portion (same as preview)
    const offset = (EXPORT_OUTER - EXPORT_SIZE) / 2;

    // Fill background
    ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#FFFFFF' : bgColor;
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
    
    // Create circular clip for the 58mm badge
    ctx.beginPath();
    ctx.arc(EXPORT_SIZE/2, EXPORT_SIZE/2, EXPORT_SIZE/2, 0, Math.PI * 2);
    ctx.clip(); 

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      // Scale from display to export, then offset to show center 58mm
      const expX = (el.x * scale) - offset;
      const expY = (el.y * scale) - offset;
      const expW = el.width * scale;
      const expH = el.height * scale;

      if (el.type === 'text') {
        ctx.save();
        ctx.translate(expX + expW/2, expY + expH/2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.fillStyle = '#0f172a';
        ctx.font = `900 ${expH * 0.7}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.content, 0, 0);
        ctx.restore();
      } else {
        const img = new Image();
        img.src = el.content;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.save();
            ctx.translate(expX + expW/2, expY + expH/2);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.drawImage(img, -expW/2, -expH/2, expW, expH);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
        });
      }
    }
    return canvas.toDataURL('image/png');
  };

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      const dataUrl = await captureCanvasAsDataURL();
      const customBadge: Badge = {
        id: `custom-${Date.now()}`,
        name: `CUSTOM ${fastener.toUpperCase()}`,
        price: BASE_PRICE,
        category: Category.CUSTOM,
        image: dataUrl,
        details: `Custom designed ${fastener} badge.`,
        color: 'bg-white'
      };
      addToCart(customBadge, quantity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addText = () => {
    if (!textInput.trim()) return;
    const newEl: BadgeElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      content: textInput,
      x: CANVAS_SIZE / 2 - 50,
      y: CANVAS_SIZE / 2 - 20,
      width: 100,
      height: 40,
      rotation: 0,
      zIndex: elements.length + 1
    };
    setElements([...elements, newEl]);
    setTextInput('');
    setSelectedId(newEl.id);
  };

  const handleScaleElement = (id: string, delta: number) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      const aspect = el.width / el.height;
      const newWidth = Math.max(20, el.width + delta);
      const newHeight = newWidth / aspect;
      // Keep centered
      const dx = (newWidth - el.width) / 2;
      const dy = (newHeight - el.height) / 2;
      return { ...el, width: newWidth, height: newHeight, x: el.x - dx, y: el.y - dy };
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Convert to data URL for proper canvas capture
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Size image to fill the full 70mm design canvas area
      const size = DISPLAY_OUTER_CANVAS_SIZE;
      const startX = 0;
      const startY = 0;

      const newEl: BadgeElement = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: dataUrl,
        x: startX,
        y: startY,
        width: size,
        height: size,
        rotation: 0,
        zIndex: elements.length + 1
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newEl.id);
    };
    reader.readAsDataURL(file);
  };

  const handleAIUpload = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const url = await generateBadgeMockup(prompt);
      const newEl: BadgeElement = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: url,
        x: 0,
        y: 0,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        rotation: 0,
        zIndex: elements.length + 1
      };
      setElements([...elements, newEl]);
      setSelectedId(newEl.id);
      setPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addQRCode = () => {
    if (!qrUrl.trim()) return;
    const fg = hexToRgbParams(qrFgColor);
    const bg = hexToRgbParams(qrBgColor);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&color=${fg}&bgcolor=${bg}&margin=1`;
    const newEl: BadgeElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'qr',
      content: url,
      x: CANVAS_SIZE / 2 - 100,
      y: CANVAS_SIZE / 2 - 100,
      width: 200,
      height: 200,
      rotation: 0,
      zIndex: elements.length + 1
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const alignCenter = (type: 'h' | 'v') => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedId) return el;
      return type === 'h' ? { ...el, x: (CANVAS_SIZE - el.width) / 2 } : { ...el, y: (CANVAS_SIZE - el.height) / 2 };
    }));
  };

  const changeLayer = (dir: 'up' | 'down') => {
    if (!selectedId) return;
    setElements(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(el => el.id === selectedId);
      if (idx === -1) return prev;
      if (dir === 'up' && idx < sorted.length - 1) {
        const next = sorted[idx + 1], current = sorted[idx];
        const tempZ = current.zIndex; current.zIndex = next.zIndex; next.zIndex = tempZ;
      } else if (dir === 'down' && idx > 0) {
        const prevEl = sorted[idx - 1], current = sorted[idx];
        const tempZ = current.zIndex; current.zIndex = prevEl.zIndex; prevEl.zIndex = tempZ;
      }
      return [...sorted];
    });
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const clearCanvas = () => {
    if (confirm('Clear entire design?')) {
      setElements([]);
      setSelectedId(null);
      setBgColor('#FFFFFF');
    }
  };
const handleUndo = () => {
  if (!undoStack.length) return;

  const previous = undoStack[undoStack.length - 1];
  setRedoStack(r => [...r, elements]);
  setUndoStack(u => u.slice(0, -1));
  setElements(previous);
};
const handleRedo = () => {
  if (!redoStack.length) return;

  const next = redoStack[redoStack.length - 1];
  setUndoStack(u => [...u, elements]);
  setRedoStack(r => r.slice(0, -1));
  setElements(next);
};
const handleDelete = () => {
  if (!selectedId) return;

  pushToHistory(elements);
  removeElement(selectedId);
};
const handleCenter = () => {
  if (!selectedId) return;

  pushToHistory(elements);
  alignCenter('h');
  alignCenter('v');
};
const handleClear = () => {
  if (!elements.length) return;

  pushToHistory(elements);
  clearCanvas();
};
const handleReset = () => {
  pushToHistory(elements);
  setElements([]);
  setSelectedId(null);
  setBgColor('#FFFFFF');
};

  const ToolButton = ({ icon: Icon, id, label, count }: { icon: any, id: string, label: string, count?: number }) => (
    <button 
      onClick={() => {
        setActiveTool(id);
        setPanelOpen(true);
      }}
      className={`w-full h-16 flex flex-col items-center justify-center gap-1 transition-all border-b border-slate-700/50 relative ${activeTool === id ? 'bg-yellow-500/20 text-yellow-400 border-r-4 border-r-yellow-500 shadow-[inset_-3px_0_0_#eab308]'
  : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700/30'}`}
    >
     <Icon className="w-5 h-5 drop-shadow-sm" />

      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute top-2 right-2 bg-yellow-500 text-slate-900 text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 border border-slate-800 shadow-sm">{count}</span>
      )}
    </button>
  );

  const TopBarIcon = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <div className="relative group flex items-center justify-center">
      <button 
        onClick={onClick} 
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all hover:text-blue-600 active:scale-95 flex items-center justify-center"
      >
        <Icon className="w-4 h-4" />
      </button>
      <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-2 group-hover:translate-y-0 z-[100]">
        <div className="bg-[#000000] text-white text-[9px] font-black px-2.5 py-1.5 rounded uppercase tracking-widest whitespace-nowrap shadow-xl flex flex-col items-center relative">
          <div className="w-2.5 h-2.5 bg-[#000000] rotate-45 absolute -top-1 left-1/2 -translate-x-1/2 shadow-sm border-t border-l border-white/5"></div>
          {label}
        </div>
      </div>
    </div>
  );

  // StepperControl updated to use arrows as in SS
  const StepperControl = ({ label, value, onIncrease, onDecrease, unit = "" }: { label: string, value: string|number, onIncrease: () => void, onDecrease: () => void, unit?: string }) => (
    <div className="flex items-center justify-between border border-slate-200 rounded-xl overflow-hidden bg-white h-11 hover:shadow-sm transition
">
      <div className="px-4 border-r border-slate-200 flex items-center h-full bg-white flex-shrink-0">
        <span className="text-[11px] font-bold uppercase text-black">{label}</span>
      </div>
      <div className="flex-grow text-center text-sm font-bold text-black bg-white h-full flex items-center justify-center px-2">
        {value}{unit}
      </div>
      <div className="flex flex-col border-l border-slate-200 h-full w-12">
        <button 
          onClick={onIncrease}
          className="flex-1 flex items-center justify-center hover:bg-slate-50 text-slate-800 font-bold hover:text-blue-600 border-b border-slate-100 transition-colors"
          title="Increase"
        >
          <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
        <button 
          onClick={onDecrease} 
          className="flex-1 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold hover:text-blue-600 transition-colors"
          title="Decrease"
        >
          <ChevronDown className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>
    </div>
  );

  return (
  <div className="flex h-[calc(100vh-64px)] w-full bg-gradient-to-br from-yellow-200 via-yellow-300 to-amber-300 overflow-hidden select-none relative">
      
      {/* Textured Paper Pattern Overlay - More Visible */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          mixBlendMode: 'multiply'
        }}
      />
      
      {/* Additional Paper Grain Texture */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Premium background glow - Logo Theme */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-400/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[100px]" />
      </div>

      {errorMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-black uppercase tracking-widest">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Sidebar Tool Rail - Desktop Only */}
  <div className="hidden md:flex w-16 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-yellow-500/20 flex-col z-30 shadow-[6px_0_30px_rgba(234,179,8,0.15)]">
        <ToolButton icon={Box} id="model" label="MODEL" />
        <ToolButton icon={Type} id="text" label="TEXT" />
        <ToolButton icon={ImageIcon} id="image" label="IMAGE" />
        <ToolButton icon={QrCode} id="qr" label="QR" />
        <ToolButton icon={Palette} id="pattern" label="DESIGN" />
        <ToolButton icon={Layers} id="layers" label="LAYERS" count={elements.length} />
        <div className="mt-auto border-t border-yellow-500/20">
          {/* <ToolButton icon={User} id="user" label="USER" />
           */}
        </div>
      </div>

      {/* Desktop Control Panel */}
      <div className={`w-[320px] bg-gradient-to-b from-slate-900 to-slate-800 border-r border-yellow-500/20 flex-col z-20 shadow-[6px_0_25px_rgba(234,179,8,0.15)] max-h-full overflow-y-auto transition-all duration-300 ${panelOpen ? 'hidden md:flex' : 'hidden'}`}>

        <div className="p-4 border-b border-yellow-500/20 flex items-center justify-between bg-slate-800/60">
          <h2 className="text-[11px] font-bold tracking-wide uppercase text-yellow-400">
            {activeTool.toUpperCase()}
          </h2>
          <button
            onClick={() => setPanelOpen(false)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="p-4 flex flex-col space-y-5">
          {activeTool === 'model' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 border-2 border-red-300 px-3 py-3 text-center">
                <div className="text-xl font-black text-red-600">⭕ 58 MM</div>
                <div className="text-[8px] font-bold text-red-600 uppercase mt-1">Fixed Badge Size</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-yellow-400">Fastener:</label>
                <select value={fastener} onChange={(e) => setFastener(e.target.value)} className="w-full mt-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-sm font-semibold text-white">
                  {fasteners.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-yellow-400">Quantity:</label>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-yellow-500/20 font-black text-lg text-white">-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-center font-bold text-white" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-yellow-500/20 font-black text-lg text-white">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 border border-yellow-500/20 rounded-xl">
                <span className="text-xs font-bold text-yellow-400 uppercase">Total Price:</span>
                <span className="text-lg font-black text-white">{formatPrice(BASE_PRICE * quantity)}</span>
              </div>
              <button onClick={handleAddToCart} disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-yellow-500/30 transition-all">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          )}
          {activeTool === 'text' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Enter text..." className="flex-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-sm text-white placeholder-slate-400" />
                <button onClick={addText} className="px-4 h-10 bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors">Add</button>
              </div>
            </div>
          )}
          {activeTool === 'image' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-12 rounded-xl border-2 border-dashed border-yellow-500/30 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:border-yellow-500/60 hover:text-yellow-400 transition-all">
                <Upload className="w-4 h-4" /> Upload Image
              </button>
            </div>
          )}
          {activeTool === 'qr' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="Enter URL..." className="flex-1 h-10 px-3 bg-slate-700 border border-yellow-500/30 rounded-xl text-sm text-white placeholder-slate-400" />
                <button onClick={addQRCode} className="px-4 h-10 bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors">Add QR</button>
              </div>
            </div>
          )}
          {activeTool === 'pattern' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-yellow-400">Background Color:</label>
              <div className="grid grid-cols-6 gap-2">
                {backgroundPresets.slice(0, 12).map(color => (
                  <button key={color} onClick={() => setBgColor(color)} className={`w-full aspect-square rounded-lg border-2 ${bgColor === color ? 'border-yellow-500' : 'border-slate-600'}`} style={{ backgroundColor: color === '#TRANSPARENT' ? '#fff' : color }}></button>
                ))}
              </div>
            </div>
          )}
          {activeTool === 'layers' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-yellow-400">Manage Layers</p>
              {elements.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No layers added</p>
              ) : (
                <div className="space-y-2">
                  {elements.sort((a,b) => b.zIndex - a.zIndex).map((el) => (
                    <div key={el.id} onClick={() => setSelectedId(el.id)} className={`flex items-center justify-between p-2 rounded-lg border-2 ${selectedId === el.id ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-600 bg-slate-700/50'}`}>
                      <span className="text-sm font-semibold truncate text-white">{el.type === 'text' ? el.content : el.type.toUpperCase()}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Main Workspace */}
  <div
  className="flex-grow flex flex-col relative bg-transparent overflow-auto md:overflow-hidden w-full md:w-auto"
  onMouseDown={() => setSelectedId(null)}
>


        {/* Top Toolbar */}
        {/* <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-1 justify-center z-40 shadow-sm overflow-visible">
          <TopBarIcon icon={Info} label="Info" />
          <TopBarIcon icon={MousePointer} label="Select" />
          <TopBarIcon icon={Eraser} label="Clear Design" onClick={clearCanvas} />
          <TopBarIcon icon={Grid3X3} label="Toggle Grid" />
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <TopBarIcon icon={AlignCenter} label="Align Horizontal" onClick={() => alignCenter('h')} />
          <TopBarIcon icon={AlignVerticalJustifyCenter} label="Align Vertical" onClick={() => alignCenter('v')} />
          <TopBarIcon icon={FlipHorizontal} label="Flip Horizontal" />
          <TopBarIcon icon={FlipVertical} label="Flip Vertical" />
          <TopBarIcon icon={RotateCcw} label="Rotate Reset" />
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <TopBarIcon icon={Files} label="Bring to Front" onClick={() => changeLayer('up')} />
          <TopBarIcon icon={FileStack} label="Send to Back" onClick={() => changeLayer('down')} />
          <TopBarIcon icon={Lock} label="Lock Layer" />
          <TopBarIcon icon={Share2} label="Share Design" />
          <TopBarIcon icon={Copy} label="Duplicate Object" />
          <TopBarIcon icon={Trash2} label="Delete Object" onClick={() => selectedId && removeElement(selectedId)} />
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <TopBarIcon icon={Undo2} label="Undo Change" />
          <TopBarIcon icon={Redo2} label="Redo Change" />
          <TopBarIcon icon={Eye} label="Preview" />
        </div> */}

        <div className="flex-grow relative flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 overflow-auto pb-32 md:pb-8">
          
          <div className="text-center mb-4 md:mb-6 max-w-6xl px-2 md:px-4">
             <div className="bg-yellow-50 border-2 border-yellow-400/50 rounded-lg p-3 md:p-4 mb-2 md:mb-3">
               <p className="text-[12px] md:text-[12px] font-black text-yellow-700 uppercase tracking-widest text-center">
                 ⭕ Final Badge Size: 58 MM • Work Area: 70 MM
               </p>
               <p className="text-[9px] md:text-[10px] font-semibold text-orange-600 uppercase tracking-widest text-center mt-2">
                 Design till 70mm • Red dashed circle shows 58mm final badge area
               </p>
             </div>
          </div>

          {/* Dual Circle Layout - Editor + Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full max-w-6xl px-4">
            
            {/* LEFT: Editing Circle with Crop Overlay */}
            <div className="flex flex-col items-center gap-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Design Canvas</h3>
              <div className="relative" ref={canvasRef}>
                <div className="absolute inset-0 bg-slate-900/10 rounded-full blur-[40px] translate-y-8 scale-110"></div>
            
            {/* Outer 70MM Circle - Always shown as badge structure */}
              <div 
                className="rounded-full relative shadow-sm flex items-center justify-center transition-colors duration-300 border-2 border-slate-200/20 overflow-hidden"
                style={{ 
                  width: DISPLAY_OUTER_CANVAS_SIZE,
                  height: DISPLAY_OUTER_CANVAS_SIZE,
                  backgroundColor: bgColor === '#TRANSPARENT' ? '#FFFFFF' : bgColor
                }}
              >
                {/* 58MM Guide Circle - Shows final badge area */}
                <div 
                  className="absolute rounded-full z-20 pointer-events-none border-2 border-dashed border-red-500/40"
                  title="58mm badge area - Final visible area"
                  style={{
                    width: DISPLAY_CANVAS_SIZE,
                    height: DISPLAY_CANVAS_SIZE
                  }}
                ></div>
                
                {elements.length === 0 && activeTool === 'image' && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="
                        w-[70%] h-[70%]
                        border-2 border-dashed border-slate-300
                        rounded-full
                        flex flex-col items-center justify-center
                        gap-4
                        text-slate-400
                        cursor-pointer
                        hover:border-blue-400
                        hover:text-blue-500
                        transition-all
                        bg-white/40
                        backdrop-blur-sm
                      "
                    >
                      <Upload className="w-12 h-12" />
                      <p className="text-sm font-bold uppercase tracking-widest">
                        Upload Custom Art
                      </p>
                    </div>
                  </div>
                )}

                <div className="w-full h-full relative z-10" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out' }}>
                  {elements.sort((a,b) => a.zIndex - b.zIndex).map((el) => {
                    const isSelected = selectedId === el.id;
                    return (
                      <div 
                        key={el.id}
                        onMouseDown={(e) => handleMouseDown(e, 'drag', el.id)}
                        onTouchStart={(e) => handleTouchStart(e, 'drag', el.id)}
                        className={`absolute group cursor-move ${isSelected ? 'z-[999]' : ''}`}
                        style={{
                          left: el.x,
                          top: el.y,
                          width: el.width,
                          height: el.height,
                          transform: `rotate(${el.rotation}deg)`,
                          zIndex: el.zIndex
                        }}
                      >
                        {isSelected && (
                          <div className="absolute -inset-1 border-2 border-blue-400 pointer-events-none">
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer pointer-events-auto shadow-lg hover:bg-red-600 active:scale-90 transition-all z-[1001]" onMouseDown={(e) => { e.stopPropagation(); removeElement(el.id); }} onTouchStart={(e) => { e.stopPropagation(); removeElement(el.id); }}><X className="w-3.5 h-3.5" /></div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full border border-blue-400 flex items-center justify-center cursor-alias pointer-events-auto shadow-md" onMouseDown={(e) => handleMouseDown(e, 'rotate', el.id)} onTouchStart={(e) => handleTouchStart(e, 'rotate', el.id)}><RotateCw className="w-3.5 h-3.5 text-blue-400" /></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-400 rounded-sm cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'resize', el.id)} onTouchStart={(e) => handleTouchStart(e, 'resize', el.id)}></div>
                          </div>
                        )}
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          {el.type === 'text' ? (
                            <div className="font-black text-slate-900 text-center leading-tight whitespace-nowrap select-none" style={{ fontSize: `${el.height * 0.7}px` }}>{el.content}</div>
                          ) : (
                            <img src={el.content} className="w-full h-full object-cover pointer-events-none select-none" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
              </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-3 mt-4">
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} 
                className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-yellow-500 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-slate-700 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} 
                className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-yellow-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

            {/* RIGHT: Preview Circle - Only 58mm like real button badge */}
            <div className="flex flex-col items-center gap-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Final Preview</h3>
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-[40px] translate-y-8 scale-110"></div>
                {/* Outer container matching design canvas size for visual alignment */}
                <div 
                  className="rounded-full relative flex items-center justify-center"
                  style={{ 
                    width: DISPLAY_OUTER_CANVAS_SIZE,
                    height: DISPLAY_OUTER_CANVAS_SIZE
                  }}
                >
                  {/* 58mm clip mask - shows only the center 58mm of the 70mm design */}
                  <div 
                    className="rounded-full shadow-2xl overflow-hidden"
                    style={{ 
                      width: DISPLAY_CANVAS_SIZE,
                      height: DISPLAY_CANVAS_SIZE
                    }}
                  >
                    {/* 70mm inner container offset to show center 58mm */}
                    <div 
                      className="relative"
                      style={{ 
                        width: DISPLAY_OUTER_CANVAS_SIZE,
                        height: DISPLAY_OUTER_CANVAS_SIZE,
                        marginLeft: -((DISPLAY_OUTER_CANVAS_SIZE - DISPLAY_CANVAS_SIZE) / 2),
                        marginTop: -((DISPLAY_OUTER_CANVAS_SIZE - DISPLAY_CANVAS_SIZE) / 2),
                        backgroundColor: bgColor === '#TRANSPARENT' ? '#FFFFFF' : bgColor
                      }}
                    >
                      <div className="w-full h-full relative z-10" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out' }}>
                        {elements.sort((a,b) => a.zIndex - b.zIndex).map((el) => {
                          return (
                            <div 
                              key={el.id}
                              className="absolute"
                              style={{
                                left: el.x,
                                top: el.y,
                                width: el.width,
                                height: el.height,
                                transform: `rotate(${el.rotation}deg)`,
                                zIndex: el.zIndex
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                {el.type === 'text' ? (
                                  <div className="font-black text-slate-900 text-center leading-tight whitespace-nowrap select-none" style={{ fontSize: `${el.height * 0.7}px` }}>{el.content}</div>
                                ) : (
                                  <img src={el.content} className="w-full h-full object-cover pointer-events-none select-none" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Button badge glossy effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none z-20"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mt-2">
                ⭕ 58MM Final Badge
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Scroll with mouse wheel on canvas to zoom</p>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Toolbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around px-2 py-3">
          <button onClick={() => { setActiveTool('model'); setMobileSheetOpen(true); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'model' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <Box className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Model</span>
          </button>
          <button onClick={() => { setActiveTool('text'); setMobileSheetOpen(true); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'text' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <Type className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Text</span>
          </button>
          <button onClick={() => { setActiveTool('image'); setMobileSheetOpen(true); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'image' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <ImageIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Image</span>
          </button>
          <button onClick={() => { setActiveTool('qr'); setMobileSheetOpen(true); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'qr' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <QrCode className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">QR</span>
          </button>
          <button onClick={() => { setActiveTool('pattern'); setMobileSheetOpen(true); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'pattern' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <Palette className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Design</span>
          </button>
          <button onClick={() => { setActiveTool('layers'); setMobileSheetOpen(true); }} className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${activeTool === 'layers' ? 'bg-yellow-50 text-yellow-600' : 'text-slate-600'}`}>
            <Layers className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Layers</span>
            {elements.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">{elements.length}</span>}
          </button>
        </div>
      </div>

      {/* Mobile Control Panel - Slide Up Sheet */}
      <div className={`md:hidden fixed bottom-20 left-0 right-0 bg-white border-t-2 border-slate-200 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] max-h-[50vh] overflow-y-auto rounded-t-3xl transition-all duration-300 ${mobileSheetOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <span className="text-sm font-bold text-slate-900 uppercase">{activeTool}</span>
            <button 
              onClick={() => setMobileSheetOpen(false)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          {activeTool === 'model' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 border-2 border-red-300 px-3 py-3 text-center">
                <div className="text-xl font-black text-red-600">⭕ 58 MM</div>
                <div className="text-[8px] font-bold text-red-600 uppercase mt-1">Fixed Badge Size</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-900">Fastener:</label>
                <select value={fastener} onChange={(e) => setFastener(e.target.value)} className="w-full mt-1 h-10 px-3 bg-white border border-slate-900 rounded-xl text-sm font-semibold">
                  {fasteners.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-900">Quantity:</label>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-slate-100 font-black text-lg">-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-slate-100 font-black text-lg">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-bold text-slate-600 uppercase">Total Price:</span>
                <span className="text-lg font-black text-slate-900">{formatPrice(BASE_PRICE * quantity)}</span>
              </div>
              <button onClick={handleAddToCart} disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          )}
          {activeTool === 'text' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Enter text..." className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <button onClick={addText} className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold text-sm">Add</button>
              </div>
            </div>
          )}
          {activeTool === 'image' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-sm flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Upload Image
              </button>
            </div>
          )}
          {activeTool === 'qr' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="Enter URL..." className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <button onClick={addQRCode} className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold text-sm">Add QR</button>
              </div>
            </div>
          )}
          {activeTool === 'pattern' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-900">Background Color:</label>
              <div className="grid grid-cols-6 gap-2">
                {backgroundPresets.slice(0, 12).map(color => (
                  <button key={color} onClick={() => setBgColor(color)} className={`w-full aspect-square rounded-lg border-2 ${bgColor === color ? 'border-blue-500' : 'border-slate-200'}`} style={{ backgroundColor: color === '#TRANSPARENT' ? '#fff' : color }}></button>
                ))}
              </div>
            </div>
          )}
          {activeTool === 'layers' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-900">Manage Layers</p>
              {elements.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No layers added</p>
              ) : (
                <div className="space-y-2">
                  {elements.sort((a,b) => b.zIndex - a.zIndex).map((el) => (
                    <div key={el.id} onClick={() => setSelectedId(el.id)} className={`flex items-center justify-between p-2 rounded-lg border-2 ${selectedId === el.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                      <span className="text-sm font-semibold truncate">{el.type === 'text' ? el.content : el.type.toUpperCase()}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}