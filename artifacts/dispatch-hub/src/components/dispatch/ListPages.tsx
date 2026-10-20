import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, History, LockKeyhole, RotateCcw } from 'lucide-react';
import { Card, PageHead, TechRow, dateTime, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';

export function TechniciansPage({ hub }: Hub) {
  const { technicians, availableCount, hubQ } = hub;
  return (
    <div className="af-page">
      <PageHead kicker="Team" title="Technicians" sub="Status and van assignment from the hub." />
      <Card title="All technicians" aside={<span className="af-mono" style={{ color: '#89867f' }}>{availableCount} available</span>}>
        {hub.completionError && <p className="af-error" role="alert">{hub.completionError}</p>}
        {hub.resetError && <p className="af-error" role="alert">{hub.resetError}</p>}
        <div className="af-tech-list">{technicians.map((t) => {
          const jobs = hub.activity.filter((e) => e.dispatch?.tech_id === t.id && e.dispatch.status === 'Active');
          return <div key={t.id}>
            <TechRow tech={t} />
            {jobs.map((entry) => <div key={entry.id} className="af-hint">
              <p>Active dispatch #{entry.id} · {entry.dispatch!.customer_site.label}</p>
              <CompletionControl entry={entry} hub={hub} />
            </div>)}
            {t.status === 'Busy' && !jobs.length && <div className="af-hint">
              <p>No tracked active job. Reset makes this demo technician available without completing or removing older history.</p>
              <button
                type="button"
                className="af-quiet-btn af-outline"
                data-testid={`reset-technician-${t.id}`}
                disabled={hub.reset.isPending || hub.complete.isPending || hub.approve.isPending || hub.hubQ.isError}
                onClick={() => {
                  if (window.confirm(`Set ${t.name} to Available? This will not complete an old job or restore any parts. Dispatch history and stock remain unchanged.`)) {
                    void hub.resetTechnician(t.id);
                  }
                }}
              >
                <RotateCcw size={12} />
                {hub.reset.isPending && hub.reset.variables?.data.technician_id === t.id
                  ? 'Resetting…'
                  : 'Reset to Available'}
              </button>
            </div>}
          </div>;
        })}</div>
        {!technicians.length && <p className="af-hint">{hubQ.isLoading ? 'Loading technicians…' : hubQ.isError ? 'Technician data unavailable.' : 'No technicians found.'}</p>}
        <p className="af-hint">See the <Link href="/map" className="af-inline-link">map</Link> for sample positions.</p>
      </Card>
    </div>
  );
}

export function StockPage({ hub, lowOnly = false }: Hub & { lowOnly?: boolean }) {
  const { inventory, hubQ, match, analysis } = hub;
  const shownInventory = lowOnly ? inventory.filter((item) => item.quantity <= 2) : inventory;
  return (
    <div className="af-page">
      <PageHead
        kicker="Inventory"
        title={lowOnly ? 'Low-stock lines' : 'Van stock'}
        sub={lowOnly ? 'Items at two units or fewer, ready for a reorder review.' : 'On-hand parts per van.'}
      >
        {!lowOnly && <Link href="/suppliers" className="af-supplier-shortcut">Compare supplier offers <ArrowRight size={13} /></Link>}
      </PageHead>
      <Card title={lowOnly ? 'Reorder review' : 'Stock lines'} aside={<span className="af-mono" style={{ color: '#89867f' }}>{shownInventory.length} SKU lines</span>}>
        <div className="af-stock-wrap tall">
          <table className="af-table">
            <thead><tr><th>Van</th><th>Part</th><th>On hand</th></tr></thead>
            <tbody>
              {shownInventory.map((item) => {
                const req = item.van_id === match?.van_id && analysis?.result.parts.some((p) => p.toLowerCase() === item.part_name.toLowerCase());
                return <tr key={item.id} className={req ? 'highlight' : ''} data-testid={lowOnly ? `low-stock-${item.id}` : undefined}><td>V-{item.van_id}</td><td>{item.part_name}</td><td><span data-testid={`text-qty-${item.id}`} className={`af-qty ${item.quantity <= 2 ? 'low' : ''}`}>{item.quantity}</span></td></tr>;
              })}
              {!shownInventory.length && <tr><td colSpan={3}>{hubQ.isLoading ? 'Loading inventory…' : hubQ.isError ? 'Inventory data unavailable.' : lowOnly ? 'No low-stock lines right now.' : 'No stock items found.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="af-hint">{lowOnly ? 'Low stock is defined as two units or fewer.' : 'Low stock is highlighted at two units or fewer. Green rows are parts for the current qualified match.'}</p>
      </Card>
    </div>
  );
}

export function LogPage({ hub, notice, todayOnly = false }: Hub & { notice: string; todayOnly?: boolean }) {
  const { activity, hubQ } = hub;
  const shownActivity = todayOnly
    ? activity.filter((entry) =>
      entry.completion_dispatch_id == null &&
      entry.action_details.startsWith('Dispatch approved:') &&
      new Date(entry.timestamp).toDateString() === new Date().toDateString(),
    )
    : activity;
  return (
    <div className="af-page af-narrow">
      <PageHead
        kicker={todayOnly ? 'Today' : 'Audit'}
        title={todayOnly ? "Today's dispatches" : 'Dispatch log'}
        sub={todayOnly ? 'Approved allocations recorded today.' : 'Every approval and completion, newest first.'}
      />
      {notice && <div className="af-success" role="status" data-testid="status-dispatch-success"><CheckCircle2 size={14} /> {notice}</div>}
      <Card title={<><History size={15} /> Dispatch audit log</>} aside={<span className="af-inline-actions" style={{ fontSize: 9, color: '#89867f' }}><LockKeyhole size={11} /> Immutable record</span>}>
        {shownActivity.length ? (
          <div className="af-audit-list">
            {shownActivity.map((e) => (
              <div className="af-audit-item" key={e.id}><span className="af-audit-dot" /><time className="af-audit-time">{dateTime(e.timestamp)}</time><p>{e.action_details}</p><div className="af-audit-by">{e.completion_dispatch_id != null ? 'Completed' : e.action_details.startsWith('Technician availability reset:') ? 'Reset' : 'Approved'} by {e.approved_by}</div></div>
            ))}
          </div>
        ) : <div className="af-empty-log">{hubQ.isLoading ? 'Loading dispatch history…' : hubQ.isError ? 'Dispatch history unavailable until the hub reconnects.' : todayOnly ? 'No dispatches recorded today.' : 'No dispatches yet. Approved allocations will appear here.'}</div>}
      </Card>
    </div>
  );
}
