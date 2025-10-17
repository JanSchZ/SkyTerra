export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const calculateDistanceInKm = (from: Coordinates, to: Coordinates): number => {
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);

  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2) * Math.cos(fromLat) * Math.cos(toLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const estimateTravelMinutes = (distanceKm: number, averageSpeedKmH = 55) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return 0;
  }
  const hours = distanceKm / Math.max(averageSpeedKmH, 1);
  return Math.round(hours * 60);
};
