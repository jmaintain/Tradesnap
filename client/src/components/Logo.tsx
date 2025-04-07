import React from 'react';

export const Logo: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const sizeClass = sizeMap[size];

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Main circular background */}
        <circle cx="50" cy="50" r="45" fill="url(#gradient)" />
        
        {/* Camera shutter/aperture design */}
        <path d="M50 15 A35 35 0 0 1 85 50 L50 50 Z" fill="rgba(255,255,255,0.3)" />
        <path d="M85 50 A35 35 0 0 1 50 85 L50 50 Z" fill="rgba(255,255,255,0.2)" />
        <path d="M50 85 A35 35 0 0 1 15 50 L50 50 Z" fill="rgba(255,255,255,0.1)" />
        
        {/* Trading chart line */}
        <path 
          d="M25 65 L35 55 L45 65 L55 40 L65 50 L75 35" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Middle white dot */}
        <circle cx="50" cy="50" r="4" fill="white" />
        
        {/* Linear gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;