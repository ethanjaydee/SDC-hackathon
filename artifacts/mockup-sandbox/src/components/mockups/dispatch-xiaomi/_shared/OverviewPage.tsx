import { PreviewLink as Link } from './_preview';
import { ArrowRight } from 'lucide-react';
import { PageHead, dateTime, type Hub } from './shared';

export default function OverviewPage({ hub }: Hub) {
  const { hubQ, technicians, availableCount, lowStockCount, dispatchedToday, activity, analysis } = hub;
  const ok = !!hubQ.data;
  const entries = [
    { to: '/intake', t: 'Repair intake', d: 'Enter fault notes and choose the sample customer site.' },
    { to: '/map', t: 'Technician map', d: 'Sample positions of technicians and the selected customer.' },
    { to: '/technicians', t: 'Technicians', d: `${ok ? availableCount : '—'} of ${ok ? technicians.length : '—'} available now.` },
    { to: '/stock', t: 'Van stock', d: `${ok ? lowStockCount : '—'} low stock lines across vans.` },
    { to: '/log', t: 'Dispatch log', d: 'Approved allocations and who approved them.' },
  ];
  return (
    <div className="af-page">
      <PageHead kicker="Live demo" title="Workshop dispatch" sub="From unstructured fault notes to a ready-to-go van allocation." />
      <section className="af-stats" aria-label="Dispatch overview" aria-busy={hubQ.isLoading}>
        <div className="af-stat accent"><div className="af-eyebrow">Open analysis</div><div className="af-stat-value">{analysis ? '1' : '—'}</div><div className="af-stat-foot">{analysis ? 'Awaiting approval' : 'Submit an intake to begin'}</div></div>
        <div className="af-stat"><div className="af-eyebrow">Available techs</div><div className="af-stat-value" data-testid="stat-available">{ok ? availableCount : '—'}<span style={{ fontSize: 14, color: '#85817a' }}>/{ok ? technicians.length : '—'}</span></div><div className="af-stat-foot">Across active workshop zones</div></div>
        <div className="af-stat"><div className="af-eyebrow">Low stock lines</div><div className="af-stat-value">{ok ? lowStockCount : '—'}</div><div className="af-stat-foot">Two units or fewer across vans</div></div>
        <div className="af-stat"><div className="af-eyebrow">Dispatched today</div><div className="af-stat-value">{ok ? dispatchedToday : '—'}</div><div className="af-stat-foot">Approved allocations today</div></div>
      </section>
      <div className="af-entry-grid">
        {entries.map((e) => (
          <Link key={e.to} href={e.to} className="af-entry">
            <strong>{e.t}</strong><span>{e.d}</span><ArrowRight size={14} />
          </Link>
        ))}
        {analysis && <Link href="/analysis" className="af-entry accent"><strong>Continue to analysis</strong><span>An intake is waiting for review and approval.</span><ArrowRight size={14} /></Link>}
      </div>
      <section className="af-card" style={{ marginTop: 12 }}>
        <header className="af-card-head"><h2 className="af-card-title">Latest dispatches</h2><Link href="/log" className="af-quiet-btn">View log</Link></header>
        <div className="af-card-body">
          {activity.slice(0, 3).map((a) => <div className="af-recent" key={a.id}><time className="af-audit-time">{dateTime(a.timestamp)}</time><p>{a.action_details}</p></div>)}
          {!activity.length && <div className="af-empty-log">{hubQ.isLoading ? 'Loading dispatch history…' : 'No dispatches yet.'}</div>}
        </div>
      </section>
    </div>
  );
}
