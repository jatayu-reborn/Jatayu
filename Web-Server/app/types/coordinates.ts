export type PriorityLevel = 'severe' | 'intermediate' | 'normal' | 'unknown';

export interface Coordinate {
  latitude: number;
  longitude: number;
  priority: PriorityLevel;
}

export interface CoordinatesPayload {
  coordinates: Coordinate[];
}
