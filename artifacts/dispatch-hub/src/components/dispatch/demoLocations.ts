import type { DemoCustomerSite } from '@workspace/api-client-react';
export type { DemoCustomerSite } from '@workspace/api-client-react';

/** Fictional workshop positions around Kuala Lumpur, never actual GPS fixes. */
export interface DemoLocation {
  lat: number;
  lng: number;
  label: string;
}

export const DEMO_CUSTOMER_SITES: DemoCustomerSite[] = [
  { id: 'north', label: 'Demo customer · Petaling Jaya', area: 'Petaling Jaya', lat: 3.1073, lng: 101.6067 },
  { id: 'central', label: 'Demo customer · Puchong', area: 'Puchong', lat: 3.0327, lng: 101.6188 },
  { id: 'south', label: 'Demo customer · Cheras', area: 'Cheras', lat: 3.0993, lng: 101.7428 },
];

const TECHNICIAN_POSITIONS: Record<number, DemoLocation> = {
  1: { label: 'Petaling Jaya · sample position', lat: 3.109, lng: 101.633 },
  2: { label: 'Puchong · sample position', lat: 3.025, lng: 101.617 },
  3: { label: 'Cheras · sample position', lat: 3.101, lng: 101.738 },
  4: { label: 'Subang Jaya · sample position', lat: 3.057, lng: 101.585 },
  5: { label: 'Kepong · sample position', lat: 3.215, lng: 101.638 },
  6: { label: 'Bukit Jalil · sample position', lat: 3.061, lng: 101.691 },
  7: { label: 'Setapak · sample position', lat: 3.193, lng: 101.716 },
  8: { label: 'Sri Petaling · sample position', lat: 3.07, lng: 101.69 },
  9: { label: 'Bangsar · sample position', lat: 3.13, lng: 101.668 },
  10: { label: 'Ampang · sample position', lat: 3.148, lng: 101.76 },
  11: { label: 'Damansara · sample position', lat: 3.157, lng: 101.611 },
  12: { label: 'Sentul · sample position', lat: 3.184, lng: 101.689 },
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
