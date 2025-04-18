'use client';

import { useEffect } from 'react';

interface MapmyIndiaLoaderProps {
  onLoad?: () => void;
  apiKey?: string;
}

export default function MapmyIndiaLoader({ onLoad }: MapmyIndiaLoaderProps) {
  useEffect(() => {
    // Check if MapmyIndia is loaded
    const checkMapLoaded = () => {
      if (typeof window !== 'undefined' && window.mappls) {
        console.log('MapmyIndia SDK loaded');
        if (onLoad) onLoad();
        return true;
      }
      return false;
    };

    // If not immediately loaded, set up an interval to check
    if (!checkMapLoaded()) {
      const interval = setInterval(() => {
        if (checkMapLoaded()) {
          clearInterval(interval);
        }
      }, 200);

      // Clean up interval
      return () => clearInterval(interval);
    }
  }, [onLoad]);

  return null;
}
