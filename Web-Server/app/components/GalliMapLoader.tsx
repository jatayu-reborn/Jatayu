'use client';

import { useEffect, useRef } from 'react';

interface GalliMapLoaderProps {
  apiKey: string;
  onLoad?: () => void;
}

export default function GalliMapLoader({ apiKey, onLoad }: GalliMapLoaderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    const initGalli = () => {
      if (!window.Galli || initialized.current) return;
      initialized.current = true;

      try {
        window.Galli.initialize(apiKey)
          .then(() => onLoad?.())
          .catch(console.error);
      } catch (error) {
        console.error('Failed to initialize Galli Maps:', error);
      }
    };

    // Try to init if Galli is already loaded
    if (window.Galli) {
      initGalli();
    }

    // Listen for Galli load event
    window.addEventListener('galliLoaded', initGalli);
    return () => window.removeEventListener('galliLoaded', initGalli);
  }, [apiKey, onLoad]);

  return null;
}
