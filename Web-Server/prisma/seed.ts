import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testCoordinates = [
  // Kathmandu Area
  { latitude: 27.7172, longitude: 85.3240, priority: 'severe' },
  { latitude: 27.7174, longitude: 85.3242, priority: 'severe' },
  { latitude: 27.7176, longitude: 85.3244, priority: 'intermediate' },
  { latitude: 27.7178, longitude: 85.3246, priority: 'normal' },
  { latitude: 27.7180, longitude: 85.3248, priority: 'severe' },
  
  // Pokhara Area
  { latitude: 28.2096, longitude: 83.9856, priority: 'severe' },
  { latitude: 28.2098, longitude: 83.9858, priority: 'intermediate' },
  { latitude: 28.2100, longitude: 83.9860, priority: 'normal' },
  { latitude: 28.2102, longitude: 83.9862, priority: 'severe' },
  { latitude: 28.2104, longitude: 83.9864, priority: 'intermediate' },

  // Lalitpur Area
  { latitude: 27.6588, longitude: 85.3247, priority: 'severe' },
  { latitude: 27.6590, longitude: 85.3249, priority: 'intermediate' },
  { latitude: 27.6592, longitude: 85.3251, priority: 'normal' },
  { latitude: 27.6594, longitude: 85.3253, priority: 'severe' },
  { latitude: 27.6596, longitude: 85.3255, priority: 'intermediate' }
];

async function main() {
  // Clear existing data
  await prisma.coordinate.deleteMany();

  // Create coordinates
  for (const coord of testCoordinates) {
    await prisma.coordinate.create({ data: coord });
  }

  console.log('Database seeded with 15 test coordinates');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
