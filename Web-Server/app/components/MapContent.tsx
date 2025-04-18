'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import MapMyIndiaMap from './MapMyIndiaMap';
import StatsSidebar from './StatsSidebar';
import type { Coordinate } from '../types/coordinates';

interface MapContentProps {
  initialCenter?: [number, number];
}

export default function MapContent({ initialCenter }: MapContentProps) {
  const searchParams = useSearchParams();
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Format markers for the map
  const mapMarkers = coordinates.map(coord => ({
    position: [coord.latitude, coord.longitude] as [number, number],
    title: `Incident ${coord.priority}`,
    priority: coord.priority as 'severe' | 'intermediate' | 'normal' | 'unknown'
  }));

  // Calculate statistics
  const stats = {
    severe: coordinates.filter(c => c.priority === 'severe').length,
    intermediate: coordinates.filter(c => c.priority === 'intermediate').length,
    normal: coordinates.filter(c => c.priority === 'normal').length,
    unknown: coordinates.filter(c => c.priority === 'unknown' || !c.priority).length,
    total: coordinates.length
  };

  // Get initial center from URL parameters or props or use default
  const getInitialCenter = useCallback((): [number, number] => {
    // First check URL params
    const lat = searchParams?.get('lat');
    const lng = searchParams?.get('lng');
    
    if (lat && lng) {
      return [parseFloat(lat), parseFloat(lng)];
    }
    
    // Then check props
    if (initialCenter) {
      return initialCenter;
    }
    
    // Default to Kathmandu
    return [27.7172, 85.3240];
  }, [searchParams, initialCenter]);

  // Fetch coordinates data
  const fetchCoordinates = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/coordinates');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received');
      }
      
      setCoordinates(data.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch coordinates:', error);
      setError('Failed to load incident data');
      setIsLoading(false);
    }
  }, []);

  // Handle map load
  const handleMapLoad = (map: any) => {
    setMapInstance(map);
  };

  // Polling mechanism
  useEffect(() => {
    let mounted = true;
    const pollInterval = 10000; // 10 seconds

    const pollForUpdates = async () => {
      if (!mounted) return;
      await fetchCoordinates();
    };

    // Initial fetch
    pollForUpdates();
    
    // Set up polling
    const intervalId = setInterval(pollForUpdates, pollInterval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchCoordinates]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left sidebar with statistics */}
      <div className="lg:col-span-1">
        <StatsSidebar stats={stats} />
      </div>
      
      {/* Map container */}
      <div className="lg:col-span-3">
        <div className="relative bg-white p-4 rounded-lg shadow-md w-full h-[70vh]">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-red-700">{error}</p>
                <button 
                  onClick={() => { setError(null); fetchCoordinates(); }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <MapMyIndiaMap 
              center={getInitialCenter()}
              zoom={13}
              markers={mapMarkers}
              onMapLoad={handleMapLoad}
            />
          )}
        </div>
      </div>
    </div>
  );
}
