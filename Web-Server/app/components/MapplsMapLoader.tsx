'use client';

import { useEffect } from 'react';

// Declare the mappls property on the Window interface
declare global {
  interface Window {
    mappls: any; // You can replace 'any' with a more specific type if known
  }
}

interface MapplsMapLoaderProps {
  apiKey: string;
  onLoad?: () => void;
}

const MapplsMapLoader: React.FC<MapplsMapLoaderProps> = ({ apiKey, onLoad }) => {
  useEffect(() => {
    // The script is already loaded via layout.tsx
    // Just trigger the onLoad callback
    if (typeof window !== 'undefined' && window.mappls && onLoad) {
      onLoad();
    } else {
      // If mappls is not available yet, wait for it
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.mappls) {
          clearInterval(checkInterval);
          if (onLoad) onLoad();
        }
      }, 100);

      // Cleanup the interval
      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [apiKey, onLoad]);

  return null;
};

export default MapplsMapLoader;
