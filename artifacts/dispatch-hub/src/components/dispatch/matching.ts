import type { HubData, JobComplexity } from '@workspace/api-client-react';
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
  return hub.technicians.filter((tech) =>
    tech.status === 'Available' && (tech.level ?? 0) >= minLevel &&
    !hub.activity_log.some((entry) => entry.dispatch?.status === 'Active' && entry.dispatch.van_id === tech.van_id) &&
    [...required].every(([part, quantity]) =>
      hub.inventory.some((item) =>
        item.van_id === tech.van_id &&
        item.part_name.toLowerCase() === part &&
        item.quantity >= quantity,
      ),
    ),
  ).sort((a, b) => (difficulty === 'Easy' ? (a.level ?? 3) - (b.level ?? 3) : 0) ||
    (b.rating ?? 0) - (a.rating ?? 0) || a.id - b.id);
}
