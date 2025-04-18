'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import GalliMapLoader from '../components/GalliMapLoader';
import GalliScript from '../components/GalliScript';
import type { Coordinate, PriorityLevel } from '../types/coordinates';
import { getPinColor, getCurrentLocationColor } from '../utils/markerIcons';
import { calculatePath, calculateHaversineDistance } from '../utils/pathCalculator'; // Add import
import { detectSevereClusters } from '../utils/clusterDetector';
import type { GalliMapOptions, GalliMarkerOptions, GalliPolylineOptions, GalliCircleOptions } from '../types/map';
import StatsSidebar from '../components/StatsSidebar';

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_GALLI_ACCESS_TOKEN || '';

// Update type definitions for Galli
type MapInstance = any;
type MarkerInstance = any;
type PolylineInstance = any;

// Add type guard function
const isGalliAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.Galli !== undefined;
};

const getGalli = () => {
  if (!window.Galli) {
    throw new Error('Galli Maps not loaded');
  }
  return window.Galli;
};

const waitForGalli = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.Galli) {
      resolve();
      return;
    }

    const maxWaitTime = 15000; // 15 seconds
    const checkInterval = 100; // 100ms

    const galliLoadedHandler = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('galliLoaded', galliLoadedHandler);
      reject(new Error('Galli Maps failed to load'));
    }, maxWaitTime);

    window.addEventListener('galliLoaded', galliLoadedHandler);
  });
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<Map<string, MarkerInstance>>(new Map());
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const pathRef = useRef<PolylineInstance | null>(null);
  const currentLocationRef = useRef<[number, number]>([0, 0]);
  const mounted = useRef(true);
  const [stats, setStats] = useState({
    severe: 3,
    intermediate: 2,
    normal: 3,
    unknown: 0,
    total: 8
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'normal': return 'green';
      case 'severe': return 'red';
      case 'intermediate': return 'yellow';
      default: return 'white';
    }
  };

  // Update marker creation with type guard
  const createCustomMarker = useCallback((coordinate: Coordinate) => {
    if (!mapInstanceRef.current) return null;
    
    return mapInstanceRef.current.displayPinMarker({
      color: getPinColor(coordinate.priority),
      draggable: false,
      latLng: [coordinate.latitude, coordinate.longitude] as [number, number]
    });
  }, []);

  const clearExistingMarkers = () => {
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removePinMarker(marker);
    });
    markersRef.current.clear();
  };

  // Update getRoutePath function to use new API
  const getRoutePath = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
    try {
      const url = new URL('https://route-init.gallimap.com/api/v1/routing');
      url.searchParams.append('mode', 'driving');
      url.searchParams.append('srcLat', start[0].toString());
      url.searchParams.append('srcLng', start[1].toString());
      url.searchParams.append('dstLat', end[0].toString());
      url.searchParams.append('dstLng', end[1].toString());
      url.searchParams.append('accessToken', ACCESS_TOKEN);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.success && data.data.data[0]) {
        return data.data.data[0].latlngs;
      }
      
      throw new Error('Invalid route response');
    } catch (error) {
      console.error('Route calculation failed:', error);
      return [start, end];
    }
  };

  // Update drawPath with proper priority typing
  const drawPath = useCallback(async (coords: Coordinate[]) => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance || coords.length === 0) return;

    try {
      if (pathRef.current) {
        mapInstance.removePinMarker(pathRef.current);
      }

      const [currentLat, currentLng] = currentLocationRef.current;
      
      // Define priorities with unknown case
      const priorities: Record<PriorityLevel, number> = {
        severe: 0,
        intermediate: 1,
        normal: 2,
        unknown: 3
      };

      // Sort coordinates by priority and distance
      const sortedCoords = [...coords].sort((a, b) => {
        const distA = calculateHaversineDistance(
          [currentLat, currentLng],
          [a.latitude, a.longitude]
        );
        const distB = calculateHaversineDistance(
          [currentLat, currentLng],
          [b.latitude, b.longitude]
        );
        
        // First sort by priority using the priorities record
        if (a.priority !== b.priority) {
          return priorities[a.priority] - priorities[b.priority];
        }
        // Then by distance
        return distA - distB;
      });

      let allRoutePoints: [number, number][] = [];
      let lastPoint: [number, number] = [currentLat, currentLng];

      // Start with current location
      allRoutePoints.push([currentLng, currentLat]);

      // Get route for each point
      for (const coord of sortedCoords) {
        const route = await getRoutePath(
          lastPoint,
          [coord.latitude, coord.longitude]
        );
        
        // Add route points (excluding first point to avoid duplicates)
        if (route.length > 0) {
          allRoutePoints = allRoutePoints.concat(route.slice(1));
          lastPoint = [coord.latitude, coord.longitude];
        }
      }

      console.log('Route Points:', allRoutePoints); // Debug route points

      pathRef.current = mapInstance.drawPolygon({
        name: 'path',
        color: '#000000',
        opacity: 0.8,
        width: 4,
        latLng: [currentLat, currentLng],
        geoJson: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: allRoutePoints
          }
        }
      });
    } catch (error) {
      console.error('Failed to draw path:', error);
    }
  }, []);

  const notifyCluster = async (cluster: any) => {
    try {
      const response = await fetch('YOUR_ALERT_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center: cluster.center,
          count: cluster.count,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to notify about cluster');
      }
      
      console.log('Cluster notification sent:', cluster);
    } catch (error) {
      console.error('Failed to send cluster notification:', error);
    }
  };

  // Update addMarkersToMap with type guard
  const addMarkersToMap = useCallback((coords: Coordinate[]) => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance) return;
    
    try {
      clearExistingMarkers();
      
      // Detect severe clusters
      const clusters = detectSevereClusters(coords);
      
      // Handle clusters
      clusters.forEach(cluster => {
        console.log('Severe cluster detected:', cluster);
        notifyCluster(cluster);
        
        // Add cluster visualization
        mapInstance.drawPolygon({
          name: `cluster-${cluster.count}`,
          color: 'red',
          opacity: 0.3,
          width: 2,
          latLng: [cluster.center.latitude, cluster.center.longitude],
          geoJson: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[cluster.center.longitude, cluster.center.latitude]]
            }
          }
        });
      });

      // Add markers
      coords.forEach((coord) => {
        try {
          const marker = createCustomMarker(coord);
          if (marker) {
            const key = `${coord.latitude}-${coord.longitude}`;
            markersRef.current.set(key, marker);
          }
        } catch (err) {
          console.error('Error adding marker:', err);
        }
      });

      // Fit bounds if there are coordinates
      if (coords.length > 0) {
        const bounds = coords.reduce(
          (acc, coord) => ({
            minLat: Math.min(acc.minLat, coord.latitude),
            maxLat: Math.max(acc.maxLat, coord.latitude),
            minLng: Math.min(acc.minLng, coord.longitude),
            maxLng: Math.max(acc.maxLng, coord.longitude),
          }),
          {
            minLat: coords[0].latitude,
            maxLat: coords[0].latitude,
            minLng: coords[0].longitude,
            maxLng: coords[0].longitude,
          }
        );

        mapInstance.map.fitBounds([
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat]
        ], {
          padding: 20,
          maxZoom: 19,
          duration: 1000
        });
      }

      drawPath(coords);
    } catch (error) {
      console.error('Failed to add markers:', error);
    }
  }, [drawPath, createCustomMarker]);

  // Memoize the coordinates comparison function
  const areCoordinatesEqual = useCallback((prev: Coordinate[], next: Coordinate[]) => {
    if (prev.length !== next.length) return false;
    return prev.every((coord, index) => (
      coord.latitude === next[index].latitude &&
      coord.longitude === next[index].longitude &&
      coord.priority === next[index].priority
    ));
  }, []);

  // Memoize fetch coordinates to prevent recreating on every render
  const fetchCoordinates = useCallback(async () => {
    try {
      const response = await fetch('/api/coordinates');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received');
      }
      
      // Only update if coordinates have changed
      if (!areCoordinatesEqual(coordinates, data.data)) {
        setCoordinates(data.data);
        addMarkersToMap(data.data);
      }
      return data.data;
    } catch (error) {
      console.error('Failed to fetch coordinates:', error);
      setError('Failed to load coordinate data');
      return [];
    }
  }, [coordinates, addMarkersToMap, areCoordinatesEqual]);

  // Polling mechanism with optimized updates
  useEffect(() => {
    let mounted = true;
    const pollInterval = 5000;

    const pollForUpdates = async () => {
      if (!mounted) return;
      await fetchCoordinates();
    };

    // Initial fetch
    pollForUpdates();

    const intervalId = setInterval(pollForUpdates, pollInterval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchCoordinates]); // Only depend on fetchCoordinates

  // Add getCurrentPosition helper
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  };

  // Add ref for current location marker
  const currentLocationMarkerRef = useRef<any>(null);

  // Update watchPositionCallback to force path recalculation
  const watchPositionCallback = useCallback((position: GeolocationPosition) => {
    const newLat = position.coords.latitude;
    const newLng = position.coords.longitude;
    
    // Always update current location
    currentLocationRef.current = [newLat, newLng];
    console.log('Location Updated:', { newLat, newLng }); // Debug location updates
    
    // Update marker position
    if (mapInstanceRef.current) {
      // Remove existing current location marker if any
      if (currentLocationMarkerRef.current) {
        mapInstanceRef.current.removePinMarker(currentLocationMarkerRef.current);
      }
      
      // Add new current location marker
      currentLocationMarkerRef.current = mapInstanceRef.current.displayPinMarker({
        color: getCurrentLocationColor(),
        draggable: false,
        latLng: [newLat, newLng]
      });

      // Recalculate path whenever location changes
      if (coordinates.length > 0) {
        drawPath(coordinates);
      }
    }
  }, [coordinates, drawPath]);

  // Update initMap function
  const initMap = useCallback(async () => {
    try {
      if (!mapRef.current) {
        throw new Error('Map container not found');
      }

      let currentLat = 27; // Default fallback
      let currentLng = 85; // Default fallback

      try {
        // Get actual current position
        const position = await getCurrentPosition();
        currentLat = position.coords.latitude;
        currentLng = position.coords.longitude;
        
        // Update current location ref
        currentLocationRef.current = [currentLat, currentLng];
      } catch (error) {
        console.warn('Failed to get current location:', error);
        // Fall back to URL params if available
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        if (lat && lng) {
          currentLat = parseFloat(lat);
          currentLng = parseFloat(lng);
        }
      }

      // Initialize map with current location
      const center: [number, number] = [currentLat, currentLng];

      const galliMapsObject = {
        accessToken: ACCESS_TOKEN,
        map: {
          container: 'map',
          center,
          zoom: 20,
          maxZoom: 25,
          minZoom: 5
        },
        pano: {
          container: 'pano'
        }
      } as const;

      if (typeof window === 'undefined' || !window.GalliMapPlugin) {
        throw new Error('GalliMapPlugin not loaded');
      }

      mapInstanceRef.current = new window.GalliMapPlugin(galliMapsObject);

      // Add current location marker with distinct style
      const currentLocationMarker = mapInstanceRef.current.displayPinMarker({
        color: getCurrentLocationColor(),
        draggable: false,
        latLng: center
      });

      // Add real-time location tracking with the new callback
      navigator.geolocation.watchPosition(
        watchPositionCallback,
        (error) => console.warn('Location tracking error:', error),
        { enableHighAccuracy: true }
      );

      // Rest of the initialization...
      const initialCoords = await fetchCoordinates();
      if (mounted.current && initialCoords.length > 0) {
        addMarkersToMap(initialCoords);
      }

      if (mounted.current) {
        setIsLoading(false);
      }
      return true;
    } catch (err) {
      console.error('Map initialization error:', err);
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setIsLoading(false);
      }
      return false;
    }
  }, [searchParams, fetchCoordinates, addMarkersToMap, coordinates, watchPositionCallback]);

  const initialize = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 3;

    const tryInitialize = async () => {
      attempts++;
      const success = await initMap();
      
      if (!success && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return tryInitialize();
      }
      
      return success;
    };

    const success = await tryInitialize();
    if (!success) {
      setError('Failed to initialize map after multiple attempts');
      setIsLoading(false);
    }
  }, [initMap]);

  useEffect(() => {
    mounted.current = true;

    initialize();

    return () => {
      mounted.current = false;
      if (mapInstanceRef.current) {
        // Try different cleanup methods in order of preference
        try {
          // Clear all markers first
          clearExistingMarkers();
          
          // Try available cleanup methods
          if (typeof mapInstanceRef.current.destroy === 'function') {
            mapInstanceRef.current.destroy();
          } else if (typeof mapInstanceRef.current.cleanup === 'function') {
            mapInstanceRef.current.cleanup();
          } else if (mapInstanceRef.current.map?.remove) {
            mapInstanceRef.current.map.remove();
          }
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
        
        mapInstanceRef.current = null;
      }
    };
  }, [initialize, clearExistingMarkers]);

  // Update return JSX
  return (
    <div className="relative min-h-screen">
      <StatsSidebar stats={stats} />
      <div className="ml-64"> {/* Add margin to accommodate sidebar */}
        <div className="relative w-full h-screen">
          <GalliScript />
          <GalliMapLoader 
            apiKey={ACCESS_TOKEN} 
            onLoad={initialize}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
              <div className="text-lg">Loading map...</div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
              <div className="text-red-500">{error}</div>
            </div>
          )}
          
          <div 
            ref={mapRef} 
            id="map"
            className="w-full h-[70vh]"
            style={{ visibility: isLoading ? 'hidden' : 'visible' }}
          />
          <div 
            id="pano" 
            className="w-full h-[30vh]"
          />
        </div>
      </div>
    </div>
  );
}
