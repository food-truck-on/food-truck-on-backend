const EARTH_RADIUS_M = 6371000;
const METERS_PER_LAT_DEGREE = 111320;

const toRadians = (degree: number) => (degree * Math.PI) / 180;

/** 두 좌표 사이의 거리(m, Haversine) */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

/** 반경을 포함하는 위경도 범위 (DB 1차 필터용) */
export function boundingBox(lat: number, lng: number, radiusM: number) {
  const latDelta = radiusM / METERS_PER_LAT_DEGREE;
  const lngDelta =
    radiusM /
    (METERS_PER_LAT_DEGREE * Math.max(Math.cos(toRadians(lat)), 0.01));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
