import type { LatLng } from "../data/zones";

/** Ray-casting point-in-polygon test. */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const x = point.longitude;
    const y = point.latitude;

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInAnyPolygon(point: LatLng, polygons: LatLng[][]): boolean {
  return polygons.some((ring) => isPointInPolygon(point, ring));
}

/** Approximate distance in meters between two lat/lng points (equirectangular, fine for short distances). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = dLon * Math.cos((lat1 + lat2) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

/** Distance in meters from a point to the nearest edge of a ring (closed or open polyline). */
function distanceToRing(point: LatLng, ring: LatLng[]): number {
  let min = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    min = Math.min(min, distanceToSegment(point, a, b));
  }
  return min;
}

function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = a.longitude;
  const ay = a.latitude;
  const bx = b.longitude;
  const by = b.latitude;
  const px = p.longitude;
  const py = p.latitude;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest: LatLng = { longitude: ax + t * dx, latitude: ay + t * dy };
  return distanceMeters(p, closest);
}

export function distanceToAnyPolygon(point: LatLng, polygons: LatLng[][]): number {
  let min = Infinity;
  for (const ring of polygons) {
    min = Math.min(min, distanceToRing(point, ring));
  }
  return min;
}
