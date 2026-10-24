import { cn } from '@/lib/utils';

const backgrounds = ['#dbeafe', '#fce7f3', '#ccfbf1', '#fef3c7', '#ede9fe', '#ffedd5', '#cffafe', '#dcfce7', '#ffe4e6', '#e0e7ff', '#f5e6d3', '#e2e8f0'];
const skinTones = ['#d69a70', '#a96343', '#edbb91', '#b77b54', '#8f553e', '#f3c6a2'];
const shirts = ['#2563a5', '#784dc0', '#087e81', '#c15b32', '#376345', '#ad426c'];

/** Fictional illustrated portraits, stable by technician ID in every theme. */
export function TechnicianAvatar({ id, name, className }: { id: number; name: string; className?: string }) {
  const seed = Math.abs(Math.trunc(id));
  const skin = skinTones[seed % skinTones.length];
  const hair = seed % 3 === 0 ? '#4f342b' : seed % 3 === 1 ? '#202b35' : '#342b32';
  const shirt = shirts[seed % shirts.length];
  const glasses = seed % 4 === 0;
  return (
    <svg viewBox="0 0 80 80" role="img" aria-label={`${name}, illustrated profile picture`}
      data-testid={`avatar-technician-${id}`} className={cn('h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/60 shadow-sm', className)}>
      <title>{name} — illustrated profile picture</title>
      <rect width="80" height="80" fill={backgrounds[seed % backgrounds.length]} />
      <circle cx="65" cy="13" r="21" fill="white" opacity=".35" />
      <path d="M8 80c1-17 11-25 32-25s31 8 32 25" fill={shirt} />
      <path d="m29 57 11 12 11-12" fill="white" opacity=".88" />
      <path d="M33 48h14v12c-4 6-10 6-14 0z" fill={skin} />
      <ellipse cx="40" cy="33" rx="21" ry="24" fill={hair} />
      <ellipse cx="20" cy="37" rx="4" ry="6" fill={skin} />
      <ellipse cx="60" cy="37" rx="4" ry="6" fill={skin} />
      <path d="M22 25c0-13 36-13 36 0v14c0 13-8 20-18 20S22 52 22 39z" fill={skin} />
      {seed % 2 === 0
        ? <path d="M20 29C16 8 40 3 55 16l6 15-9-7-4-9c-4 9-15 13-28 14" fill={hair} />
        : <path d="M20 30c-4-19 12-25 24-22 16-1 20 12 15 25l-7-13c-9 7-19 6-29 2z" fill={hair} />}
      <path d="m29 32 6-1m10 0 6 1" stroke={hair} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="37" r="1.8" fill="#24252c" />
      <circle cx="48" cy="37" r="1.8" fill="#24252c" />
      <path d="m40 38-2 6h4" fill="none" stroke="#824631" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M34 48q6 6 12 0" fill="white" stroke="#864d3b" strokeWidth="1.2" strokeLinecap="round" />
      {glasses && <g fill="none" stroke="#263745" strokeWidth="1.7"><rect x="25" y="33" width="13" height="9" rx="3" /><rect x="42" y="33" width="13" height="9" rx="3" /><path d="M38 36h4" /></g>}
      {seed % 5 === 0 && <path d="M20 25c0-15 8-20 20-20s20 5 20 20H20m8-4h38" fill="#e9ad35" stroke="#c88c20" strokeWidth="2" strokeLinecap="round" />}
      <path d="M19 74h11m25 0h8" stroke="white" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
