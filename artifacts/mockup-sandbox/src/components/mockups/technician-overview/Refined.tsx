import './_group.css';
import { Activity, ArrowUpRight, Star } from 'lucide-react';
import { Card as Surface, CardContent, CardHeader } from '@/components/ui/card';
import type { ReactNode } from 'react';

const activeJobs = [
  { number: '#246', site: 'Demo customer · Puchong', parts: '100uF Capacitor, NPN Transistor' },
  { number: '#245', site: 'Demo customer · Petaling Jaya', parts: 'AC filter, Drain hose' },
  { number: '#243', site: 'Demo customer · Shah Alam', parts: 'LED bulb' },
];

function Panel({ title, aside, children, className = '' }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Surface role="region" className={`min-w-0 overflow-hidden border-card-border bg-card shadow-[0_10px_30px_-24px_hsl(var(--foreground)/.35)] ${className}`}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border/80 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Surface>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} className={i < n ? 'fill-current text-pending' : 'text-muted-foreground/30'} aria-hidden="true" />
      ))}
    </span>
  );
}

function SampleBadge() {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-pending/30 bg-pending/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-pending"><span className="h-1.5 w-1.5 rounded-full bg-current" />Illustrative only</span>;
}

export function Refined() {
  return (
    <main className="dispatch-conversation min-h-[100dvh] space-y-5 p-4 sm:space-y-6 sm:p-6">
      <header className="relative overflow-hidden rounded-2xl border border-card-border bg-card/70 px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Your day <span className="px-1.5 text-muted-foreground/50">/</span> Technician overview</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold leading-none tracking-tight sm:text-[40px]">Hello, Amir</h1>
            <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">Your active jobs, sample record and the vans available to take out.</p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.85fr)]">
        <Panel title={<><Activity size={15} className="text-primary" />Active jobs</>} aside={<span className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-foreground">03</span>}>
          <ul className="divide-y divide-card-border/70">
            {activeJobs.map((job) => (
              <li key={job.number} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5"><span className="font-mono text-primary">{job.number}</span><span className="mx-1.5 text-muted-foreground/50">·</span>{job.site}</p>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground/65">Parts</span><span className="mx-1.5 text-muted-foreground/40">/</span>{job.parts}</p>
                  </div>
                </div>
                <button type="button" disabled className="mt-2.5 min-h-8 cursor-not-allowed rounded-md border border-card-border bg-background/70 px-2.5 text-xs font-medium text-muted-foreground/80 opacity-80" aria-label={`Complete job ${job.number} (illustrative)`}>Complete job</button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={<><Star size={15} className="fill-pending/20 text-pending" />Sample record</>} aside={<SampleBadge />} className="self-start">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" data-testid="technician-sample-record">
            <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-primary/15 bg-primary/[0.045] p-3 sm:p-3.5">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] font-medium leading-4 text-muted-foreground">Completed<br className="sm:hidden" /> jobs</span>
                <ArrowUpRight size={13} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
              </div>
              <span className="font-mono text-[28px] font-semibold leading-none tabular tracking-tight">76</span>
            </div>
            <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-pending/20 bg-pending/[0.045] p-3 sm:p-3.5">
              <span className="text-[11px] font-medium leading-4 text-muted-foreground">Sample rating</span>
              <div className="space-y-1.5">
                <Stars n={5} />
                <p className="font-mono text-xl font-semibold leading-none tabular">4.8<span className="ml-1 text-xs font-medium text-muted-foreground">/5</span></p>
              </div>
            </div>
          </div>
          <p className="mt-3 border-t border-card-border/70 pt-2.5 text-[10px] leading-4 text-muted-foreground">Illustrative technician sample data</p>
        </Panel>
      </div>
    </main>
  );
}
