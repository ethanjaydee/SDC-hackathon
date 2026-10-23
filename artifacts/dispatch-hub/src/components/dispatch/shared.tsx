import { useId, type ReactElement, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card as Surface, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { DispatchState } from './useDispatchHub';

export type Hub = { hub: DispatchState };
export type Tone = 'idle' | 'pending' | 'busy' | 'ok' | 'err';

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2);
}
export function dateTime(timestamp: string) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return `${d.toLocaleDateString([], { month: 'short', day: '2-digit' })} · ${d.toLocaleTimeString([], { hour12: false })}`;
}
export function clock(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour12: false });
}
export function errorText(error: unknown, fallback = 'The request could not be completed.') {
  const e = error as { data?: { error?: string }; message?: string } | null;
  return e?.data?.error || e?.message || fallback;
}

export const fieldClass =
  'w-full min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:opacity-60 aria-[invalid=true]:border-err aria-[invalid=true]:ring-err/30';

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[0.92em] tabular tracking-tight', className)}>{children}</span>;
}

export function PageHead({ kicker, title, sub, children, large = false }: { kicker: string; title: string; sub: string; children?: ReactNode; large?: boolean }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-2">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{kicker}</p>
        <h1 className={`mt-1 leading-[1.05] font-semibold ${large ? 'text-[36px] md:text-[46px]' : 'text-[28px] md:text-[34px]'}`}>{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{sub}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Card({ title, aside, children, className = '', bodyClassName = '' }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  const titleId = useId();
  return (
    <Surface role="region" aria-labelledby={titleId} className={cn('min-w-0 border-card-border shadow-sm', className)}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3 md:px-5">
        <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className={cn('p-4 md:p-5', bodyClassName)}>{children}</CardContent>
    </Surface>
  );
}

const toneClass: Record<Tone, string> = {
  idle: 'text-idle bg-idle/10 border-idle/25',
  pending: 'text-pending bg-pending/10 border-pending/30',
  busy: 'text-busy bg-busy/10 border-busy/30',
  ok: 'text-ok bg-ok/10 border-ok/30',
  err: 'text-err bg-err/10 border-err/30',
};

export function StatusBadge({ tone, children, pulse, className, ...rest }: { tone: Tone; children: ReactNode; pulse?: boolean; className?: string } & Record<`data-${string}`, string | undefined>) {
  return (
    <span {...rest} className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', toneClass[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', pulse && 'dh-pulse')} aria-hidden="true" />
      {children}
    </span>
  );
}

export function techTone(status: string): Tone {
  return status === 'Available' ? 'ok' : status === 'Busy' ? 'busy' : 'idle';
}

export function TechRow({ tech }: { tech: { id: number; name: string; status: string; zone: string; van_id?: number } }) {
  const available = tech.status === 'Available';
  return (
    <div className="flex items-center justify-between gap-3" data-testid={`technician-${tech.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ${available ? 'border border-ok/35 bg-ok/15 text-ok shadow-[0_0_14px_rgba(34,197,94,0.28)]' : 'bg-secondary'}`}>{initials(tech.name)}</span>
        <div className="min-w-0">
          <div className="truncate font-medium">{tech.name}</div>
          <div className="flex gap-2 text-xs text-muted-foreground"><span>{tech.zone}</span></div>
        </div>
      </div>
      <StatusBadge
        tone={techTone(tech.status)}
        pulse={available || tech.status === 'Busy'}
        className={available ? 'border-ok/40 bg-ok/15 text-ok shadow-[0_0_12px_rgba(34,197,94,0.22)]' : undefined}
      >
        {tech.status}
      </StatusBadge>
    </div>
  );
}

export function PartChips({ parts }: { parts: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((p, i) => (
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/60 px-2 py-1 font-mono text-xs" key={`${p}-${i}`}>
          <Package size={12} className="text-primary" />{p}
        </span>
      ))}
    </div>
  );
}

export function InlineError({ children, onRetry, retrying, retryLabel = 'Retry', testId }: { children: ReactNode; onRetry?: () => void; retrying?: boolean; retryLabel?: string; testId?: string }) {
  return (
    <div role="alert" data-testid={testId} className="flex flex-col gap-2 rounded-lg border border-err/30 bg-err/[0.07] px-3 py-2.5 text-sm text-err sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span className="text-foreground/90">{children}</span></span>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="shrink-0 text-foreground" onClick={onRetry} disabled={retrying}>
          <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Retrying…' : retryLabel}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center" role="status">
      {icon && <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</span>}
      <strong className="font-display text-base">{title}</strong>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${88 - i * 9}%` }} />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function ConfirmAction({ trigger, title, description, confirmLabel, onConfirm, destructive }: {
  trigger: ReactElement; title: string; description: ReactNode; confirmLabel: string; onConfirm: () => void; destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="space-y-2 text-sm text-muted-foreground">{description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={destructive ? 'bg-destructive text-destructive-foreground' : ''} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function IntakeFirst({ text }: { text: string }) {
  return (
    <EmptyState title={text} action={<Button asChild size="sm"><Link href="/intake">Go to repair intake</Link></Button>}>
      Analysis and approval open after a repair intake is submitted.
    </EmptyState>
  );
}
