/** Fictional workshop positions around Kuala Lumpur, never actual GPS fixes. */
export interface DemoLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface DemoCustomerSite extends DemoLocation {
  id: string;
  area: string;
}

export const DEMO_CUSTOMER_SITES: DemoCustomerSite[] = [
  { id: 'north', label: 'Demo customer · North service site', area: 'North Zone', lat: 3.1794, lng: 101.6888 },
  { id: 'central', label: 'Demo customer · Central service site', area: 'Central Zone', lat: 3.1525, lng: 101.7166 },
  { id: 'south', label: 'Demo customer · South service site', area: 'South Zone', lat: 3.1095, lng: 101.7043 },
];

const TECHNICIAN_POSITIONS: Record<number, DemoLocation> = {
  1: { label: 'North Zone sample position', lat: 3.1853, lng: 101.6755 },
  2: { label: 'Central Zone sample position', lat: 3.1467, lng: 101.6999 },
  3: { label: 'South Zone sample position', lat: 3.1132, lng: 101.6868 },
};

export function getTechnicianLocation(technicianId: number): DemoLocation | undefined {
  return TECHNICIAN_POSITIONS[technicianId];
}

/** Straight-line distance, not a driving route, travel-time estimate, or ETA. */
export function distanceKm(from: DemoLocation, to: DemoLocation): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLng = radians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
