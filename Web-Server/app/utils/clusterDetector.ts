import type { Coordinate } from '../types/coordinates';

const CLUSTER_RADIUS = 50; // meters
const MIN_SEVERE_COUNT = 5;

// Convert meters to approximate degrees (rough approximation)
const metersToLatDegrees = (meters: number) => meters / 111320;
const metersToLngDegrees = (meters: number, latitude: number) => 
  meters / (111320 * Math.cos(latitude * Math.PI / 180));

interface Cluster {
  center: { latitude: number; longitude: number };
  count: number;
  points: Coordinate[];
}

export const detectSevereClusters = (coordinates: Coordinate[]): Cluster[] => {
  const severePoints = coordinates.filter(coord => coord.priority === 'severe');
  const clusters: Cluster[] = [];

  severePoints.forEach(point => {
    const latDiff = metersToLatDegrees(CLUSTER_RADIUS);
    const lngDiff = metersToLngDegrees(CLUSTER_RADIUS, point.latitude);

    // Find nearby points
    const nearbyPoints = severePoints.filter(other => 
      other !== point &&
      Math.abs(other.latitude - point.latitude) <= latDiff &&
      Math.abs(other.longitude - point.longitude) <= lngDiff
    );

    if (nearbyPoints.length + 1 >= MIN_SEVERE_COUNT) { // +1 for the current point
      // Calculate cluster center
      const allPoints = [point, ...nearbyPoints];
      const center = {
        latitude: allPoints.reduce((sum, p) => sum + p.latitude, 0) / allPoints.length,
        longitude: allPoints.reduce((sum, p) => sum + p.longitude, 0) / allPoints.length
      };

      // Check if this cluster overlaps with existing ones
      const isNewCluster = !clusters.some(cluster => 
        Math.abs(cluster.center.latitude - center.latitude) <= latDiff &&
        Math.abs(cluster.center.longitude - center.longitude) <= lngDiff
      );

      if (isNewCluster) {
        clusters.push({
          center,
          count: allPoints.length,
          points: allPoints
        });
      }
    }
  });

  return clusters;
};
