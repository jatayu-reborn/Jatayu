import type { Coordinate, PriorityLevel } from '../types/coordinates';

// Define type for the global window object to include mappls property
declare global {
  interface Window {
    mappls: any;
  }
}

export const isMapMyIndiaLoaded = (): boolean => {
  return typeof window !== 'undefined' && window.mappls !== undefined;
};

export const createMapInstance = (
  container: HTMLElement | string,
  center: [number, number],
  zoom: number
): any => {
  if (!isMapMyIndiaLoaded()) {
    throw new Error('MapMyIndia SDK not loaded');
  }

  return new window.mappls.Map({
    container,
    center,
    zoom,
    zoomControl: true,
    location: true
  });
};

export const createMarker = (
  map: any, 
  position: [number, number],
  color: string = 'red'
): any => {
  const marker = new window.mappls.Marker({
    position,
    draggable: false,
    icon: getMarkerIcon(color)
  });
  marker.addTo(map);
  return marker;
};

export const createRoute = async (
  map: any,
  startPoint: [number, number],
  endPoint: [number, number],
  color: string = '#000000',
  width: number = 4
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!isMapMyIndiaLoaded()) {
      reject(new Error('MapMyIndia SDK not loaded'));
      return;
    }

    const directions = window.mappls.direction({
      map: map,
      start: { lat: startPoint[0], lng: startPoint[1] },
      end: { lat: endPoint[0], lng: endPoint[1] },
      resource: 'route',
      profile: 'driving',
      callback: function(res: any) {
        if (res.error) {
          reject(new Error(res.error));
        } else {
          const route = new window.mappls.Polyline({
            map: map,
            path: res.routes[0].geometry.coordinates,
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: width
          });
          resolve(route);
        }
      }
    });
  });
};

export const getMarkerIcon = (color: string): any => {
  // Default marker icons based on color
  switch (color.toLowerCase()) {
    case 'red':
      return {
        url: 'https://apis.mapmyindia.com/map_v3/1.png',
        width: 28,
        height: 32
      };
    case 'green':
      return {
        url: 'https://apis.mapmyindia.com/map_v3/2.png',
        width: 28,
        height: 32
      };
    case 'yellow':
      return {
        url: 'https://apis.mapmyindia.com/map_v3/3.png',
        width: 28,
        height: 32
      };
    case 'blue':
      return {
        url: 'https://apis.mapmyindia.com/map_v3/7.png',
        width: 28,
        height: 32
      };
    default:
      return {
        url: 'https://apis.mapmyindia.com/map_v3/6.png',
        width: 28,
        height: 32
      };
  }
};

// Function to fit map bounds to show all markers
export const fitMapBounds = (map: any, coordinates: Coordinate[]): void => {
  if (coordinates.length === 0) return;
  
  const bounds = new window.mappls.LatLngBounds();
  
  coordinates.forEach(coord => {
    bounds.extend([coord.latitude, coord.longitude]);
  });
  
  map.fitBounds(bounds, { padding: 50 });
};
