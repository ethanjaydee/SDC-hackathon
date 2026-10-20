import type { Ref } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusRingProps = {
  numerator: number;
  denominator: number;
  label: string;
  criteria: string;
  colorClass: string;
  ready: boolean;
  expanded: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function StatusRing({ numerator, denominator, label, criteria, colorClass, ready, expanded, onClick, buttonRef }: StatusRingProps) {
  const available = ready && denominator > 0;
  const fraction = available ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
  const c = 2 * Math.PI * 47;
  return (
    <button ref={buttonRef} type="button" disabled={!available} onClick={onClick}
      aria-expanded={expanded} aria-controls={expanded ? 'hub-readiness-detail' : undefined}
      aria-label={ready ? `${label}: ${numerator} of ${denominator}. ${criteria}.${available ? ' Select to view details.' : ' No records yet.'}` : `${label}: data not available yet.`}
      className={cn('group flex flex-col items-center gap-1 rounded-xl border border-transparent p-3 text-center transition-colors hover:border-border hover:bg-muted/40 disabled:cursor-default', expanded && 'border-border bg-muted/50')}>
      <span className="relative h-28 w-28" aria-hidden="true">
        <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
          <circle cx="55" cy="55" r="47" fill="none" strokeWidth="7" className="stroke-muted" />
          <circle cx="55" cy="55" r="47" fill="none" strokeWidth="7" strokeLinecap="round"
            className={cn('transition-[stroke-dashoffset] duration-700 ease-out', colorClass)}
            style={{ stroke: 'currentColor', strokeDasharray: c, strokeDashoffset: c * (1 - fraction), opacity: fraction > 0 ? 1 : 0 }} />
        </svg>
        <span className="absolute inset-0 grid place-content-center">
          <span className="font-mono text-2xl font-semibold tabular">{ready ? numerator : '—'}{ready && <span className="text-sm text-muted-foreground">/{denominator}</span>}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{available ? `${Math.round(fraction * 100)}%` : '—'}</span>
        </span>
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{criteria}</span>
      <span className="inline-flex items-center gap-0.5 text-[11px] text-primary">
        <ChevronRight size={11} className={cn('transition-transform', expanded && 'rotate-90')} />
        {!ready ? 'Waiting for data' : !denominator ? 'No records yet' : expanded ? 'Details open' : 'View detail'}
      </span>
    </button>
  );
}
