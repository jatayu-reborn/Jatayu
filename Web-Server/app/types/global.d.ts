import type { GalliMapOptions, GalliMarkerOptions, GalliPolylineOptions, GalliCircleOptions } from './map';

declare global {
  interface Window {
    Galli?: {
      initialize: (apiKey: string) => Promise<void>;
      Map: new (options: GalliMapOptions) => any;
      Marker: new (options: GalliMarkerOptions) => any;
      Icon: any;
      Polyline: new (options: GalliPolylineOptions) => any;
      Circle: new (options: GalliCircleOptions) => any;
      LatLng: new (lat: number, lng: number) => any;
      LatLngBounds: new (corner1: [number, number], corner2: [number, number]) => any;
    };
    GalliMapPlugin?: typeof GalliMapPlugin;
  }

  class GalliMapPlugin {
    constructor(options: {
      accessToken: string;
      map: {
        container: string;
        center: [number, number];
        zoom: number;
        maxZoom: number;
        minZoom: number;
      };
      pano?: {
        container: string;
      };
    });

    displayPinMarker(options: {
      color: string;
      draggable: boolean;
      latLng: [number, number];
    }): any;

    removePinMarker(marker: any): void;

    drawPolygon(options: {
      name: string;
      color: string;
      opacity: number;
      width: number;
      latLng: [number, number];
      geoJson: {
        type: "Feature";
        geometry: {
          type: "LineString";
          coordinates: [number, number][];
        };
      };
    }): any;

    // Add cleanup methods
    destroy?(): void;
    remove?(): void;
    cleanup?(): void;
    map: {
      remove(): void;
    };
  }
}

export {};
