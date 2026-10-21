import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Boxes, ClipboardList, History, Inbox, PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, dateTime, type Hub } from './shared';
import StatusRing from './StatusRing';

type MetricKey = 'available' | 'stock' | 'healthy';

export default function OverviewPage({ hub }: Hub) {
  const { hubQ, reordersQ, technicians, inventory, availableCount, lowStockCount, openReorderCount, dispatchedToday, activity, analysis } = hub;
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const triggers = useRef<Partial<Record<MetricKey, HTMLButtonElement | null>>>({});
  const ready = !!hubQ.data;
  const positiveStock = inventory.filter((l) => l.quantity > 0);
  const healthyStock = inventory.filter((l) => l.quantity > 2);
  const latest = activity.slice(0, 5);
  const describe = (l: (typeof inventory)[number]) => `Van ${l.van_id} · ${l.part_name} · ${l.quantity} on hand`;
  const metrics = [
    { key: 'available' as const, label: 'Available', criteria: 'Available / all technicians', numerator: availableCount, denominator: technicians.length, colorClass: 'text-idle', title: 'Technician roster', lines: technicians.map((t) => `${t.name} · ${t.status} · ${t.zone}`), to: '/technicians' },
    { key: 'stock' as const, label: 'Stock on hand', criteria: 'Positive lines / all lines', numerator: positiveStock.length, denominator: inventory.length, colorClass: 'text-ok', title: 'Stock-positive inventory lines', lines: positiveStock.map(describe), to: '/stock' },
    { key: 'healthy' as const, label: 'Above threshold', criteria: 'More than 2 / all lines', numerator: healthyStock.length, denominator: inventory.length, colorClass: 'text-primary', title: 'Above the low-stock threshold', lines: healthyStock.map(describe), to: '/stock' },
  ];
  const selected = metrics.find((m) => m.key === detail);
  const counts = [
    { to: '/today', label: 'Dispatches today', value: ready ? dispatchedToday : null, foot: 'Approved allocations', Icon: PackageCheck, aria: ready ? `View today's ${dispatchedToday} dispatches` : 'Open today’s dispatch log', tone: '' },
    { to: '/stock/low', label: 'Low-stock lines', value: ready ? lowStockCount : null, foot: '2 units or fewer', Icon: Boxes, aria: ready ? `Review ${lowStockCount} low-stock lines` : 'Open low-stock inventory', tone: lowStockCount ? 'text-pending' : '' },
    { to: '/reorders', label: 'Open reorder drafts', value: reordersQ.data ? openReorderCount : null, foot: 'Separate from van stock', Icon: ClipboardList, aria: reordersQ.data ? `Review ${openReorderCount} open reorder drafts` : 'Open reorder drafts', tone: openReorderCount ? 'text-pending' : '' },
  ];

  return (
    <div className="space-y-5">
      <PageHead kicker="Workshop · dispatch overview" title="Welcome John Doe." sub="Technician availability and van readiness before a repair leaves the desk.">
        <Button asChild><Link href="/intake"><Inbox size={15} /> Start repair intake <ArrowRight size={14} /></Link></Button>
      </PageHead>

      {analysis && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-pending/30 bg-pending/[0.07] px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2"><StatusBadge tone="pending">Draft</StatusBadge> A repair intake is ready for review.</span>
          <Link href="/analysis" className="inline-flex items-center gap-1 font-medium text-primary">Continue to analysis <ArrowRight size={13} /></Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Readiness at a glance" aside={<StatusBadge tone={!ready ? 'pending' : hubQ.isError ? 'err' : 'ok'}>{!ready ? 'Awaiting data' : hubQ.isError ? 'Last received data' : 'Current'}</StatusBadge>}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="overview-status-rings" aria-busy={hubQ.isLoading}>
            {metrics.map((m) => (
              <StatusRing {...m} key={m.key} ready={ready} expanded={detail === m.key}
                onClick={() => setDetail(detail === m.key ? null : m.key)}
                buttonRef={(n) => { triggers.current[m.key] = n; }} />
            ))}
          </div>
          {selected && (
            <div id="hub-readiness-detail" aria-live="polite" className="dh-rise mt-4 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{selected.title}</h3>
                <Button type="button" size="icon" variant="ghost" aria-label="Close readiness detail" onClick={() => { triggers.current[selected.key]?.focus(); setDetail(null); }}><X size={15} /></Button>
              </div>
              <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {selected.lines.map((l) => <span key={l} className="rounded-md border bg-card px-2 py-1 font-mono text-xs">{l}</span>)}
                {!selected.lines.length && <span className="text-xs text-muted-foreground">No records match this measure.</span>}
              </div>
              <Link href={selected.to} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Open {selected.key === 'available' ? 'technicians' : 'van stock'} <ArrowRight size={13} /></Link>
            </div>
          )}
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {counts.map(({ to, label, value, foot, Icon, aria, tone }) => (
            <Link key={to} href={to} aria-label={aria} className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{label}</div>
                {value == null ? <Skeleton className="mt-1 h-8 w-10" /> : <div className={`font-mono text-3xl font-semibold tabular ${tone}`}>{value}</div>}
                <div className="text-xs text-muted-foreground">{foot}</div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-transform group-hover:translate-x-0.5"><Icon size={16} /></span>
            </Link>
          ))}
        </div>
      </div>

      <Card title={<><History size={15} /> Recent dispatch activity</>} aside={<Link href="/log" className="inline-flex items-center gap-1 font-medium text-primary">Open dispatch log <ArrowRight size={12} /></Link>}>
        {hubQ.isLoading ? <div className="space-y-2" role="status" aria-label="Loading activity">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          : !ready && hubQ.isError ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Dispatch history unavailable until the hub reconnects.</InlineError>
          : latest.length ? (
            <ol className="divide-y">
              {latest.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <StatusBadge tone={e.completion_dispatch_id != null ? 'ok' : e.action_details.startsWith('Technician availability reset:') ? 'idle' : 'busy'}>
                    {e.completion_dispatch_id != null ? 'Completed' : e.action_details.startsWith('Technician availability reset:') ? 'Reset' : 'Approved'}
                  </StatusBadge>
                  <span className="min-w-0 flex-1 truncate text-sm" title={e.action_details}>{e.action_details}</span>
                  <Mono className="text-xs text-muted-foreground"><time dateTime={e.timestamp}>{dateTime(e.timestamp)}</time></Mono>
                </li>
              ))}
            </ol>
          ) : <EmptyState icon={<History size={17} />} title="No dispatches recorded yet">Approved allocations will appear here after a dispatch.</EmptyState>}
      </Card>
    </div>
  );
}
