import type { Technician } from '@workspace/api-client-react';

/** Strongest combined demo activity and rating first, with deterministic ties. */
export function rankBadges(techs: Technician[]) {
  return [...techs].sort((a, b) =>
    ((b.demo_completed_jobs ?? 0) * (b.rating ?? 0)) - ((a.demo_completed_jobs ?? 0) * (a.rating ?? 0)) || a.id - b.id);
}

const PLACE_SURFACES = [
  'border-amber-400/60 bg-amber-100/80 dark:border-amber-300/45 dark:bg-amber-400/15',
  'border-slate-300 bg-slate-100/90 dark:border-slate-400/45 dark:bg-slate-400/15',
  'border-orange-500/45 bg-orange-100/80 dark:border-orange-300/35 dark:bg-orange-400/10',
] as const;

export function badgeSurfaceForRank(rank: number) {
  return Number.isInteger(rank) && rank >= 0 && rank < PLACE_SURFACES.length
    ? PLACE_SURFACES[rank]
    : 'border-card-border bg-card';
}
