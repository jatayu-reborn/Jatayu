import type { Coordinate, PriorityLevel } from '../types/coordinates';

// Types for API response
interface GalliDistanceResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
    data: Array<{
      distance: number;
      duration: number;
    }>;
  };
}

// Add new interface for routing API response
interface GalliRoutingResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
    data: Array<{
      distance: number;
      duration: number;
      latlngs: [number, number][];
    }>;
  };
}

const ACCESS_TOKEN = '06071418-cacd-4752-910e-338c51cf1bc9';

const getDistance = async (
  start: [number, number],
  end: [number, number],
  accessToken: string
): Promise<number> => {
  try {
    const [startLat, startLng] = start;
    const [endLat, endLng] = end;

    const url = new URL('https://route-init.gallimap.com/api/v1/routing/distance');
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('srcLat', startLat.toString());
    url.searchParams.append('srcLng', startLng.toString());
    url.searchParams.append('dstLat', endLat.toString());
    url.searchParams.append('dstLng', endLng.toString());
    url.searchParams.append('accessToken', accessToken);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as GalliDistanceResponse;
    
    if (data.success && data.data.success && data.data.data[0]) {
      return data.data.data[0].distance;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Distance calculation failed:', error);
    // Fallback to simple distance calculation
    return calculateHaversineDistance(start, end);
  }
};

// Fix Haversine calculation
const calculateHaversineDistance = (
  [lat1, lon1]: [number, number], 
  [lat2, lon2]: [number, number]
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Fixed typo here

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const getRoutePath = async (
  start: [number, number],
  end: [number, number],
  accessToken: string
): Promise<[number, number][]> => {
  try {
    const [startLat, startLng] = start;
    const [endLat, endLng] = end;

    const url = new URL('https://route-init.gallimap.com/api/v1/routing');
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('srcLat', startLat.toString());
    url.searchParams.append('srcLng', startLng.toString());
    url.searchParams.append('dstLat', endLat.toString());
    url.searchParams.append('dstLng', endLng.toString());
    url.searchParams.append('accessToken', accessToken);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as GalliRoutingResponse;
    
    if (data.success && data.data.success && data.data.data[0]) {
      return data.data.data[0].latlngs;
    }

    throw new Error('Failed to get route');
  } catch (error) {
    console.error('Route calculation failed:', error);
    // Fallback to direct line if API fails
    return [start, end];
  }
};

// Update calculatePath to use the new routing
export const calculatePath = async (
  coordinates: Coordinate[], 
  currentLocation: [number, number]
): Promise<Coordinate[]> => {
  // Always start with current location
  const startPoint: Coordinate = {
    latitude: currentLocation[0],
    longitude: currentLocation[1],
    priority: 'normal'
  };

  const grouped = coordinates.reduce((acc, coord) => {
    if (coord.latitude === startPoint.latitude && coord.longitude === startPoint.longitude) {
      return acc;
    }
    const priority = coord.priority;
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(coord);
    return acc;
  }, {} as Record<PriorityLevel, Coordinate[]>);

  const result: Coordinate[] = [startPoint];
  let lastPoint = startPoint;

  // Process each priority level
  for (const priority of ['severe', 'intermediate', 'normal'] as PriorityLevel[]) {
    if (!grouped[priority]) continue;

    let remaining = [...grouped[priority]];
    while (remaining.length > 0) {
      // Find nearest point considering actual route distances
      let nearest = remaining[0];
      let shortestDistance = Infinity;
      
      for (const point of remaining) {
        try {
          const route = await getRoutePath(
            [lastPoint.latitude, lastPoint.longitude],
            [point.latitude, point.longitude],
            ACCESS_TOKEN
          );
          
          const distance = route.length; // Use route length as distance metric
          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearest = point;
          }
        } catch (error) {
          console.error('Error calculating route:', error);
        }
      }

      result.push(nearest);
      lastPoint = nearest;
      remaining = remaining.filter(p => p !== nearest);
    }
  }

  return result;
};

export { getDistance, calculateHaversineDistance };
