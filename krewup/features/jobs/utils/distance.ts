/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  coords1: { lat: number; lng: number } | null,
  coords2: { lat: number; lng: number } | null
): number | null {
  if (!coords1 || !coords2) return null;

  const R = 3959; // Earth's radius in miles
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLng = toRad(coords2.lng - coords1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1.lat)) *
      Math.cos(toRad(coords2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number | null): string {
  if (distance === null) return 'Distance unknown';
  if (distance < 1) return 'Less than 1 mile away';
  if (distance === 1) return '1 mile away';
  return `${distance} miles away`;
}

/**
 * Sort jobs by distance from user location
 */
export function sortJobsByDistance<T extends { coords?: { lat: number; lng: number } | null }>(
  jobs: T[],
  userCoords: { lat: number; lng: number } | null
): (T & { distance?: number | null })[] {
  return jobs
    .map((job) => ({
      ...job,
      distance: calculateDistance(userCoords, job.coords || null),
    }))
    .sort((a, b) => {
      // Jobs without distance go to the end
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}
