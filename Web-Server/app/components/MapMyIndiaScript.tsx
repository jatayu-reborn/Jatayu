'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface MapMyIndiaScriptProps {
  onLoad?: () => void;
}

export default function MapMyIndiaScript({ onLoad }: MapMyIndiaScriptProps) {
  const mapSDKKey = '8f2b5e8c7f6dfb77cd53969e58420d29';
  
  useEffect(() => {
    // Check if MapMyIndia is already loaded
    if (typeof window !== 'undefined' && window.mappls) {
      if (onLoad) onLoad();
    }
    
    // Event handler for script load
    const handleMapLoad = () => {
      if (onLoad) onLoad();
    };
    
    // Add event listener
    window.addEventListener('mapplsLoaded', handleMapLoad);
    
    // Cleanup
    return () => {
      window.removeEventListener('mapplsLoaded', handleMapLoad);
    };
  }, [onLoad]);
  
  const handleScriptLoad = () => {
    // Dispatch a custom event when scripts are loaded
    const event = new Event('mapplsLoaded');
    window.dispatchEvent(event);
  };

  return (
    <>
      <Script
        src={`https://apis.mappls.com/advancedmaps/api/${mapSDKKey}/map_sdk?v=3.0&layer=vector`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        id="mappls-js-api"
      />
      <Script
        src={`https://apis.mappls.com/advancedmaps/api/${mapSDKKey}/map_sdk_plugins?v=3.0&libraries=route,marker,drawing`}
        strategy="afterInteractive"
        id="mappls-plugin-api"
      />
    </>
  );
}
