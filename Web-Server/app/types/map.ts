export interface GalliMapOptions {
  container: HTMLElement;
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  accessToken: string;
}

export interface GalliMarkerOptions {
  coordinates: [number, number];
  element: string;
}

export interface GalliPolylineOptions {
  coordinates: [number, number][];
  color: string;
  width: number;
  opacity: number;
  dashArray: number[];
}

export interface GalliCircleOptions {
  center: [number, number];
  color: string;
  fillColor: string;
  fillOpacity: number;
  radius: number;
}

// Add MapMyIndia specific types
export interface MapMyIndiaMapOptions {
  container: string | HTMLElement;
  center: [number, number];
  zoom: number;
  zoomControl?: boolean;
  location?: boolean;
}

export interface MapMyIndiaMarkerOptions {
  position: [number, number];
  draggable?: boolean;
  icon?: {
    url: string;
    width?: number;
    height?: number;
  };
  popupHtml?: string;
}

export interface MapMyIndiaPolylineOptions {
  path: [number, number][];
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
}
