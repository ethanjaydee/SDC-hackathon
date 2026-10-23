export type RouteCoordinate = [latitude: number, longitude: number];

/** Decode a Google encoded polyline into latitude/longitude pairs for map overlays. */
export function decodeGooglePolyline(encoded: string): RouteCoordinate[] {
  if (!encoded || encoded.length > 100_000) return [];

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const points: RouteCoordinate[] = [];

  const nextDelta = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) throw new Error('Truncated encoded polyline');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63 || shift > 30) throw new Error('Invalid encoded polyline');
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  try {
    while (index < encoded.length) {
      latitude += nextDelta();
      longitude += nextDelta();
      points.push([latitude / 1e5, longitude / 1e5]);
    }
    return points;
  } catch {
    return [];
  }
}
