import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Boxes, CheckCircle2, History, LockKeyhole, RotateCcw, Users } from 'lucide-react';
import type { Activity, InventoryItem, Technician } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, ConfirmAction, EmptyState, InlineError, Mono, PageHead, StatusBadge, TechRow, dateTime, fieldClass, initials, techTone, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { DataTable, FilterChips, type Column } from './DataTable';
const TechnicianFilters = FilterChips<'all' | 'Available' | 'Busy'>;
const EventFilters = FilterChips<'all' | 'Approved' | 'Completed' | 'Reset'>;

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
    { key: 'name', header: 'Technician', sort: (t) => t.name, cell: (t) => (
      <span className="flex items-center gap-2" data-testid={`technician-${t.id}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-mono text-[11px]">{initials(t.name)}</span><span className="font-medium">{t.name}</span></span>) },
    { key: 'status', header: 'Status', sort: (t) => t.status, cell: (t) => <StatusBadge tone={techTone(t.status)} pulse={t.status === 'Busy'}>{t.status}</StatusBadge> },
    { key: 'zone', header: 'Zone', sort: (t) => t.zone, cell: (t) => t.zone },
    { key: 'van', header: 'Van', sort: (t) => t.van_id, cell: (t) => <Mono>V-{t.van_id}</Mono> },
    { key: 'actions', header: 'Assignment', cell: actions },
  ];

  return (
    <div className="space-y-5">
      <PageHead kicker="Team" title="Technicians" sub="Status and van assignment from the hub.">
        <Button asChild variant="outline"><Link href="/map">Open map <ArrowRight size={13} /></Link></Button>
      </PageHead>
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      {hub.resetError && <InlineError>{hub.resetError}</InlineError>}
      <Card title={<><Users size={15} /> All technicians</>} aside={<Mono>{availableCount}/{technicians.length} available</Mono>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Technician data unavailable.</InlineError> : (
          <DataTable caption="Technicians" rows={rows} columns={columns} rowKey={(t) => t.id} loading={hubQ.isLoading}
            searchText={(t) => `${t.name} ${t.zone} van ${t.van_id}`} searchLabel="Filter by name, zone or van"
            initialSort={{ key: 'name', dir: 'asc' }}
            toolbar={<TechnicianFilters label="Status filter" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'Available', label: 'Available' }, { value: 'Busy', label: 'Busy' }]} />}
            empty={<EmptyState icon={<Users size={16} />} title="No technicians match">Try another filter.</EmptyState>}
            mobile={(t) => <div className="space-y-2 rounded-lg border p-3"><TechRow tech={t} />{actions(t)}</div>}
          />
        )}
      </Card>
    </div>
  );
}

export function StockPage({ hub, lowOnly = false }: Hub & { lowOnly?: boolean }) {
  const { inventory, hubQ, match, analysis } = hub;
  const [van, setVan] = useState('all');
  const vans = useMemo(() => [...new Set(inventory.map((i) => i.van_id))].sort((a, b) => a - b), [inventory]);
  const base = lowOnly ? inventory.filter((i) => i.quantity <= 2) : inventory;
  const rows = van === 'all' ? base : base.filter((i) => String(i.van_id) === van);
  const required = (i: InventoryItem) => i.van_id === match?.van_id && !!analysis?.result.parts.some((p) => p.toLowerCase() === i.part_name.toLowerCase());
  const qty = (i: InventoryItem) => (
    <span data-testid={`text-qty-${i.id}`} className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 font-mono font-semibold tabular ${i.quantity <= 2 ? 'bg-pending/12 text-pending' : ''}`}>{i.quantity}</span>
  );
  const compare = (i: InventoryItem) => (
    <Button asChild size="sm" variant="outline"><Link href={`/suppliers?inventory_id=${i.id}&part=${encodeURIComponent(i.part_name)}`}>Compare offers <ArrowRight size={12} /></Link></Button>
  );
  const columns: Column<InventoryItem>[] = [
    { key: 'van', header: 'Van', sort: (i) => i.van_id, cell: (i) => <Mono>V-{i.van_id}</Mono> },
    { key: 'part', header: 'Part', sort: (i) => i.part_name, cell: (i) => <span className="flex items-center gap-2">{i.part_name}{required(i) && <StatusBadge tone="ok">Match part</StatusBadge>}</span> },
    { key: 'qty', header: 'On hand', sort: (i) => i.quantity, cell: qty, className: 'text-right' },
    ...(lowOnly ? [{ key: 'next', header: 'Next step', cell: compare }] : []),
  ];
  return (
    <div className="space-y-5">
      <PageHead kicker="Inventory" title={lowOnly ? 'Low-stock lines' : 'Van stock'} sub={lowOnly ? 'Items at two units or fewer, ready for a reorder review.' : 'On-hand parts per van.'}>
        {lowOnly ? <Button asChild variant="outline"><Link href="/stock">All stock</Link></Button>
          : <><Button asChild variant="outline"><Link href="/stock/low">Low stock only</Link></Button><Button asChild><Link href="/suppliers">Compare supplier offers <ArrowRight size={13} /></Link></Button></>}
      </PageHead>
      <Card title={<><Boxes size={15} /> {lowOnly ? 'Reorder review' : 'Stock lines'}</>} aside={<Mono>{rows.length} SKU lines</Mono>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Inventory data unavailable.</InlineError> : (
          <DataTable caption="Stock lines" rows={rows} columns={columns} rowKey={(i) => i.id} loading={hubQ.isLoading}
            pageSize={12} initialSort={lowOnly ? { key: 'qty', dir: 'asc' } : { key: 'van', dir: 'asc' }}
            searchText={(i) => i.part_name} searchLabel="Filter parts"
            rowProps={(i) => ({ className: required(i) ? 'bg-ok/[0.06]' : '', 'data-testid': lowOnly ? `low-stock-${i.id}` : undefined })}
            toolbar={vans.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">Van
                <select className={`${fieldClass} min-h-9 w-auto py-1`} value={van} onChange={(e) => setVan(e.target.value)} aria-label="Filter by van">
                  <option value="all">All vans</option>{vans.map((v) => <option key={v} value={v}>Van {v}</option>)}
                </select>
              </label>
            )}
            empty={<EmptyState icon={<Boxes size={16} />} title={lowOnly ? 'No low-stock lines right now' : 'No stock items found'}>{lowOnly ? 'Every line is above two units.' : 'Adjust the filters.'}</EmptyState>}
            mobile={(i) => (
              <div className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${required(i) ? 'bg-ok/[0.06]' : ''}`} data-testid={lowOnly ? `low-stock-${i.id}` : undefined}>
                <div className="min-w-0"><div className="truncate font-medium">{i.part_name}</div><Mono className="text-xs text-muted-foreground">V-{i.van_id}</Mono>{lowOnly && <div className="mt-2">{compare(i)}</div>}</div>
                {qty(i)}
              </div>
            )}
          />
        )}
        <p className="mt-3 text-xs text-muted-foreground">{lowOnly ? 'Low stock is two units or fewer.' : 'Amber quantities are at two units or fewer. Match-part rows belong to the current qualified technician.'}</p>
      </Card>
    </div>
  );
}

type Kind = 'all' | 'Approved' | 'Completed' | 'Reset';
const kindOf = (e: Activity): Exclude<Kind, 'all'> =>
  e.completion_dispatch_id != null ? 'Completed' : e.action_details.startsWith('Technician availability reset:') ? 'Reset' : 'Approved';
const kindTone = { Approved: 'busy', Completed: 'ok', Reset: 'idle' } as const;

export function LogPage({ hub, notice, todayOnly = false }: Hub & { notice: string; todayOnly?: boolean }) {
  const { activity, hubQ } = hub;
  const [kind, setKind] = useState<Kind>('all');
  const sourceConversationId = (entry: Activity) => entry.dispatch?.conversation_id ??
    (entry.completion_dispatch_id != null
      ? activity.find((candidate) => candidate.id === entry.completion_dispatch_id)?.dispatch?.conversation_id
      : null);
  const base = todayOnly
    ? activity.filter((e) => e.completion_dispatch_id == null && e.action_details.startsWith('Dispatch approved:') && new Date(e.timestamp).toDateString() === new Date().toDateString())
    : activity;
  const rows = kind === 'all' ? base : base.filter((e) => kindOf(e) === kind);
  const columns: Column<Activity>[] = [
    { key: 'id', header: 'ID', sort: (e) => e.id, cell: (e) => <Mono>#{e.id}</Mono> },
    { key: 'time', header: 'Time', sort: (e) => new Date(e.timestamp).getTime(), cell: (e) => <Mono className="whitespace-nowrap text-xs"><time dateTime={e.timestamp}>{dateTime(e.timestamp)}</time></Mono> },
    { key: 'kind', header: 'Event', sort: (e) => kindOf(e), cell: (e) => <StatusBadge tone={kindTone[kindOf(e)]}>{kindOf(e)}</StatusBadge> },
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
      <PageHead kicker={todayOnly ? 'Today' : 'Audit'} title={todayOnly ? "Today's dispatches" : 'Dispatch log'} sub={todayOnly ? 'Approved allocations recorded today.' : 'Every approval, completion and reset.'}>
        <Button asChild variant="outline"><Link href={todayOnly ? '/log' : '/today'}>{todayOnly ? 'Full log' : 'Today only'}</Link></Button>
      </PageHead>
      {notice && <div className="dh-rise flex items-center gap-2 rounded-lg border border-ok/30 bg-ok/[0.08] px-4 py-2.5 text-sm" role="status" data-testid="status-dispatch-success"><CheckCircle2 size={15} className="text-ok" /> {notice}</div>}
      <Card title={<><History size={15} /> Dispatch audit log</>} aside={<span className="inline-flex items-center gap-1"><LockKeyhole size={11} /> Immutable record</span>}>
        {hubQ.isError && !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Dispatch history unavailable until the hub reconnects.</InlineError> : (
          <DataTable caption="Dispatch log" rows={rows} columns={columns} rowKey={(e) => e.id} loading={hubQ.isLoading}
            initialSort={{ key: 'id', dir: 'desc' }} searchText={(e) => `${e.id} ${e.action_details} ${e.approved_by}`} searchLabel="Search log"
            toolbar={!todayOnly && <EventFilters label="Event filter" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'Approved', label: 'Approved' }, { value: 'Completed', label: 'Completed' }, { value: 'Reset', label: 'Reset' }]} />}
            empty={<EmptyState icon={<History size={16} />} title={todayOnly ? 'No dispatches recorded today' : 'No dispatches yet'}>Approved allocations will appear here.</EmptyState>}
            mobile={(e) => (
              <div className="space-y-1.5 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2"><StatusBadge tone={kindTone[kindOf(e)]}>{kindOf(e)}</StatusBadge><Mono className="text-xs text-muted-foreground">#{e.id} · {dateTime(e.timestamp)}</Mono></div>
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
