'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface MapMyIndiaMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title?: string;
    priority: 'severe' | 'intermediate' | 'normal' | 'unknown';
  }>;
  onMapLoad?: (map: any) => void;
}

type PriorityType = 'severe' | 'intermediate' | 'normal' | 'current' | 'unknown';

declare global {
  interface Window {
    mappls: any;
  }
}

export default function MapMyIndiaMap({ 
  center = [28.6139, 77.2090], // Default to Delhi
  zoom = 10,
  markers = [],
  onMapLoad
}: MapMyIndiaMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const mapMarkers = useRef<any[]>([]);
  
  // Use REST key for Map SDK
  const API_KEY = process.env.NEXT_PUBLIC_MAPMYINDIA_REST_KEY || '3f7a60755ab304d47132d6435cb55c7b';
  
  // Handle script load
  const handleScriptsLoaded = () => {
    console.log('MapMyIndia scripts loaded');
    setIsScriptLoaded(true);
  };
  
  // Get current location
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(center);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
          console.log('Current location detected:', userLocation);
          setCurrentLocation(userLocation);
        },
        (error) => {
          console.warn("Error getting current position:", error);
          setCurrentLocation(center);
        }
      );
    } else {
      setCurrentLocation(center);
    }
  }, [center]);

  // Initialize map using the correct pattern from the documentation
  useEffect(() => {
    if (!isScriptLoaded || !mapContainer.current) return;
    
    try {
      console.log('Initializing map...');
      
      // Make sure the map container has an ID
      mapContainer.current.id = 'map';
      
      // Create map instance with the correct properties
      const mapObject = new window.mappls.Map({
        id: 'map', 
        properties: {
          center: currentLocation,
          zoom: zoom,
          geolocation: false,
          clickableIcons: false
        }
      });
      
      mapRef.current = mapObject;
      
      // Set up event listener for when map is loaded
      mapObject.on('load', function() {
        console.log('Map loaded');
        setIsMapLoaded(true);
        if (onMapLoad) onMapLoad(mapObject);
        
        // Add markers and draw routes after map is loaded
        addMarkersToMap();
      });
      
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
    
    // Clean up function
    return () => {
      // Remove any existing markers
      clearMarkers();
      mapRef.current = null;
    };
  }, [isScriptLoaded, currentLocation, zoom, onMapLoad]);
  
  // Clear all markers
  const clearMarkers = () => {
    if (mapMarkers.current.length > 0) {
      mapMarkers.current.forEach(marker => {
        try {
          window.mappls.remove({
            map: mapRef.current,
            layer: marker
          });
        } catch (e) {
          console.warn('Error removing marker:', e);
        }
      });
      mapMarkers.current = [];
    }
  };
  
  // Add markers to the map
  const addMarkersToMap = () => {
    if (!mapRef.current || !isMapLoaded) return;
    
    try {
      // Clear any existing markers
      clearMarkers();
      
      console.log('Adding markers to map', markers.length);
      
      // First add current location marker
      try {
        const currentMarker = new window.mappls.Marker({
          map: mapRef.current,
          position: {lat: currentLocation[0], lng: currentLocation[1]},
          icon: 'https://apis.mapmyindia.com/map_v3/7.png', // Blue marker for current location
          draggable: false,
          popupHtml: '<div style="padding:8px;"><h3 style="font-weight:bold;">Your Location</h3></div>'
        });
        
        mapMarkers.current.push(currentMarker);
      } catch (err) {
        console.error('Error creating current location marker:', err);
      }
      
      // Then add all incident markers
      markers.forEach((marker, index) => {
        try {
          // Get proper icon based on priority
          const iconUrl = getPriorityIconUrl(marker.priority);
          
          // Create marker as shown in documentation
          const markerObject = new window.mappls.Marker({
            map: mapRef.current,
            position: {lat: marker.position[0], lng: marker.position[1]},
            icon: iconUrl,
            draggable: false,
            popupHtml: `<div style="padding:8px;"><h3 style="font-weight:bold;">${marker.title || 'Incident'}</h3><p>${marker.priority} priority</p></div>`
          });
          
          mapMarkers.current.push(markerObject);
        } catch (err) {
          console.error('Error creating marker:', err);
        }
      });
      
      // Draw route lines between points
      drawRouteBetweenPoints();
      
      // Fit map to show all markers
      fitMapToShowAllMarkers();
    } catch (error) {
      console.error('Error adding markers:', error);
    }
  };
  
  // Draw route between points based on priority
  const drawRouteBetweenPoints = () => {
    if (!mapRef.current || markers.length === 0) return;
    
    try {
      // Sort markers by priority
      const sortedMarkers = [...markers].sort((a, b) => {
        const priorityOrder = { severe: 0, intermediate: 1, normal: 2, unknown: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      // Create route points starting with current location
      let routePoints: {lat: number, lng: number}[] = [
        {lat: currentLocation[0], lng: currentLocation[1]}
      ];
      
      // Add sorted markers
      sortedMarkers.forEach(marker => {
        routePoints.push({lat: marker.position[0], lng: marker.position[1]});
      });
      
      // Draw polylines between consecutive points
      for (let i = 0; i < routePoints.length - 1; i++) {
        try {
          const from = routePoints[i];
          const to = routePoints[i + 1];
          const priority = i === 0 ? 'current' : sortedMarkers[i - 1].priority;
          
          const polyline = new window.mappls.Polyline({
            map: mapRef.current,
            path: [from, to],
            strokeColor: getColorForPriority(priority),
            strokeOpacity: 0.8,
            strokeWidth: 4
          });
          
          mapMarkers.current.push(polyline); // Store in markers array for cleanup
        } catch (error) {
          console.error('Error creating polyline:', error);
        }
      }
    } catch (error) {
      console.error('Error drawing routes:', error);
    }
  };
  
  // Fit map to show all markers
  const fitMapToShowAllMarkers = () => {
    if (!mapRef.current || markers.length === 0) return;
    
    try {
      // Create bounds with all points
      const allPoints = [
        [currentLocation[0], currentLocation[1]],
        ...markers.map(m => m.position)
      ];
      
      // Use fitBounds method from documentation
      new window.mappls.fitBounds({
        map: mapRef.current,
        cType: 0,
        bounds: allPoints,
        options: {
          padding: 100,
          duration: 1000
        }
      });
    } catch (error) {
      console.error('Error fitting map bounds:', error);
      
      // Fallback to setZoom if fitBounds fails
      try {
        mapRef.current.setZoom(10);
      } catch (e) {
        console.error('Error setting zoom:', e);
      }
    }
  };
  
  // Helper function to get icon URL for priorities
  const getPriorityIconUrl = (priority: string): string => {
    switch (priority) {
      case 'severe': return 'https://apis.mapmyindia.com/map_v3/1.png'; // Red
      case 'intermediate': return 'https://apis.mapmyindia.com/map_v3/3.png'; // Yellow/Orange
      case 'normal': return 'https://apis.mapmyindia.com/map_v3/2.png'; // Green
      default: return 'https://apis.mapmyindia.com/map_v3/6.png'; // Gray
    }
  };
  
  // Helper function to get color for priority (for polylines)
  const getColorForPriority = (priority: string): string => {
    switch (priority) {
      case 'severe': return '#ef4444';
      case 'intermediate': return '#f59e0b';
      case 'normal': return '#10b981';
      case 'current': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Update markers when they change
  useEffect(() => {
    if (isMapLoaded && mapRef.current) {
      addMarkersToMap();
    }
  }, [markers, isMapLoaded]);

  return (
    <div className="relative w-full h-full">
      {/* Load MapMyIndia script */}
      <Script
        src={`https://apis.mappls.com/advancedmaps/api/${API_KEY}/map_sdk?v=3.0&layer=vector`}
        strategy="beforeInteractive" 
        onLoad={handleScriptsLoaded}
        onError={(e) => console.error("Script loading error:", e)}
      />
      
      {/* Map container */}
      <div 
        id="map"
        ref={mapContainer} 
        className="w-full h-full rounded-lg shadow-md"
        style={{ minHeight: '500px' }}
      />
      
      {/* Loading indicator */}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-700">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
