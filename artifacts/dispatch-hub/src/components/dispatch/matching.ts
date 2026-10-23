import type { HubData, JobComplexity, Technician } from '@workspace/api-client-react';
import type { DemoLocation } from './demoLocations';

/** Enforce skill, availability and stock. Only server-returned Google routes may rank by driving time. */
export function rankQualifiedTechnicians(hub: HubData | undefined, parts: string[], _customer: DemoLocation, complexity?: JobComplexity) {
  if (!hub || !parts.length) return [];
  const required = new Map<string, number>();
  for (const part of parts) {
    const key = part.toLowerCase();
    required.set(key, (required.get(key) || 0) + 1);
  }
  const difficulty = complexity ?? (/capacitor|board|transistor|relay/i.test(parts.join(' ')) ? 'Hard'
    : parts.every((part) => /bulb|battery/i.test(part)) ? 'Easy' : 'Normal');
  const minLevel = difficulty === 'Hard' ? 3 : difficulty === 'Normal' ? 2 : 1;
  const stocked = (vanId: number) => [...required].every(([part, quantity]) =>
    hub.inventory.some((item) => item.van_id === vanId && item.part_name.toLowerCase() === part && item.quantity >= quantity));
  const activeVans = new Set(hub.activity_log.filter((e) => e.dispatch?.status === 'Active').map((e) => e.dispatch!.van_id));
  const ranked = (list: Technician[]) => list.sort((a, b) => (difficulty === 'Easy' ? (a.level ?? 3) - (b.level ?? 3) : 0) ||
    (b.rating ?? 0) - (a.rating ?? 0) || a.id - b.id);
  const able = hub.technicians.filter((tech) => tech.status === 'Available' && (tech.level ?? 0) >= minLevel);
  if (hub.vans) {
    // Shared pool: any free van with enough stock. The server makes the final allocation.
    const free = hub.vans.filter((v) => v.status === 'Available' && !activeVans.has(v.id) && stocked(v.id)).sort((a, b) => a.id - b.id)[0];
    if (!free) return [];
    return ranked(able.map((tech) => ({ ...tech, van_id: free.id })));
  }
  // Legacy fixtures without a van pool.
  return ranked(able.filter((tech) => !activeVans.has(tech.van_id) && stocked(tech.van_id)));
}
