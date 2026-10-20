import type { HubData } from '@workspace/api-client-react';

/** Reject overlapping hub writes before the first await, including same-tick clicks. */
export class WriteGate {
  private active = false;
  acquire(): boolean { if (this.active) return false; this.active = true; return true; }
  release(): void { this.active = false; }
  get busy(): boolean { return this.active; }
}
export async function performHubWrite(gate: WriteGate, options: {
  cancel: () => Promise<unknown>;
  read: () => HubData | undefined;
  write: (hub: HubData) => void;
  optimistic: (hub: HubData) => HubData;
  request: () => Promise<HubData>;
  pending: (value: boolean) => void;
  markStale: () => Promise<unknown>;
}): Promise<HubData | null> {
  if (!gate.acquire()) return null;
  options.pending(true);
  let previous: HubData | undefined;
  try {
    await options.cancel();
    previous = options.read();
    if (previous) options.write(options.optimistic(previous));
    const updated = await options.request();
    await options.cancel();
    options.write(updated);
    return updated;
  } catch (error) {
    await options.cancel();
    if (previous) options.write(previous);
    throw error;
  } finally {
    try { await options.markStale(); }
    finally { gate.release(); options.pending(false); }
  }
}
export function optimisticDispatch(hub: HubData, techId: number, vanId: number, parts: string[]): HubData {
  const required = new Map<string, number>();
  for (const part of parts) required.set(part.toLowerCase(), (required.get(part.toLowerCase()) ?? 0) + 1);
  return {
    ...hub,
    technicians: hub.technicians.map((tech) => tech.id === techId ? { ...tech, status: 'Busy' as const } : tech),
    inventory: hub.inventory.map((item) => item.van_id === vanId
      ? { ...item, quantity: Math.max(0, item.quantity - (required.get(item.part_name.toLowerCase()) ?? 0)) } : item),
    // Immutable audit entries only come from the server.
  };
}
export function optimisticAvailable(hub: HubData, techId: number): HubData {
  return { ...hub, technicians: hub.technicians.map((tech) => tech.id === techId ? { ...tech, status: 'Available' as const } : tech) };
}
