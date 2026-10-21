import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Boxes, ChevronDown, ClipboardList, History, Inbox, PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, dateTime, type Hub } from './shared';
import StatusRing from './StatusRing';

type MetricKey = 'available' | 'stock' | 'healthy';
type ShortcutKey = 'today' | 'low-stock' | 'reorders';

export default function OverviewPage({ hub }: Hub) {
  const { hubQ, reordersQ, technicians, inventory, availableCount, lowStockCount, openReorderCount, dispatchedToday, activity } = hub;
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const [shortcutDetail, setShortcutDetail] = useState<ShortcutKey | null>(null);
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
  const todayDispatches = activity.filter((entry) =>
    entry.completion_dispatch_id == null &&
    entry.action_details.startsWith('Dispatch approved:') &&
    new Date(entry.timestamp).toDateString() === new Date().toDateString(),
  );
  const lowStockItems = inventory.filter((item) => item.quantity <= 2);
  const openDrafts = reordersQ.data?.reorders.filter((reorder) => reorder.status === 'Draft') ?? [];
  const counts = [
    { key: 'today' as const, to: '/today', label: 'Dispatches today', value: ready ? dispatchedToday : null, foot: 'Approved allocations', Icon: PackageCheck, aria: ready ? `Open today's ${dispatchedToday} dispatches` : 'Open today’s dispatch log', tone: '' },
    { key: 'low-stock' as const, to: '/stock/low', label: 'Low-stock lines', value: ready ? lowStockCount : null, foot: '2 units or fewer', Icon: Boxes, aria: ready ? `Open ${lowStockCount} low-stock lines` : 'Open low-stock inventory', tone: lowStockCount ? 'text-pending' : '' },
    { key: 'reorders' as const, to: '/reorders', label: 'Open reorder drafts', value: reordersQ.data ? openReorderCount : null, foot: 'Separate from van stock', Icon: ClipboardList, aria: reordersQ.data ? `Open ${openReorderCount} reorder drafts` : 'Open reorder drafts', tone: openReorderCount ? 'text-pending' : '' },
  ];

  const shortcutDetails = (key: ShortcutKey) => {
    if (key === 'today') {
      if (hubQ.isLoading && !hubQ.data) return <div className="space-y-2" role="status" aria-label="Loading today's dispatches"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>;
      if (!ready && hubQ.isError) return <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Today's dispatches are unavailable until the hub reconnects.</InlineError>;
      if (!todayDispatches.length) return <p className="text-sm text-muted-foreground">No dispatches recorded today.</p>;
      return (
        <ol className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {todayDispatches.map((entry) => (
            <li key={entry.id} data-testid={`overview-today-dispatch-${entry.id}`} className="flex min-w-0 items-start justify-between gap-3 rounded-md border bg-background/60 px-3 py-2">
              <span className="min-w-0 text-xs leading-relaxed">{entry.action_details}</span>
              <Mono className="shrink-0 text-[10px] text-muted-foreground"><time dateTime={entry.timestamp}>{dateTime(entry.timestamp)}</time></Mono>
            </li>
          ))}
        </ol>
      );
    }
    if (key === 'low-stock') {
      if (hubQ.isLoading && !hubQ.data) return <div className="space-y-2" role="status" aria-label="Loading low-stock items"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>;
      if (!ready && hubQ.isError) return <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Low-stock inventory is unavailable until the hub reconnects.</InlineError>;
      if (!lowStockItems.length) return <p className="text-sm text-muted-foreground">No inventory lines are at or below the low-stock threshold.</p>;
      return (
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {lowStockItems.map((item) => (
            <li key={item.id} data-testid={`overview-low-stock-${item.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2">
              <span className="min-w-0 truncate text-xs">Van {item.van_id} · {item.part_name}</span>
              <span className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular ${item.quantity === 0 ? 'bg-err/10 text-err' : 'bg-pending/10 text-pending'}`}>
                {item.quantity} on hand
              </span>
            </li>
          ))}
        </ul>
      );
    }
    if (reordersQ.isLoading && !reordersQ.data) {
      return <div className="space-y-2" role="status" aria-label="Loading reorder drafts"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>;
    }
    if (reordersQ.isError && !reordersQ.data) {
      return <InlineError onRetry={() => void reordersQ.refetch()} retrying={reordersQ.isFetching}>Reorder drafts could not be loaded.</InlineError>;
    }
    if (!openDrafts.length) return <p className="text-sm text-muted-foreground">No open reorder drafts.</p>;
    return (
      <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {openDrafts.map((reorder) => (
          <li key={reorder.id} data-testid={`overview-reorder-draft-${reorder.id}`} className="flex min-w-0 items-start justify-between gap-3 rounded-md border bg-background/60 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{reorder.part_name} · Van {reorder.van_id}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{reorder.supplier_name} · {reorder.requested_quantity} requested</span>
            </span>
            <Mono className="shrink-0 text-[10px] text-muted-foreground">#{reorder.id}</Mono>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-5">
      <PageHead kicker="Workshop · dispatch overview" title="Welcome John Doe." sub="Technician availability and van readiness before a repair leaves the desk.">
      <Button asChild><Link href="/intake"><Inbox size={15} /> Open customer conversations <ArrowRight size={14} /></Link></Button>
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Readiness at a glance" aside={<StatusBadge tone={!ready ? 'pending' : hubQ.isError ? 'err' : 'ok'}>{!ready ? 'Awaiting data' : hubQ.isError ? 'Last received data' : 'Current'}</StatusBadge>}>
          <div
            className={`mx-auto grid w-full gap-2 transition-[max-width,grid-template-columns] duration-500 ease-out motion-reduce:transition-none ${
              detail ? 'max-w-4xl grid-cols-1 sm:grid-cols-2' : 'max-w-3xl grid-cols-1 sm:grid-cols-3'
            }`}
            data-testid="overview-status-rings"
            aria-busy={hubQ.isLoading}
          >
            {metrics.map(({ key, ...metric }) => {
              const expanded = detail === key;
              const compact = detail !== null && !expanded;
              return (
                <div key={key} data-testid={`overview-metric-card-${key}`}
                  className={`min-w-0 transition-[padding,border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none ${
                    expanded ? 'order-first rounded-xl border border-primary/30 bg-muted/30 p-2.5 shadow-sm sm:col-span-2 sm:p-4' : compact ? 'order-last' : ''
                  }`}>
                  <div className={expanded ? 'grid gap-3 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:items-center' : ''}>
                    <StatusRing {...metric} ready={ready} expanded={expanded} compact={compact}
                      onClick={() => setDetail(expanded ? null : key)}
                      buttonRef={(n) => { triggers.current[key] = n; }} />
                    {expanded && (
                      <div id="hub-readiness-detail" role="region" aria-labelledby="hub-readiness-detail-title" aria-live="polite"
                        className="dh-rise min-w-0 rounded-lg border bg-card p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 id="hub-readiness-detail-title" className="text-sm font-semibold">{metric.title}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">{metric.criteria}</p>
                          </div>
                          <Button type="button" size="icon" variant="ghost" aria-label={`Close ${metric.label} details`}
                            onClick={() => { triggers.current[key]?.focus(); setDetail(null); }}>
                            <X size={15} />
                          </Button>
                        </div>
                        <div className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                          {metric.lines.map((line) => <span key={line} className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs">{line}</span>)}
                          {!metric.lines.length && <span className="text-xs text-muted-foreground">No records match this measure.</span>}
                        </div>
                        <Link href={metric.to} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                          Open {key === 'available' ? 'technicians' : 'van stock'} <ArrowRight size={13} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className={`grid gap-3 ${shortcutDetail ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} lg:grid-cols-1`}>
          {counts.map(({ key, to, label, value, foot, Icon, aria, tone }) => {
            const expanded = shortcutDetail === key;
            const compact = shortcutDetail !== null && !expanded;
            const detailId = `overview-shortcut-detail-${key}`;
            return (
              <section key={key} aria-label={label}
                data-testid={`overview-shortcut-${key}`}
                className={`min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-[padding,border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none ${
                  expanded ? 'border-primary/30 p-4 shadow-md sm:p-5' : compact ? 'border-card-border p-2.5' : 'border-card-border p-3 sm:p-4'
                }`}>
                <button type="button" aria-expanded={expanded} aria-controls={detailId}
                  aria-label={`${expanded ? 'Hide' : 'View'} details for ${label}`}
                  data-testid={`button-view-details-${key}`}
                  onClick={() => setShortcutDetail(expanded ? null : key)}
                  className="group flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md text-left transition-colors hover:text-primary focus-visible:outline-none">
                  <span className={`min-w-0 transition-all duration-500 ease-out motion-reduce:transition-none ${compact ? 'flex items-center gap-3' : 'flex flex-col gap-1'}`}>
                    <span className={`flex min-w-0 items-center gap-1.5 font-medium transition-[font-size,line-height] duration-500 ease-out motion-reduce:transition-none ${
                      expanded ? 'text-base' : compact ? 'text-xs' : 'text-xs sm:text-[11px] lg:text-sm'
                    }`}>
                      <Icon size={expanded ? 18 : 15} className="shrink-0 transition-all duration-500 ease-out motion-reduce:transition-none" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className={`flex flex-wrap items-baseline gap-x-2 transition-all duration-500 ease-out motion-reduce:transition-none ${compact ? 'gap-y-0' : 'gap-y-0.5'}`}>
                      {value == null
                        ? <Skeleton className={`w-9 ${expanded ? 'h-10' : 'h-7'}`} />
                        : <span className={`font-mono font-semibold tabular transition-[font-size,line-height] duration-500 ease-out motion-reduce:transition-none ${
                          expanded ? 'text-4xl leading-none' : compact ? 'text-xl leading-none' : 'text-2xl leading-none'
                        } ${tone}`}>{value}</span>}
                      <span className={`text-muted-foreground transition-[font-size,line-height] duration-500 ease-out motion-reduce:transition-none ${
                        expanded ? 'text-sm' : compact ? 'text-[10px]' : 'text-[11px] sm:text-[10px] lg:text-xs'
                      }`}>{foot}</span>
                    </span>
                  </span>
                  <span className={`flex shrink-0 items-center justify-center gap-1 rounded-lg bg-secondary text-muted-foreground transition-all duration-500 ease-out motion-reduce:transition-none ${
                    expanded ? 'h-10 min-w-10 px-2 text-primary' : compact ? 'h-8 min-w-8 px-1' : 'h-9 min-w-9 px-1 group-hover:translate-x-0.5'
                  }`}>
                    <span className="hidden text-[10px] font-medium max-sm:inline lg:inline">{expanded ? 'Hide' : 'View details'}</span>
                    <ChevronDown size={expanded ? 17 : 14} className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                <div id={detailId} aria-hidden={!expanded} aria-live={expanded ? 'polite' : 'off'}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                    expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}>
                  <div className="min-h-0 overflow-hidden">
                    <div role="region" aria-label={`${label} details`} className="mt-3 space-y-3 border-t border-card-border pt-3">
                      {shortcutDetails(key)}
                    </div>
                  </div>
                </div>
                <div className={`transition-[padding,margin] duration-300 ease-out motion-reduce:transition-none ${expanded ? 'mt-3 border-t border-card-border pt-2' : 'mt-1'}`}>
                  <Link href={to} aria-label={aria}
                    data-testid={`link-open-overview-${key}`}
                    className={`inline-flex min-h-8 items-center gap-1 rounded-sm font-medium text-primary transition-[font-size] duration-300 hover:underline focus-visible:outline-none motion-reduce:transition-none ${
                      expanded ? 'text-xs' : compact ? 'text-[10px]' : 'text-[11px]'
                    }`}>
                    Open full page <ArrowRight size={12} />
                  </Link>
                </div>
              </section>
            );
          })}
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
