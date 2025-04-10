import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface ImageViewerProps {
  imageSrc: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageSrc, onClose }) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Add keyboard event listener to close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        // Zoom in on + key
        handleZoomIn();
      } else if (e.key === '-') {
        // Zoom out on - key
        handleZoomOut();
      } else if (e.key === 'r') {
        // Reset on r key
        resetZoom();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.5, 5)); // Maximum zoom: 5x
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.5, 0.5)); // Minimum zoom: 0.5x
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative max-w-full max-h-full p-4">
        {/* Control buttons */}
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            title="Zoom In (+ key)"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            title="Zoom Out (- key)"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            title="Reset View (R key)"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close (ESC key)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Image container with transform */}
        <div 
          className="overflow-hidden cursor-move" 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={imageSrc} 
            alt="Full-size view" 
            className="max-w-full max-h-[90vh] object-contain rounded-md transition-transform duration-100 ease-out"
            style={{ 
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center',
              cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default')
            }}
          />
        </div>
        
        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;