import { NextResponse } from 'next/server';
import type { Coordinate } from '@/app/types/coordinates';

// Update coordinates to Nepal locations
let allCoordinates: Coordinate[] = [
  { latitude: 27.7172, longitude: 85.3240, priority: 'severe' },      // Kathmandu
  { latitude: 27.6980, longitude: 85.3592, priority: 'normal' },      // Bhaktapur
  { latitude: 27.6710, longitude: 85.4298, priority: 'intermediate' }, // Banepa
  { latitude: 27.6866, longitude: 85.3145, priority: 'severe' },      // Patan
  { latitude: 27.7024, longitude: 85.3119, priority: 'normal' },      // Kirtipur
  { latitude: 27.7300, longitude: 85.3350, priority: 'intermediate' }, // Bouddha
  { latitude: 27.6939, longitude: 85.3157, priority: 'severe' },      // Jawalakhel
  { latitude: 27.7062, longitude: 85.3300, priority: 'normal' }       // Thamel
];

export async function GET() {
  try {
    console.log('Sending coordinates:', allCoordinates); // Debug log
    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        data: allCoordinates 
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      }
    );
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch coordinates' 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body?.coordinates?.length) {
      throw new Error('Invalid payload format');
    }

    // Validate and add new coordinates
    const newCoords = body.coordinates.filter((coord: Partial<Coordinate>) => 
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      typeof coord.priority === 'string'
    );

    if (newCoords.length === 0) {
      throw new Error('No valid coordinates provided');
    }

    // Add new coordinates to the existing ones
    allCoordinates = [...allCoordinates, ...newCoords];

    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        data: allCoordinates // Return all coordinates
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid payload' 
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      }
    );
  }
}
