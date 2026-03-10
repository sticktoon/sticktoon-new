import { useRef, useState, useEffect, useCallback } from 'react';

interface CircularCropperState {
  circleX: number;
  circleY: number;
  circleRadius: number;
  isDragging: boolean;
  isResizing: boolean;
}

interface UseCircularCropperOptions {
  canvasWidth: number;
  canvasHeight: number;
  initialRadius?: number;
  minRadius?: number;
  maxRadius?: number;
}

interface UseCircularCropperReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  state: CircularCropperState;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  drawCanvas: (image: HTMLImageElement) => void;
  getCroppedImage: () => string | null;
  resetCrop: () => void;
  setRadius: (radius: number) => void;
}

export const useCircularCropper = (
  options: UseCircularCropperOptions
): UseCircularCropperReturn => {
  const { canvasWidth, canvasHeight, initialRadius = 150, minRadius = 50, maxRadius = 300 } = options;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<CircularCropperState>({
    circleX: canvasWidth / 2,
    circleY: canvasHeight / 2,
    circleRadius: Math.min(initialRadius, Math.min(canvasWidth, canvasHeight) / 2 - 10),
    isDragging: false,
    isResizing: false,
  });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const drawCanvas = useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    imageRef.current = image;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw image (scaled to fit)
    const scale = Math.max(canvasWidth / image.width, canvasHeight / image.height);
    const x = (canvasWidth - image.width * scale) / 2;
    const y = (canvasHeight - image.height * scale) / 2;
    ctx.drawImage(image, x, y, image.width * scale, image.height * scale);

    // Save the image data before overlay
    ctx.save();

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clear circular area (shows original image)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(state.circleX, state.circleY, state.circleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circular border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.circleX, state.circleY, state.circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw resize handle (small circle at edge)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(
      state.circleX + state.circleRadius,
      state.circleY,
      8,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [canvasWidth, canvasHeight, state.circleX, state.circleY, state.circleRadius]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicking on resize handle
    const handleDist = Math.sqrt(
      Math.pow(mouseX - (state.circleX + state.circleRadius), 2) +
      Math.pow(mouseY - state.circleY, 2)
    );

    if (handleDist <= 12) {
      setState(prev => ({ ...prev, isResizing: true }));
      return;
    }

    // Check if clicking inside circle
    const dist = Math.sqrt(
      Math.pow(mouseX - state.circleX, 2) +
      Math.pow(mouseY - state.circleY, 2)
    );

    if (dist <= state.circleRadius) {
      setState(prev => ({ ...prev, isDragging: true }));
      dragStartRef.current = {
        x: mouseX - state.circleX,
        y: mouseY - state.circleY,
      };
    }
  }, [state.circleX, state.circleY, state.circleRadius]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (state.isResizing) {
      // Calculate new radius based on distance from center
      const newRadius = Math.sqrt(
        Math.pow(mouseX - state.circleX, 2) +
        Math.pow(mouseY - state.circleY, 2)
      );

      // Clamp radius to valid range
      const clampedRadius = Math.max(
        minRadius,
        Math.min(maxRadius, newRadius, Math.min(canvasWidth, canvasHeight) / 2 - 10)
      );

      setState(prev => ({ ...prev, circleRadius: clampedRadius }));
    } else if (state.isDragging) {
      let newX = mouseX - dragStartRef.current.x;
      let newY = mouseY - dragStartRef.current.y;

      // Keep circle within bounds
      newX = Math.max(state.circleRadius, Math.min(canvasWidth - state.circleRadius, newX));
      newY = Math.max(state.circleRadius, Math.min(canvasHeight - state.circleRadius, newY));

      setState(prev => ({ ...prev, circleX: newX, circleY: newY }));
    } else {
      // Update cursor style based on position
      const handleDist = Math.sqrt(
        Math.pow(mouseX - (state.circleX + state.circleRadius), 2) +
        Math.pow(mouseY - state.circleY, 2)
      );
      const dist = Math.sqrt(
        Math.pow(mouseX - state.circleX, 2) +
        Math.pow(mouseY - state.circleY, 2)
      );

      if (handleDist <= 12) {
        canvas.style.cursor = 'nwse-resize';
      } else if (dist <= state.circleRadius) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }, [state.isResizing, state.isDragging, state.circleX, state.circleY, state.circleRadius, canvasWidth, canvasHeight, minRadius, maxRadius]);

  const handleMouseUp = useCallback(() => {
    setState(prev => ({ ...prev, isDragging: false, isResizing: false }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setState(prev => ({ ...prev, isDragging: false, isResizing: false }));
  }, []);

  const getCroppedImage = useCallback((): string | null => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return null;

    // Create a new canvas for the cropped result
    const resultCanvas = document.createElement('canvas');
    const size = state.circleRadius * 2;
    resultCanvas.width = size;
    resultCanvas.height = size;
    const resultCtx = resultCanvas.getContext('2d');
    if (!resultCtx) return null;

    // Calculate scale and position of original image
    const scale = Math.max(canvasWidth / image.width, canvasHeight / image.height);
    const imgX = (canvasWidth - image.width * scale) / 2;
    const imgY = (canvasHeight - image.height * scale) / 2;

    // Create circular clip
    resultCtx.beginPath();
    resultCtx.arc(state.circleRadius, state.circleRadius, state.circleRadius, 0, Math.PI * 2);
    resultCtx.closePath();
    resultCtx.clip();

    // Draw the selected portion of the original image
    resultCtx.drawImage(
      image,
      (state.circleX - state.circleRadius - imgX) / scale,
      (state.circleY - state.circleRadius - imgY) / scale,
      size / scale,
      size / scale,
      0,
      0,
      size,
      size
    );

    return resultCanvas.toDataURL('image/png');
  }, [canvasWidth, canvasHeight, state.circleX, state.circleY, state.circleRadius]);

  const resetCrop = useCallback(() => {
    setState({
      circleX: canvasWidth / 2,
      circleY: canvasHeight / 2,
      circleRadius: Math.min(initialRadius, Math.min(canvasWidth, canvasHeight) / 2 - 10),
      isDragging: false,
      isResizing: false,
    });
  }, [canvasWidth, canvasHeight, initialRadius]);

  const setRadius = useCallback((radius: number) => {
    const clampedRadius = Math.max(
      minRadius,
      Math.min(maxRadius, radius, Math.min(canvasWidth, canvasHeight) / 2 - 10)
    );
    setState(prev => ({ ...prev, circleRadius: clampedRadius }));
  }, [minRadius, maxRadius, canvasWidth, canvasHeight]);

  // Redraw canvas when state changes
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas(imageRef.current);
    }
  }, [state, drawCanvas]);

  return {
    canvasRef,
    state,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    drawCanvas,
    getCroppedImage,
    resetCrop,
    setRadius,
  };
};
