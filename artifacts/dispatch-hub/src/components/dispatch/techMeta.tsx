import type { Technician } from '@workspace/api-client-react';
import { StatusBadge, type Tone } from './shared';

export const LEVEL_NAME: Record<number, string> = { 1: 'Intern', 2: 'Experienced', 3: 'Expert' };
const levelTone: Record<number, Tone> = { 1: 'idle', 2: 'busy', 3: 'ok' };
export const levelOf = (t: Pick<Technician, 'level'>) => t.level ?? 0;
export const levelText = (t: Pick<Technician, 'level' | 'experience_label'>) => t.level == null ? 'Level not verified' : `Level ${levelOf(t)} · ${t.experience_label ?? LEVEL_NAME[levelOf(t)]}`;

export function LevelBadge({ tech }: { tech: Pick<Technician, 'level' | 'experience_label'> }) {
  return <StatusBadge tone={levelTone[levelOf(tech)] ?? 'idle'}>{levelText(tech)}</StatusBadge>;
}
export const ratingText = (t: Pick<Technician, 'rating'>) => (t.rating != null ? t.rating.toFixed(1) : '—');
