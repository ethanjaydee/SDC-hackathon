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
  compact?: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function StatusRing({ numerator, denominator, label, criteria, colorClass, ready, expanded, compact = false, onClick, buttonRef }: StatusRingProps) {
  const available = ready && denominator > 0;
  const fraction = available ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
  const c = 2 * Math.PI * 47;
  const action = !ready ? ' No data is available yet.' : !available ? ' No records yet.' : expanded ? ' Details are open. Select to collapse them.' : ' Select to view details.';
  const ring = (
    <span className={cn('relative block shrink-0 transition-[height,width] duration-500 ease-out motion-reduce:transition-none', compact ? 'h-14 w-14' : expanded ? 'h-32 w-32' : 'h-28 w-28')} aria-hidden="true">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle cx="55" cy="55" r="47" fill="none" strokeWidth="7" className="stroke-muted" />
        <circle cx="55" cy="55" r="47" fill="none" strokeWidth="7" strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none', colorClass)}
          style={{ stroke: 'currentColor', strokeDasharray: c, strokeDashoffset: c * (1 - fraction), opacity: fraction > 0 ? 1 : 0 }} />
      </svg>
      <span className="absolute inset-0 grid place-content-center">
        <span className={cn('font-mono font-semibold tabular transition-[font-size,line-height] duration-500 ease-out motion-reduce:transition-none', compact ? 'text-[11px]' : expanded ? 'text-3xl' : 'text-2xl')}>
          {ready ? numerator : '—'}{ready && <span className={cn('text-muted-foreground', compact ? 'text-[8px]' : 'text-sm')}>/{denominator}</span>}
        </span>
        <span className={cn('font-mono text-muted-foreground', compact ? 'text-[8px]' : 'text-[11px]')}>{available ? `${Math.round(fraction * 100)}%` : '—'}</span>
      </span>
    </span>
  );

  return (
    <button ref={buttonRef} type="button" disabled={!available} onClick={onClick}
      aria-expanded={expanded} aria-controls={expanded ? 'hub-readiness-detail' : undefined}
      aria-label={`${label}: ${ready ? `${numerator} of ${denominator}` : 'data unavailable'}. ${criteria}.${action}`}
      className={cn(
        'group w-full min-w-0 rounded-xl border border-transparent transition-all duration-500 ease-out hover:border-border hover:bg-muted/40 disabled:cursor-default motion-reduce:transition-none',
        compact ? 'flex flex-row items-center gap-3 p-2.5 text-left' : 'flex flex-col items-center gap-1 p-3 text-center',
        expanded && 'border-primary/30 bg-muted/50 p-4 shadow-sm',
      )}>
      {ring}
      {compact ? (
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="max-w-full truncate text-sm font-medium">{label}</span>
          <span className="max-w-full truncate text-[11px] text-muted-foreground">{criteria}</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
            <ChevronRight size={10} className={cn('transition-transform duration-300 motion-reduce:transition-none', expanded && 'rotate-90')} />
            {expanded ? 'Details open' : 'View detail'}
          </span>
        </span>
      ) : (
        <>
          <span className={cn('font-medium transition-[font-size] duration-500 ease-out motion-reduce:transition-none', expanded ? 'text-base' : 'text-sm')}>{label}</span>
          <span className={cn('text-muted-foreground transition-[font-size] duration-500 ease-out motion-reduce:transition-none', expanded ? 'text-sm' : 'text-xs')}>{criteria}</span>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-primary">
            <ChevronRight size={11} className={cn('transition-transform duration-300 motion-reduce:transition-none', expanded && 'rotate-90')} />
            {!ready ? 'Waiting for data' : !available ? 'No records yet' : expanded ? 'Details open' : 'View detail'}
          </span>
        </>
      )}
    </button>
  );
}
