import type { PriorityLevel } from '../types/coordinates';

export function getPinColor(priority: PriorityLevel): string {
  switch (priority) {
    case 'severe': return '#ef4444'; // red
    case 'intermediate': return '#f59e0b'; // amber
    case 'normal': return '#10b981'; // green
    case 'unknown':
    default: return '#6b7280'; // gray
  }
}

export function getCurrentLocationColor(): string {
  return '#3b82f6'; // blue
}

export function createSVGIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createDotIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="1"/>
  </svg>`;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const getMarkerIcon = (priority: PriorityLevel): any => {
  const color = getPinColor(priority);
  
  // These are default MapmyIndia marker colors, you can customize further
  switch(priority) {
    case 'severe': 
      return { url: 'https://apis.mapmyindia.com/map_v3/1.png', height: 35, width: 25 };
    case 'intermediate': 
      return { url: 'https://apis.mapmyindia.com/map_v3/2.png', height: 35, width: 25 };
    case 'normal': 
      return { url: 'https://apis.mapmyindia.com/map_v3/3.png', height: 35, width: 25 };
    case 'unknown':
    default: 
      return { url: 'https://apis.mapmyindia.com/map_v3/7.png', height: 35, width: 25 };
  }
};
