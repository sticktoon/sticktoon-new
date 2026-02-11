import React, { useEffect, useState } from 'react';
import { useCircularCropper } from '../utils/circularImageCropper';

interface CircularCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

const CircularCropperModal: React.FC<CircularCropperModalProps> = ({
  isOpen,
  imageUrl,
  onCropComplete,
  onCancel,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

  const {
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
  } = useCircularCropper({
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    initialRadius: 200,
    minRadius: 50,
    maxRadius: 300,
  });

  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsLoading(true);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        drawCanvas(img);
        setIsLoading(false);
      };
      img.onerror = () => {
        console.error('Failed to load image');
        setIsLoading(false);
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl, drawCanvas]);

  const handleApplyCrop = () => {
    const croppedUrl = getCroppedImage();
    if (croppedUrl) {
      onCropComplete(croppedUrl);
    }
  };

  const handleReset = () => {
    resetCrop();
    if (image) {
      drawCanvas(image);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Crop Image to Circular Shape</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          <p>• Drag the circle to reposition the crop area</p>
          <p>• Drag the green handle on the right to resize the circle</p>
          <p>• Use the slider below to precisely adjust the size</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: CANVAS_HEIGHT }}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading image...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="border-2 border-gray-300 rounded shadow-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />

            <div className="mt-6 w-full max-w-md">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Circle Size:
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  value={state.circleRadius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((state.circleRadius - 50) / 250) * 100}%, #e5e7eb ${((state.circleRadius - 50) / 250) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <span className="text-sm font-medium text-gray-700 w-12">
                  {state.circleRadius}px
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 gap-4">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Apply Crop
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> The cropped image will have a transparent background outside the circle, perfect for circular badges!
          </p>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default CircularCropperModal;
