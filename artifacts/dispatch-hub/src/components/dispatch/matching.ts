import type { HubData } from '@workspace/api-client-react';
import { distanceKm, getTechnicianLocation, type DemoLocation } from './demoLocations';

/** Availability and every required part are mandatory; proximity only ranks valid matches. */
export function rankQualifiedTechnicians(hub: HubData | undefined, parts: string[], customer: DemoLocation) {
  if (!hub || !parts.length) return [];
  const required = new Map<string, number>();
  for (const part of parts) {
    const key = part.toLowerCase();
    required.set(key, (required.get(key) || 0) + 1);
  }
  const distance = (id: number) => {
    const position = getTechnicianLocation(id);
    return position ? distanceKm(position, customer) : Number.POSITIVE_INFINITY;
  };
  return hub.technicians.filter((tech) =>
    tech.status === 'Available' && [...required].every(([part, quantity]) =>
      hub.inventory.some((item) =>
        item.van_id === tech.van_id &&
        item.part_name.toLowerCase() === part &&
        item.quantity >= quantity,
      ),
    ),
  ).sort((a, b) => distance(a.id) - distance(b.id) || a.id - b.id);
}
