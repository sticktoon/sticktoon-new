import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateBadgeMockup } from '../geminiService.ts';
import { 
  Upload, Wand2, Loader2, ShoppingCart, Download, RotateCcw, RotateCw,
  Plus, Minus, X, Info, CheckCircle2, Sparkles, Eye, Palette, Settings2, ZoomIn, Trash2
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

// Mockup composition, in fractions of the stage box. Both the on-screen layout and
// the downloaded PNG read these, so the download always matches what is shown.
// The back badge uses rotate+scaleX rather than CSS perspective() precisely so a
// 2D canvas can reproduce it exactly.
const STAGE = {
  ratio: 0.88,        // stage height / width
  backW: 0.60,
  backTilt: -7,       // degrees
  backSquash: 0.88,   // stands in for rotateY
  frontW: 0.76,
  frontBottom: 0.03,
};

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
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const INNER_PX = (BADGE_MM / OUTER_BADGE_MM) * CANVAS_PX;
  const BASE_PRICE = 69;

  // Source pixels landing on each printed inch of the 58mm face. Zooming in spends
  // resolution, so this drops live as the customer scales up.
  const effectiveDpi = imageState
    ? Math.round((INNER_PX / imageState.scale) / (BADGE_MM / MM_TO_INCH))
    : 0;

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

  // Both badge faces paint into any square context at any size, so the on-screen
  // preview and the exported mockup render natively instead of one upscaling the
  // other. `k` rescales the handful of genuinely fixed widths (strokes, the pin)
  // that would otherwise turn into hairlines at export size.
  const paintFront = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const k = size / 300;
    const r = size / 2;
    const c = r;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
    ctx.fillRect(0, 0, size, size);

    if (imageState) {
      const facePaperR = INNER_PX / 2;
      const s = r / facePaperR;

      ctx.save();
      ctx.translate(c, c);
      ctx.scale(s, s);
      ctx.translate(imageState.x, imageState.y);
      ctx.rotate((imageState.rotation * Math.PI) / 180);
      ctx.scale(imageState.scale, imageState.scale);
      ctx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
      ctx.restore();
    }

    // dome falls away from the light toward the rim
    const rim = ctx.createRadialGradient(c, c, r * 0.7, c, c, r);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(0.8, 'rgba(0,0,0,0.12)');
    rim.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, size, size);

    // broad soft sheen across the top of the dome
    const sheen = ctx.createLinearGradient(0, 0, 0, size);
    sheen.addColorStop(0, 'rgba(255,255,255,0.15)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0.03)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);

    // subtle specular hotspot for natural 3D gloss without washing out colors
    ctx.save();
    ctx.translate(c - r * 0.30, c - r * 0.40);
    ctx.rotate(-0.5);
    ctx.scale(1, 0.55);
    const hot = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
    hot.addColorStop(0, 'rgba(255,255,255,0.25)');
    hot.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    hot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hot;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // light bouncing back up off the lower rim
    const bounce = ctx.createRadialGradient(
      c + r * 0.12, c + r * 0.80, r * 0.02,
      c + r * 0.12, c + r * 0.80, r * 0.50
    );
    bounce.addColorStop(0, 'rgba(255,255,255,0.30)');
    bounce.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bounce;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // glossy crimped edge: catches light top-left, falls dark bottom-right
    const edge = ctx.createLinearGradient(0, 0, size, size);
    edge.addColorStop(0, 'rgba(255,255,255,0.85)');
    edge.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    edge.addColorStop(1, 'rgba(0,0,0,0.40)');
    ctx.beginPath();
    ctx.arc(c, c, r - 1.5 * k, 0, Math.PI * 2);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3 * k;
    ctx.stroke();
  }, [imageState, bgColor, INNER_PX]);

  const paintBack = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const k = size / 300;
    const r = size / 2;
    const c = r;
    const plateR = r * 0.86;
    ctx.clearRect(0, 0, size, size);

    // The 58-70mm bleed folds over the rim, so from the back it reads inside-out:
    // the 58mm fold line sits at the outer edge and the 70mm cut tucks inward.
    // Also mirrored — same paper, other side. Drawn as thin bands because that
    // radial flip is not a plain scale.
    // ponytail: 20 bands is smooth up to export size; raise it if the ring bands.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    if (imageState) {
      const BANDS = 20;
      const paperFold = INNER_PX / 2;   // 58mm, lands on the back's outer edge
      const paperCut = CANVAS_PX / 2;   // 70mm, tucked innermost
      for (let i = 0; i < BANDS; i++) {
        const t0 = i / BANDS;
        const t1 = (i + 1) / BANDS;
        const bandOuter = r - t0 * (r - plateR);
        const bandInner = r - t1 * (r - plateR);
        const paperR = paperFold + ((t0 + t1) / 2) * (paperCut - paperFold);
        const s = ((bandInner + bandOuter) / 2) / paperR;

        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, bandOuter + 0.5 * k, 0, Math.PI * 2);
        ctx.arc(c, c, Math.max(bandInner - 0.5 * k, 0), 0, Math.PI * 2, true);
        ctx.clip();
        ctx.translate(c, c);
        ctx.scale(-s, s);
        ctx.translate(imageState.x, imageState.y);
        ctx.rotate((imageState.rotation * Math.PI) / 180);
        ctx.scale(imageState.scale, imageState.scale);
        ctx.drawImage(imageState.img, -imageState.img.width / 2, -imageState.img.height / 2);
        ctx.restore();
      }
    }

    // crease where the paper tucks under the crimped rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.clip();
    // darkest where it disappears under the shell, lit at the folded-over crest
    const tuck = ctx.createRadialGradient(c, c, plateR, c, c, r);
    tuck.addColorStop(0, 'rgba(0,0,0,0.50)');
    tuck.addColorStop(0.5, 'rgba(0,0,0,0.14)');
    tuck.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tuck;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(c, c, r - 1 * k, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 2 * k;
    ctx.stroke();

    // metal back shell
    const plate = ctx.createLinearGradient(c - plateR, c - plateR, c + plateR, c + plateR);
    plate.addColorStop(0, '#f8fafc');
    plate.addColorStop(0.3, '#cbd5e1');
    plate.addColorStop(0.62, '#8fa0b4');
    plate.addColorStop(1, '#e2e8f0');
    ctx.beginPath();
    ctx.arc(c, c, plateR, 0, Math.PI * 2);
    ctx.fillStyle = plate;
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.28)';
    ctx.lineWidth = 1.5 * k;
    ctx.stroke();

    if (fastener === 'Pin-Badge') {
      const pinY = c + plateR * 0.05;
      ctx.strokeStyle = 'rgba(15,23,42,0.30)';
      ctx.lineWidth = 5 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c - plateR * 0.52, pinY + 3 * k);
      ctx.lineTo(c + plateR * 0.62, pinY + 3 * k);
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5 * k;
      ctx.beginPath();
      ctx.moveTo(c - plateR * 0.52, pinY);
      ctx.lineTo(c + plateR * 0.62, pinY);
      ctx.stroke();

      // hinge barrel + clasp
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(c - plateR * 0.58, pinY, plateR * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.35)';
      ctx.lineWidth = 1 * k;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(c + plateR * 0.52, pinY - plateR * 0.15, plateR * 0.2, plateR * 0.3);
      ctx.strokeRect(c + plateR * 0.52, pinY - plateR * 0.15, plateR * 0.2, plateR * 0.3);
    } else {
      const magR = plateR * 0.6;
      const mag = ctx.createRadialGradient(
        c - magR * 0.35, c - magR * 0.35, magR * 0.05, c, c, magR
      );
      mag.addColorStop(0, '#64748b');
      mag.addColorStop(1, '#1e293b');
      ctx.beginPath();
      ctx.arc(c, c, magR, 0, Math.PI * 2);
      ctx.fillStyle = mag;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 1 * k;
      ctx.stroke();
    }
  }, [imageState, bgColor, fastener, INNER_PX, CANVAS_PX]);

  const paintTo = useCallback((paint: (c: CanvasRenderingContext2D, s: number) => void, size: number) => {
    const el = document.createElement('canvas');
    el.width = size;
    el.height = size;
    const ctx = el.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    paint(ctx, size);
    return el;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewCanvasRef.current;
    const back = backCanvasRef.current;
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

    const paintOnto = (target: HTMLCanvasElement, paint: (c: CanvasRenderingContext2D, s: number) => void) => {
      const dprSize = Math.round(300 * Math.max(window.devicePixelRatio || 1, 2));
      if (target.width !== dprSize || target.height !== dprSize) {
        target.width = dprSize;
        target.height = dprSize;
      }
      const c2d = target.getContext("2d")!;
      c2d.imageSmoothingEnabled = true;
      c2d.imageSmoothingQuality = "high";
      paint(c2d, dprSize);
    };

    if (preview) paintOnto(preview, paintFront);
    if (back) paintOnto(back, paintBack);
  }, [imageState, bgColor, paintFront, paintBack, CANVAS_PX, BADGE_MM, OUTER_BADGE_MM]);


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

  const getFullCircleBlob = (targetSize?: number, includeBorder: boolean = true): Promise<string> => {
    return new Promise((resolve) => {
      // Calculate high-resolution export size if targetSize is not specified.
      // Uses max of source image natural resolution (or min 2400px) so image quality remains HD/lossless.
      const EXPORT_OUTER = targetSize || Math.max(
        OUTER_CANVAS_SIZE,
        imageState ? Math.round((imageState.img.naturalWidth || 1000) * (OUTER_BADGE_MM / BADGE_MM)) : OUTER_CANVAS_SIZE,
        2400
      );
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_OUTER;
      offCanvas.height = EXPORT_OUTER;
      const ctx = offCanvas.getContext("2d")!;

      // High-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const cx = EXPORT_OUTER / 2;
      const scale = EXPORT_OUTER / CANVAS_PX;

      ctx.save();
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
      ctx.restore();

      // Draw sharp outer border outline if requested
      if (includeBorder) {
        ctx.save();
        ctx.beginPath();
        const strokeWidth = Math.max(3, Math.round(EXPORT_OUTER * 0.004));
        ctx.arc(cx, cx, EXPORT_OUTER / 2 - strokeWidth / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        ctx.restore();
      }

      resolve(offCanvas.toDataURL("image/png"));
    });
  };

  const getInnerCircleBlob = (targetSize?: number, includeBorder: boolean = true): Promise<string> => {
    return new Promise((resolve) => {
      const baseSize = targetSize || Math.max(
        CANVAS_SIZE,
        imageState ? Math.round(imageState.img.naturalWidth || 1000) : CANVAS_SIZE,
        2000
      );
      const EXPORT_SIZE = baseSize;
      const offCanvas = document.createElement("canvas");
      offCanvas.width = EXPORT_SIZE;
      offCanvas.height = EXPORT_SIZE;
      const ctx = offCanvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const cx = EXPORT_SIZE / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cx, EXPORT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = bgColor === '#TRANSPARENT' ? '#ffffff' : bgColor;
      ctx.fill();

      if (imageState) {
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
      ctx.restore();

      // Draw sharp outer border outline for inner circle if requested
      if (includeBorder) {
        ctx.save();
        ctx.beginPath();
        const strokeWidth = Math.max(3, Math.round(EXPORT_SIZE * 0.004));
        ctx.arc(cx, cx, EXPORT_SIZE / 2 - strokeWidth / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
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
        body: JSON.stringify({ image: innerDataUrl, printImage: outerDataUrl, name: `Custom ${fastener}`, quantity, sourceDpi: effectiveDpi }),
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

  // Replays the on-screen stage into one PNG, reading the same STAGE numbers the
  // layout uses. Each badge is repainted at its final export size rather than
  // scaled up from the 300px preview canvas, which is what made this soft before.
  const getMockupBlob = (): Promise<string> => {
    return new Promise((resolve) => {
      const SW = 2000;
      const front = paintTo(paintFront, Math.round(SW * STAGE.frontW));
      const back = paintTo(paintBack, Math.round(SW * STAGE.backW));
      const SH = Math.round(SW * STAGE.ratio);
      const out = document.createElement('canvas');
      out.width = SW;
      out.height = SH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.save();
      ctx.shadowColor = 'rgba(15,23,42,0.30)';
      ctx.shadowBlur = SW * 0.03;
      ctx.shadowOffsetY = SW * 0.02;
      ctx.translate(back.width / 2, back.width / 2);
      ctx.rotate((STAGE.backTilt * Math.PI) / 180);
      ctx.scale(STAGE.backSquash, 1);
      ctx.drawImage(back, -back.width / 2, -back.width / 2);
      ctx.restore();

      // contact shadow — a squashed radial, so no dependency on ctx.filter
      ctx.save();
      ctx.translate(SW * 0.625, SH * 0.965);
      ctx.scale(1, 0.13);
      const ground = ctx.createRadialGradient(0, 0, 0, 0, 0, SW * 0.36);
      ground.addColorStop(0, 'rgba(15,23,42,0.35)');
      ground.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.arc(0, 0, SW * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(15,23,42,0.38)';
      ctx.shadowBlur = SW * 0.045;
      ctx.shadowOffsetY = SW * 0.035;
      ctx.drawImage(front, SW - front.width, SH - SH * STAGE.frontBottom - front.width);
      ctx.restore();

      resolve(out.toDataURL('image/png'));
    });
  };

  const saveDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDownloadPreview = async () => {
    if (!imageState) {
      setErrorMessage('Please upload or generate an image first');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    saveDataUrl(await getMockupBlob(), `badge-mockup-${BADGE_MM}mm-${Date.now()}.png`);
  };

  const handleDownloadTemplate = async () => {
    if (!imageState) {
      setErrorMessage('Please upload or generate an image first');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const templateDataUrl = await getFullCircleBlob(undefined, true);
    saveDataUrl(templateDataUrl, `badge-${OUTER_BADGE_MM}mm-template-hd-${Date.now()}.png`);
  };

  const handleDownloadInnerTemplate = async () => {
    if (!imageState) {
      setErrorMessage('Please upload or generate an image first');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const innerDataUrl = await getInnerCircleBlob(undefined, true);
    saveDataUrl(innerDataUrl, `badge-${BADGE_MM}mm-inner-template-hd-${Date.now()}.png`);
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
      <header className="relative z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-8 shadow-sm">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between flex-wrap gap-3">
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

      <main className="relative z-10 mx-auto max-w-[1920px] px-4 py-4 pb-20 sm:px-6 sm:py-5 lg:px-8 lg:pb-5 lg:h-[calc(100vh-73px)] lg:overflow-hidden">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start lg:h-full">
          {/* ===== LEFT PANEL: Config + Controls ===== */}
          <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0 lg:h-full lg:overflow-y-auto pr-1">
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
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Image loaded
                    </p>
                    <button
                      onClick={() => {
                        setImageState(null);
                        setZoom(1);
                        setRotation(0);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
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
          <div className="flex-1 min-w-0 flex flex-col gap-3 lg:h-full min-h-0">
            {/* Canvas Area */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 flex-1 flex flex-col shadow-sm justify-center items-center overflow-hidden min-h-0"
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
              <div className="w-full mb-2 flex items-center justify-between flex-shrink-0">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-yellow-600" />
                  {OUTER_BADGE_MM}mm Canvas
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drag • Scroll to zoom</p>
              </div>
              <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden p-1">
                <div className="relative aspect-square w-full h-full max-w-[560px] max-h-[560px] flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full aspect-square rounded-xl cursor-grab active:cursor-grabbing shadow-lg ring-1 ring-slate-200 object-contain"
                    style={{ touchAction: "none" }}
                    onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                  />
                </div>
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
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:h-full lg:overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-2">
                <Eye className="w-3.5 h-3.5 text-yellow-600" /> Final Preview
              </h3>
              {/* Product shot: back badge angled behind, domed front badge in front */}
              <div className="rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-200/80 border border-slate-200 px-3 pt-4 pb-4">
                <div className="relative mx-auto w-full max-w-[250px]" style={{ aspectRatio: `1 / ${STAGE.ratio}` }}>
                  <div
                    className="absolute top-0"
                    style={{
                      left: 0,
                      width: `${STAGE.backW * 100}%`,
                      transform: `rotate(${STAGE.backTilt}deg) scaleX(${STAGE.backSquash})`,
                    }}
                  >
                    <canvas ref={backCanvasRef} width={300} height={300}
                      className="block w-full h-auto rounded-full drop-shadow-[0_8px_12px_rgba(15,23,42,0.30)]"
                      style={{ aspectRatio: '1 / 1' }} />
                  </div>

                  {/* contact shadow on the surface */}
                  <div className="absolute left-[24%] right-[1%] bottom-[1%] h-4 rounded-[50%] bg-slate-900/25 blur-md" />

                  <div
                    className="absolute right-0"
                    style={{ bottom: `${STAGE.frontBottom * 100}%`, width: `${STAGE.frontW * 100}%` }}
                  >
                    <canvas ref={previewCanvasRef} width={300} height={300}
                      className="block w-full h-auto rounded-full drop-shadow-[0_14px_18px_rgba(15,23,42,0.38)]"
                      style={{ aspectRatio: '1 / 1' }} />
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Actual {BADGE_MM}mm {fastener} — front &amp; back
                </p>
              </div>

              {imageState && (
                <div className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold text-center ${
                  effectiveDpi >= 300 ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : effectiveDpi >= 150 ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {effectiveDpi} DPI —{' '}
                  {effectiveDpi >= 300 ? 'sharp at print size'
                    : effectiveDpi >= 150 ? 'usable, slightly soft'
                    : 'too low, use a bigger image or zoom out'}
                </div>
              )}

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
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={handleDownloadPreview}
                      className="h-7 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-all">
                      <Download className="w-2.5 h-2.5" /> Mockup
                    </button>
                    <button onClick={handleDownloadTemplate}
                      className="h-7 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-100 transition-all">
                      <Download className="w-2.5 h-2.5" /> Template
                    </button>
                    <button onClick={handleDownloadInnerTemplate}
                      className="h-7 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-purple-100 transition-all">
                      <Download className="w-2.5 h-2.5" /> Inner
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
