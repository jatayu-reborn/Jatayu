'use client';

import { useEffect } from 'react';

export default function GalliScript() {
  useEffect(() => {
    const loadGalliScript = () => {
      if (document.querySelector('#galli-maps')) return;

      const script = document.createElement('script');
      script.id = 'galli-maps';
      script.src = 'https://maps.galli.com/gallimaps.vector.min.latest.js';
      script.async = true;
      script.onload = () => window.dispatchEvent(new Event('galliLoaded'));
      document.head.appendChild(script);
    };

    loadGalliScript();
  }, []);

  return null;
}
