import React, { useEffect, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  imageSrc: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageSrc, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Function to close viewer and prevent event propagation
  const handleClose = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  };

  // Add keyboard event listener to close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(e as unknown as React.KeyboardEvent);
      } else if (e.key === '+' || e.key === '=') {
        // Zoom in on + key
        handleZoomIn(null);
      } else if (e.key === '-') {
        // Zoom out on - key
        handleZoomOut(null);
      } else if (e.key === 'r') {
        // Reset on r key
        resetZoom(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Disable scrolling on body when viewer is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // Click handler to close when clicking on the background
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      handleClose(e);
    }
  };

  const handleZoomIn = (e: React.MouseEvent | null) => {
    if (e) {
      e.stopPropagation();
    }
    setScale(prevScale => Math.min(prevScale + 0.5, 5)); // Maximum zoom: 5x
  };

  const handleZoomOut = (e: React.MouseEvent | null) => {
    if (e) {
      e.stopPropagation();
    }
    setScale(prevScale => Math.max(prevScale - 0.5, 0.5)); // Minimum zoom: 0.5x
  };

  const resetZoom = (e: React.MouseEvent | null) => {
    if (e) {
      e.stopPropagation();
    }
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.stopPropagation();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent | null) => {
    if (e) {
      e.stopPropagation();
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleZoomIn(null);
    } else {
      handleZoomOut(null);
    }
  };

  // Use createPortal to render the viewer directly to the document body
  // This ensures it's outside of any other modal's DOM hierarchy
  return createPortal(
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" 
      onClick={handleBackgroundClick}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="relative max-w-full max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Control buttons - using absolute positioning with higher z-index */}
        <div className="absolute top-4 right-4 flex space-x-2 z-[10000]">
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn(e);
            }}
            title="Zoom In (+ key)"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut(e);
            }}
            title="Zoom Out (- key)"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button 
            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom(e);
            }}
            title="Reset View (R key)"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button 
            className="bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleClose(e);
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
          onMouseLeave={handleMouseUp}
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
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        {/* Zoom indicator */}
        <div 
          className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageViewer;