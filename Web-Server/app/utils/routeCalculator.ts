import type { Coordinate } from '../types/coordinates';

/**
 * Calculate the Haversine distance between two points in kilometers
 */
export function calculateHaversineDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const lat1 = point1[0];
  const lon1 = point1[1];
  const lat2 = point2[0];
  const lon2 = point2[1];

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate the optimal route from current location to incidents
 * prioritizing by severity (severe -> intermediate -> normal)
 */
export function calculateOptimalRoute(
  startPoint: [number, number],
  incidents: Coordinate[]
): Coordinate[] {
  // Create a start point as a Coordinate
  const start: Coordinate = {
    latitude: startPoint[0],
    longitude: startPoint[1],
    priority: 'normal' // Doesn't matter for the start point
  };

  // Create ordered result array starting with current location
  const result: Coordinate[] = [start];

  // Group incidents by priority
  const grouped: Record<string, Coordinate[]> = {
    severe: incidents.filter(i => i.priority === 'severe'),
    intermediate: incidents.filter(i => i.priority === 'intermediate'),
    normal: incidents.filter(i => i.priority === 'normal'),
    unknown: incidents.filter(i => i.priority === 'unknown')
  };

  // Process each priority level in order
  const priorityOrder = ['severe', 'intermediate', 'normal', 'unknown'];
  
  for (const priority of priorityOrder) {
    if (!grouped[priority] || grouped[priority].length === 0) continue;
    
    // Find nearest neighbor path within this priority group
    let remainingPoints = [...grouped[priority]];
    let lastPoint = result[result.length - 1];
    
    while (remainingPoints.length > 0) {
      // Find the nearest point to the last one added
      let nearestPoint = remainingPoints[0];
      let minDistance = calculateHaversineDistance(
        [lastPoint.latitude, lastPoint.longitude],
        [nearestPoint.latitude, nearestPoint.longitude]
      );
      
      for (let i = 1; i < remainingPoints.length; i++) {
        const distance = calculateHaversineDistance(
          [lastPoint.latitude, lastPoint.longitude],
          [remainingPoints[i].latitude, remainingPoints[i].longitude]
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = remainingPoints[i];
        }
      }
      
      // Add the nearest point to our route
      result.push(nearestPoint);
      
      // Update lastPoint for the next iteration
      lastPoint = nearestPoint;
      
      // Remove the point we just added from remainingPoints
      remainingPoints = remainingPoints.filter(p => p !== nearestPoint);
    }
  }
  
  return result;
}

/**
 * Get the distance of the entire route
 */
export function calculateTotalRouteDistance(route: Coordinate[]): number {
  if (route.length <= 1) return 0;
  
  let totalDistance = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateHaversineDistance(
      [route[i].latitude, route[i].longitude],
      [route[i + 1].latitude, route[i + 1].longitude]
    );
  }
  
  return totalDistance;
}
