import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Boxes, CheckCircle2, History, LockKeyhole, RotateCcw, Users } from 'lucide-react';
import type { Activity, Technician } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, ConfirmAction, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, TechRow, dateTime, initials, techTone, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { LevelBadge, ratingText } from './techMeta';
import { WorkBadges } from './ServiceHistory';
import { DataTable, FilterChips, type Column } from './DataTable';
const TechnicianFilters = FilterChips<'all' | 'Available' | 'Busy'>;
const EventFilters = FilterChips<'all' | 'Approved' | 'Completed' | 'Reset' | 'Response' | 'Acknowledged'>;

export function TechniciansPage({ hub }: Hub) {
  const { technicians, availableCount, hubQ, activity, writePending } = hub;
  const [status, setStatus] = useState<'all' | 'Available' | 'Busy'>('all');
  const rows = status === 'all' ? technicians : technicians.filter((t) => t.status === status);
  const jobsFor = (t: Technician) => activity.filter((e) => e.dispatch?.tech_id === t.id && e.dispatch.status === 'Active');

  const actions = (t: Technician) => {
    const jobs = jobsFor(t);
    return (
      <div className="flex flex-col items-start gap-1.5">
        {jobs.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Active <Mono>#{e.id}</Mono> · {e.dispatch!.customer_site.label}</span>
            <CompletionControl entry={e} hub={hub} />
          </div>
        ))}
        {t.status === 'Busy' && !jobs.length && (
          <ConfirmAction
            title={`Set ${t.name} to Available?`}
            description={<><p>This will not complete an old job or restore any parts.</p><p>Dispatch history and stock remain unchanged.</p></>}
            confirmLabel="Reset to Available"
            onConfirm={() => void hub.resetTechnician(t.id)}
            trigger={
              <Button type="button" size="sm" variant="outline" data-testid={`reset-technician-${t.id}`} disabled={writePending || hub.connectionLost}>
                <RotateCcw size={12} /> {hub.reset.isPending && hub.reset.variables?.data.technician_id === t.id ? 'Resetting…' : 'Reset to Available'}
              </Button>
            }
          />
        )}
        {t.status === 'Available' && <span className="text-xs text-muted-foreground">No active job</span>}
      </div>
    );
  };

  const columns: Column<Technician>[] = [
    { key: 'name', header: 'Technician', sort: (t) => t.name, cell: (t) => {
      const available = t.status === 'Available';
      return (
        <span className="flex items-center gap-2" data-testid={`technician-${t.id}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] ${available ? 'border border-ok/35 bg-ok/15 text-ok shadow-[0_0_14px_rgba(34,197,94,0.28)]' : 'bg-secondary'}`}>
            {initials(t.name)}
          </span>
          <span className="font-medium">{t.name}</span>
        </span>
      );
    } },
    { key: 'status', header: 'Status', sort: (t) => t.status, cell: (t) => (
      <StatusBadge
        tone={techTone(t.status)}
        pulse={t.status === 'Available' || t.status === 'Busy'}
        className={t.status === 'Available' ? 'border-ok/40 bg-ok/15 text-ok shadow-[0_0_12px_rgba(34,197,94,0.22)]' : undefined}
      >
        {t.status}
      </StatusBadge>
    ) },
    { key: 'level', header: 'Level', sort: (t) => t.level ?? 1, cell: (t) => <LevelBadge tech={t} /> },
    { key: 'rating', header: 'Rating · jobs', sort: (t) => t.rating ?? 0, cell: (t) => <span className="whitespace-nowrap text-xs">★ <Mono>{ratingText(t)}</Mono> · <Mono>{t.demo_completed_jobs ?? 0}</Mono> <span className="text-muted-foreground">demo</span></span> },
    { key: 'actions', header: 'Assignment', cell: actions },
  ];

  return (
    <div className="space-y-5">
      <PageHead kicker="Team" title="Technicians" sub="Level and status. Vans are shared and allocated per job. Ratings and job counts are demo data; positions are samples." />
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      {hub.resetError && <InlineError>{hub.resetError}</InlineError>}
      <Card title={<><Users size={15} /> All technicians</>} aside={<Mono>{availableCount}/{technicians.length} available</Mono>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Technician data unavailable.</InlineError> : (
          <DataTable caption="Technicians" rows={rows} columns={columns} rowKey={(t) => t.id} loading={hubQ.isLoading}
             searchText={(t) => t.name} searchLabel="Filter by technician name"
            initialSort={{ key: 'name', dir: 'asc' }}
            toolbar={<TechnicianFilters label="Status filter" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'Available', label: 'Available' }, { value: 'Busy', label: 'Busy' }]} />}
            empty={<EmptyState icon={<Users size={16} />} title="No technicians match">Try another filter.</EmptyState>}
            mobile={(t) => <div className="space-y-2 rounded-lg border p-3"><TechRow tech={t} /><LevelBadge tech={t} />{actions(t)}</div>}
          />
        )}
      </Card>
    </div>
  );
}

export function StockPage({ hub, lowOnly = false }: Hub & { lowOnly?: boolean }) {
  const { inventory, technicians, hubQ } = hub;
  const [van, setVan] = useState<number | null>(null);
  const vans = useMemo(() => [...new Set(inventory.map((i) => i.van_id))].sort((a, b) => a - b).slice(0, 3), [inventory]);
  const lines = (v: number) => inventory.filter((i) => i.van_id === v && (!lowOnly || i.quantity < 5)).sort((a, b) => a.part_name.localeCompare(b.part_name));
  const active = van != null && vans.includes(van) ? van : null;
  const owner = (v: number) => technicians.filter((t) => t.van_id === v).map((t) => t.name).join(', ');
  return (
    <div className="space-y-5">
      <PageHead kicker="Inventory" title={lowOnly ? 'Low-stock lines' : 'Van stock'} sub={lowOnly ? 'Items strictly below five units.' : 'Pick a van to see every part on board.'}>
        {lowOnly ? <Button asChild variant="outline"><Link href="/stock">All stock</Link></Button>
          : <Button asChild variant="outline"><Link href="/stock/low">Low stock only</Link></Button>}
      </PageHead>
      <Card title={<><Boxes size={15} /> {lowOnly ? 'Low-stock lines' : 'Vans'}</>} aside={<Mono>{vans.length} vans</Mono>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Inventory data unavailable.</InlineError>
          : hubQ.isLoading ? <SkeletonRows rows={3} label="Loading vans" />
          : vans.length === 0 ? <EmptyState icon={<Boxes size={16} />} title="No stock items found">Van stock appears when the hub has data.</EmptyState> : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Choose a van">
              {vans.map((v) => {
                const all = inventory.filter((i) => i.van_id === v);
                const low = all.filter((i) => i.quantity < 5).length;
                const on = active === v;
                return (
                  <button key={v} type="button" aria-pressed={on} onClick={() => setVan(on ? null : v)} data-testid={`van-card-${v}`}
                    className={`rounded-xl border p-4 text-left transition-[border-color,background-color] duration-200 motion-reduce:transition-none ${on ? 'border-primary/50 bg-accent/60' : 'border-card-border bg-card hover:border-primary/30'}`}>
                    <span className="flex items-center justify-between"><span className="font-display text-lg font-semibold">Van {v}</span>{low > 0 && <StatusBadge tone="pending">{low} low</StatusBadge>}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{owner(v) || 'Unassigned'}</span>
                    <Mono className="mt-2 block text-xs text-muted-foreground">{all.length} parts · {all.reduce((s, i) => s + i.quantity, 0)} units</Mono>
                  </button>
                );
              })}
            </div>
            {active == null ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Select a van to list its parts and quantities.</p> : (
              <div className="dh-rise" data-testid={`van-parts-${active}`}>
                {lines(active).length === 0 ? <EmptyState icon={<Boxes size={16} />} title={lowOnly ? 'No low-stock lines in this van' : 'No parts in this van'}>{lowOnly ? 'Every line has five units or more.' : 'Nothing is recorded for this van.'}</EmptyState> : (
                  <ul className="divide-y rounded-lg border">
                    {lines(active).map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm" data-testid={lowOnly ? `low-stock-${i.id}` : undefined}>
                        <span className="min-w-0 flex-1">{i.part_name}</span>
                        <span data-testid={`text-qty-${i.id}`} className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 font-mono font-semibold tabular ${i.quantity < 5 ? 'bg-pending/12 text-pending' : ''}`}>{i.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Amber quantities are below 5 units.</p>
      </Card>
    </div>
  );
}

type Kind = 'all' | 'Approved' | 'Completed' | 'Reset' | 'Response' | 'Acknowledged';
const kindOf = (e: Activity): Exclude<Kind, 'all'> =>
  e.action_details.startsWith('Technician response:') ? 'Response'
    : e.action_details.startsWith('Dispatched conversation acknowledged:') ? 'Acknowledged'
      : e.completion_dispatch_id != null ? 'Completed'
        : e.action_details.startsWith('Technician availability reset:') ? 'Reset' : 'Approved';
const kindTone = { Approved: 'busy', Completed: 'ok', Reset: 'idle', Response: 'pending', Acknowledged: 'idle' } as const;
const toneForEvent = (e: Activity) => kindOf(e) === 'Response'
  ? (e.action_details.toLowerCase().includes('rejected') ? 'err' : 'ok')
  : kindTone[kindOf(e)];

export function LogPage({ hub, notice, todayOnly = false }: Hub & { notice: string; todayOnly?: boolean }) {
  const { activity, hubQ } = hub;
  const [kind, setKind] = useState<Kind>('all');
  const sourceConversationId = (entry: Activity) => {
    const linked = entry.dispatch?.conversation_id ?? (entry.completion_dispatch_id != null
      ? activity.find((candidate) => candidate.id === entry.completion_dispatch_id)?.dispatch?.conversation_id
      : null);
    if (linked != null) return linked;
    const acknowledged = entry.action_details.match(/Conversation #(\d+)/i);
    return acknowledged ? Number(acknowledged[1]) : null;
  };
  const base = todayOnly
    ? activity.filter((e) => e.completion_dispatch_id == null && e.action_details.startsWith('Dispatch approved:') && new Date(e.timestamp).toDateString() === new Date().toDateString())
    : activity;
  const rows = kind === 'all' ? base : base.filter((e) => kindOf(e) === kind);
  const columns: Column<Activity>[] = [
    { key: 'id', header: 'ID', sort: (e) => e.id, cell: (e) => <Mono>#{e.id}</Mono> },
    { key: 'time', header: 'Time', sort: (e) => new Date(e.timestamp).getTime(), cell: (e) => <Mono className="whitespace-nowrap text-xs"><time dateTime={e.timestamp}>{dateTime(e.timestamp)}</time></Mono> },
    { key: 'kind', header: 'Event', sort: (e) => kindOf(e), cell: (e) => <StatusBadge tone={toneForEvent(e)}>{kindOf(e)}</StatusBadge> },
    { key: 'details', header: 'Details', cell: (e) => <span className="block min-w-56">{e.action_details}</span> },
    { key: 'source', header: 'Source chat', cell: (e) => {
      const conversationId = sourceConversationId(e);
      return conversationId != null
        ? <Link href={`/analysis/${conversationId}`} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary">Chat <Mono>#{conversationId}</Mono></Link>
        : <span className="text-muted-foreground">—</span>;
    } },
    { key: 'by', header: 'By', sort: (e) => e.approved_by, cell: (e) => <span className="whitespace-nowrap text-xs">{e.approved_by}</span> },
  ];
  return (
    <div className="space-y-5">
      <PageHead kicker={todayOnly ? 'Today' : 'Service'} title={todayOnly ? "Today's dispatches" : 'Service History'} sub={todayOnly ? 'Approved allocations recorded today.' : 'Technician work samples and dispatch records.'}>
        <Button asChild variant="outline"><Link href={todayOnly ? '/log' : '/today'}>{todayOnly ? 'Full log' : 'Today only'}</Link></Button>
      </PageHead>
      {notice && <div className="dh-rise flex items-center gap-2 rounded-lg border border-ok/30 bg-ok/[0.08] px-4 py-2.5 text-sm" role="status" data-testid="status-dispatch-success"><CheckCircle2 size={15} className="text-ok" /> {notice}</div>}
      {!todayOnly && <WorkBadges technicians={hub.technicians} />}
      <Card title={<><History size={15} /> Dispatch audit log</>} aside={<span className="inline-flex items-center gap-1"><LockKeyhole size={11} /> Immutable record</span>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Dispatch history unavailable until the hub reconnects.</InlineError> : (
          <DataTable caption="Dispatch log" rows={rows} columns={columns} rowKey={(e) => e.id} loading={hubQ.isLoading}
            initialSort={{ key: 'id', dir: 'desc' }} searchText={(e) => `${e.id} ${e.action_details} ${e.approved_by}`} searchLabel="Search log"
             toolbar={!todayOnly && <EventFilters label="Event filter" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'Approved', label: 'Approved' }, { value: 'Completed', label: 'Completed' }, { value: 'Reset', label: 'Reset' }, { value: 'Response', label: 'Technician response' }, { value: 'Acknowledged', label: 'Acknowledged' }]} />}
            empty={<EmptyState icon={<History size={16} />} title={todayOnly ? 'No dispatches recorded today' : 'No dispatches yet'}>Approved allocations will appear here.</EmptyState>}
            mobile={(e) => (
              <div className="space-y-1.5 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2"><StatusBadge tone={toneForEvent(e)}>{kindOf(e)}</StatusBadge><Mono className="text-xs text-muted-foreground">#{e.id} · {dateTime(e.timestamp)}</Mono></div>
                <p className="text-sm">{e.action_details}</p>
                {sourceConversationId(e) != null && <Link href={`/analysis/${sourceConversationId(e)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary">Open source chat <Mono>#{sourceConversationId(e)}</Mono></Link>}
                <p className="text-xs text-muted-foreground">By {e.approved_by}</p>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}
