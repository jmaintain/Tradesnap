import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as React from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  imageSrc: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageSrc, onClose }) => {
  // Create a handler that stops propagation
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onClose();
  };

  // Handle escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Use a portal to render this outside the normal DOM hierarchy
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={handleClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-h-[90vh] max-w-[90vw] overflow-auto" 
        onClick={handleContentClick}
      >
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 rounded-full z-10"
          onClick={handleClose}
        >
          <X className="h-6 w-6 text-white" />
        </Button>
        <img 
          src={imageSrc} 
          alt="Enlarged screenshot" 
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>
    </div>,
    document.body
  );
};

export default ImageViewer;