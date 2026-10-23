import { useState } from 'react';
import { Boxes, ChevronDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, type Hub } from './shared';
import { RestockSuggestion } from './RestockSuggestion';
import { ANALYTICS_YEARS, MONTHS } from './workshopAnalytics';
import { cn } from '@/lib/utils';

export default function TransportPage({ hub }: Hub) {
  const { hubQ, inventory } = hub;
  const vans = hubQ.data?.vans ?? [];
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [year, setYear] = useState<number>(ANALYTICS_YEARS[ANALYTICS_YEARS.length - 1]);
  const [month, setMonth] = useState(1);
  const free = vans.filter((v) => v.status === 'Available').length;
  return (
    <div className="space-y-5">
      <PageHead kicker="Fleet" title="Transport" sub="Five shared vans. A free van is allocated to a technician when a job is approved, then released on completion.">
        <Button type="button" variant={lowOnly ? 'default' : 'outline'} aria-pressed={lowOnly} onClick={() => setLowOnly((v) => !v)} data-testid="button-low-stock-only">{lowOnly ? 'Show all stock' : 'Low stock only'}</Button>
      </PageHead>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <span className="text-sm font-medium">Restock planning period</span>
        <label className="text-xs">Year <select aria-label="Restock sample year" className="ml-1 rounded-md border bg-background p-2" value={year} onChange={(e) => setYear(Number(e.target.value))}>{ANALYTICS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        <label className="text-xs">Month <select aria-label="Restock sample month" className="ml-1 rounded-md border bg-background p-2" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
      </div>
      <Card title={<><Truck size={15} /> Shared vans</>} aside={<Mono>{free}/{vans.length} free</Mono>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Transport data unavailable.</InlineError>
          : hubQ.isLoading ? <SkeletonRows rows={5} label="Loading vans" />
          : !vans.length ? <EmptyState icon={<Truck size={16} />} title="No vans reported">Vans appear when the hub has transport data.</EmptyState> : (
          <ul className="space-y-2" data-testid="transport-vans">
            {vans.map((v) => {
              const busy = v.status === 'Busy';
              const on = open === v.id;
              const lines = inventory.filter((i) => i.van_id === v.id && (!lowOnly || i.quantity < 5)).sort((a, b) => a.part_name.localeCompare(b.part_name));
              return (
                <li key={v.id} data-testid={`van-row-${v.id}`} className={cn('rounded-xl border transition-colors', busy ? 'border-err/25 bg-err/[0.06]' : 'border-card-border bg-card')}>
                  <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : v.id)} data-testid={`van-card-${v.id}`}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold">{v.name}</span>
                      <Mono className="text-xs text-muted-foreground">{v.plate}</Mono>
                    </span>
                    {busy
                      ? <span className="text-xs"><StatusBadge tone="err">Busy</StatusBadge> <span className="ml-1 font-medium">{v.technician_name ?? 'Assigned technician'}</span>{v.dispatch_id != null && <Mono className="ml-1 text-muted-foreground">#{v.dispatch_id}</Mono>}</span>
                      : <StatusBadge tone="ok" pulse>Free</StatusBadge>}
                    <ChevronDown size={16} className={cn('text-muted-foreground transition-transform', on && 'rotate-180')} />
                  </button>
                  {on && (
                    <div className="dh-rise border-t px-4 py-3" data-testid={`van-parts-${v.id}`}>
                      {lines.length === 0 ? <EmptyState icon={<Boxes size={16} />} title={lowOnly ? 'No low-stock lines' : 'No parts recorded'}>{lowOnly ? 'Every line here has five units or more.' : 'Nothing is stocked in this van.'}</EmptyState> : (
                        <ul className="divide-y">
                          {lines.map((i) => (
                            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                              <span className="min-w-0 flex-1">{i.part_name}</span>
                              <span data-testid={`text-qty-${i.id}`} className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 font-mono font-semibold tabular ${i.quantity < 5 ? 'bg-pending/10 text-pending' : ''}`}>{i.quantity}</span>
                              {i.quantity < 5 && <RestockSuggestion item={i} inventory={inventory} year={year} month={month} stale={hubQ.isError} />}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Amber quantities are below 5 units. Vans are shared; none belongs to a technician.</p>
      </Card>
    </div>
  );
}
