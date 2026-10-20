import { Link } from 'wouter';
import { CheckCircle2, History, LockKeyhole } from 'lucide-react';
import { Card, PageHead, TechRow, dateTime, type Hub } from './shared';

export function TechniciansPage({ hub }: Hub) {
  const { technicians, availableCount, hubQ } = hub;
  return (
    <div className="af-page">
      <PageHead kicker="Team" title="Technicians" sub="Status and van assignment from the hub." />
      <Card title="All technicians" aside={<span className="af-mono" style={{ color: '#89867f' }}>{availableCount} available</span>}>
        <div className="af-tech-list">{technicians.map((t) => <TechRow key={t.id} tech={t} />)}</div>
        {!technicians.length && <p className="af-hint">{hubQ.isLoading ? 'Loading technicians…' : hubQ.isError ? 'Technician data unavailable.' : 'No technicians found.'}</p>}
        <p className="af-hint">See the <Link href="/map" className="af-inline-link">map</Link> for sample positions.</p>
      </Card>
    </div>
  );
}

export function StockPage({ hub }: Hub) {
  const { inventory, hubQ, match, analysis } = hub;
  return (
    <div className="af-page">
      <PageHead kicker="Inventory" title="Van stock" sub="On-hand parts per van." />
      <Card title="Stock lines" aside={<span className="af-mono" style={{ color: '#89867f' }}>{inventory.length} SKU lines</span>}>
        <div className="af-stock-wrap tall">
          <table className="af-table">
            <thead><tr><th>Van</th><th>Part</th><th>On hand</th></tr></thead>
            <tbody>
              {inventory.map((item) => {
                const req = item.van_id === match?.van_id && analysis?.result.parts.some((p) => p.toLowerCase() === item.part_name.toLowerCase());
                return <tr key={item.id} className={req ? 'highlight' : ''}><td>V-{item.van_id}</td><td>{item.part_name}</td><td><span data-testid={`text-qty-${item.id}`} className={`af-qty ${item.quantity <= 2 ? 'low' : ''}`}>{item.quantity}</span></td></tr>;
              })}
              {!inventory.length && <tr><td colSpan={3}>{hubQ.isLoading ? 'Loading inventory…' : hubQ.isError ? 'Inventory data unavailable.' : 'No stock items found.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="af-hint">Low stock is highlighted at two units or fewer. Green rows are parts for the current qualified match.</p>
      </Card>
    </div>
  );
}

export function LogPage({ hub, notice }: Hub & { notice: string }) {
  const { activity, hubQ } = hub;
  return (
    <div className="af-page af-narrow">
      <PageHead kicker="Audit" title="Dispatch log" sub="Every approved allocation, newest first." />
      {notice && <div className="af-success" role="status" data-testid="status-dispatch-success"><CheckCircle2 size={14} /> {notice}</div>}
      <Card title={<><History size={15} /> Dispatch audit log</>} aside={<span className="af-inline-actions" style={{ fontSize: 9, color: '#89867f' }}><LockKeyhole size={11} /> Immutable record</span>}>
        {activity.length ? (
          <div className="af-audit-list">
            {activity.map((e) => (
              <div className="af-audit-item" key={e.id}><span className="af-audit-dot" /><time className="af-audit-time">{dateTime(e.timestamp)}</time><p>{e.action_details}</p><div className="af-audit-by">Approved by {e.approved_by}</div></div>
            ))}
          </div>
        ) : <div className="af-empty-log">{hubQ.isLoading ? 'Loading dispatch history…' : hubQ.isError ? 'Dispatch history unavailable until the hub reconnects.' : 'No dispatches yet. Approved allocations will appear here.'}</div>}
      </Card>
    </div>
  );
}
