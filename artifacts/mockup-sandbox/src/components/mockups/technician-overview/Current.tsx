import './_group.css';
import { Activity, Star } from 'lucide-react';
import { Card as Surface, CardContent, CardHeader } from '@/components/ui/card';

function Card({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Surface role="region" className="min-w-0 border-card-border shadow-sm">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-4 md:p-5">{children}</CardContent>
    </Surface>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-current text-pending' : 'text-muted-foreground/35'} aria-hidden="true" />)}</span>;
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-pending/30 bg-pending/10 px-2 py-0.5 text-[11px] font-medium text-pending"><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

export function Current() {
  return (
    <main className="dispatch-conversation min-h-screen space-y-5 p-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Your day</p>
        <h1 className="mt-1 text-4xl font-semibold">Hello, Amir</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your active jobs, sample record and the vans available to take out.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<><Activity size={15} /> Active jobs</>} aside={<span className="font-mono">3</span>}>
          <ul className="divide-y">
            {[
              ['#246', 'Demo customer · Puchong', '100uF Capacitor, NPN Transistor'],
              ['#245', 'Demo customer · Petaling Jaya', 'AC filter, Drain hose'],
              ['#243', 'Demo customer · Shah Alam', 'LED bulb'],
            ].map(([number, site, parts]) => <li key={number} className="space-y-1.5 py-3 text-sm"><p><span className="font-mono">{number}</span> · {site}</p><p className="text-xs text-muted-foreground">Parts: {parts}</p><button className="min-h-8 rounded-md border px-2.5 text-xs">Complete job</button></li>)}
          </ul>
        </Card>
        <Card title={<><Star size={15} /> Sample record</>} aside={<StatusBadge>Illustrative only</StatusBadge>}>
          <dl className="grid gap-2 text-sm [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]">
            <div className="min-w-0 rounded-xl border border-primary/15 bg-primary/[0.045] p-3">
              <dt className="text-[11px] font-medium text-muted-foreground">Completed jobs</dt>
              <dd className="mt-2 font-mono text-2xl font-semibold tabular">76</dd>
            </div>
            <div className="min-w-0 rounded-xl border border-amber-500/20 bg-amber-500/[0.045] p-3">
              <dt className="text-[11px] font-medium text-muted-foreground">Sample rating</dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2">
                <Stars n={5} />
                <span className="font-mono text-lg font-semibold tabular">4.8<span className="text-sm text-muted-foreground">/5</span></span>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </main>
  );
}
