import React, { useState, useEffect, useRef } from 'react';
import Logo from './Logo';

interface VideoWithPlaceholderProps {
  src: string;
  type: string;
  className?: string;
}

/**
 * A video component that shows a placeholder until the video is loaded
 */
export const VideoWithPlaceholder: React.FC<VideoWithPlaceholderProps> = ({ 
  src, 
  type,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleCanPlay = () => {
      setIsLoaded(true);
    };

    const handleError = () => {
      setHasError(true);
      console.error('Video failed to load:', src);
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <div className="relative w-full h-full">
      <video 
        ref={videoRef}
        className={`w-full h-full object-cover rounded-lg ${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ transition: 'opacity 0.5s ease-in-out' }}
        autoPlay 
        loop 
        muted 
        playsInline
        controls={false}
      >
        <source src={src} type={type} />
        Your browser doesn't support this video format.
      </video>
      
      {/* Placeholder shown while video loads or if there's an error */}
      {(!isLoaded || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 opacity-70">
          <Logo size="xl" />
        </div>
      )}
      
      {/* Logo branding overlay */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 rounded-full p-2 shadow-md z-10">
        <Logo size="sm" />
      </div>
    </div>
  );
};

export default VideoWithPlaceholder;