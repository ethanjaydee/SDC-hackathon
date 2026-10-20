import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Boxes, Check, Clock3, History, Inbox, PackageCheck, X } from 'lucide-react';
import { dateTime, type Hub } from './shared';
import StatusRing from './StatusRing';

type MetricKey = 'available' | 'stock' | 'healthy';

export default function OverviewPage({ hub }: Hub) {
  const { hubQ, technicians, inventory, availableCount, lowStockCount, dispatchedToday, activity, analysis } = hub;
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const triggers = useRef<Partial<Record<MetricKey, HTMLButtonElement | null>>>({});
  const ready = !!hubQ.data;
  const positiveStock = inventory.filter((line) => line.quantity > 0);
  const healthyStock = inventory.filter((line) => line.quantity > 2);
  const latestActivity = activity.slice(0, 3);
  const stockDescription = (line: (typeof inventory)[number]) =>
    `Van ${line.van_id} · ${line.part_name} · ${line.quantity} on hand`;
  const metrics = [
    {
      key: 'available' as const, label: 'Available', criteria: 'Available / all technicians',
      numerator: availableCount, denominator: technicians.length, color: '#ee8350',
      title: 'Technician roster',
      lines: technicians.map((tech) => `${tech.name} · ${tech.status} · ${tech.zone}`),
      to: '/technicians',
    },
    {
      key: 'stock' as const, label: 'Stock on hand', criteria: 'Positive lines / all lines',
      numerator: positiveStock.length, denominator: inventory.length, color: '#3b8980',
      title: 'Stock-positive inventory lines',
      lines: positiveStock.map(stockDescription), to: '/stock',
    },
    {
      key: 'healthy' as const, label: 'Above threshold', criteria: 'More than 2 / all lines',
      numerator: healthyStock.length, denominator: inventory.length, color: '#c7a25d',
      title: 'Above the low-stock threshold',
      lines: healthyStock.map(stockDescription), to: '/stock',
    },
  ];
  const selected = metrics.find((metric) => metric.key === detail);
  const status = !ready ? 'Awaiting data' : hubQ.isError ? 'Last received data' : 'Current hub status';

  return (
    <div className="xo-overview-page">
      <header className="xo-topline">
        <div>
          <p className="xo-eyebrow">Workshop · dispatch overview</p>
          <h1 className="xo-title">A clear view of the floor.</h1>
          <p className="xo-subtitle">Check technician availability and van readiness before a repair leaves the desk.</p>
        </div>
        <div className="xo-top-actions">
          <span className="xo-snapshot-chip"><Clock3 size={13} /> {hubQ.isError ? 'Connection lost' : 'Auto-refresh · 10s'}</span>
          <Link href="/intake" className="xo-primary"><Inbox size={15} /> Start repair intake <ArrowRight size={14} /></Link>
        </div>
      </header>

      {analysis && <div className="xo-pending-analysis" role="status">
        <span>A repair intake is ready for review.</span>
        <Link href="/analysis" className="xo-text-link">Continue to analysis <ArrowRight size={13} /></Link>
      </div>}

      <div className="xo-overview-grid" aria-busy={hubQ.isLoading}>
        <section className="xo-panel xo-readiness" aria-labelledby="xo-readiness-title">
          <div className="xo-section-head">
            <div>
              <h2 className="xo-section-title" id="xo-readiness-title">Readiness at a glance</h2>
              <p className="xo-section-caption">Circular meters show counts against the actual hub totals.</p>
            </div>
            <span className="xo-live-label"><span /> {status}</span>
          </div>
          <div className="xo-ring-row" data-testid="overview-status-rings">
            {metrics.map((metric) => <StatusRing
              key={metric.key}
              numerator={metric.numerator}
              denominator={metric.denominator}
              label={metric.label}
              criteria={metric.criteria}
              color={metric.color}
              ready={ready}
              expanded={detail === metric.key}
              onClick={() => setDetail(detail === metric.key ? null : metric.key)}
              buttonRef={(node) => { triggers.current[metric.key] = node; }}
            />)}
          </div>
          {selected && <div className="xo-detail" id="hub-readiness-detail" aria-live="polite">
            <div className="xo-detail-head">
              <h3>{selected.title}</h3>
              <button className="xo-detail-close" type="button" aria-label="Close readiness detail" onClick={() => {
                triggers.current[selected.key]?.focus();
                setDetail(null);
              }}><X size={15} /></button>
            </div>
            <div className="xo-detail-list">
              {selected.lines.map((line) => <span className="xo-detail-chip" key={line}>{line}</span>)}
              {!selected.lines.length && <span className="xo-detail-chip">No records match this measure.</span>}
            </div>
            <Link href={selected.to} className="xo-text-link">Open {selected.key === 'available' ? 'technicians' : 'van stock'} <ArrowRight size={13} /></Link>
          </div>}
        </section>

        <div className="xo-side-stack">
          <section className="xo-panel xo-count-card" aria-label={ready ? `${dispatchedToday} dispatches today` : 'Dispatch count unavailable'}>
            <div className="xo-count-heading"><span>Dispatches today</span><span className="xo-count-icon"><PackageCheck size={16} /></span></div>
            <div>
              <div className="xo-count-number">{ready ? dispatchedToday : '—'}</div>
              <div className="xo-count-foot">Approved allocations recorded today</div>
            </div>
          </section>
          <section className="xo-panel xo-count-card orange" aria-label={ready ? `${lowStockCount} low-stock lines` : 'Low-stock count unavailable'}>
            <div className="xo-count-heading"><span>Needs a closer look</span><span className="xo-count-icon"><Boxes size={16} /></span></div>
            <div>
              <div className="xo-count-number">{ready ? lowStockCount : '—'}</div>
              <div className="xo-count-foot"><b>Low-stock lines</b> · 2 units or fewer</div>
            </div>
          </section>
        </div>
      </div>

      <section className="xo-panel xo-activity" aria-labelledby="xo-activity-title">
        <div className="xo-activity-head">
          <div className="xo-activity-title">
            <span className="xo-count-icon"><History size={15} /></span>
            <div><h2 id="xo-activity-title">Recent dispatch activity</h2><p>Latest recorded activity from the dispatch log</p></div>
          </div>
          <Link href="/log" className="xo-text-link">Open dispatch log <ArrowRight size={13} /></Link>
        </div>
        {latestActivity.length ? <div className="xo-activity-list">
          {latestActivity.map((entry) => <article className="xo-activity-item" key={entry.id}>
            <span className="xo-activity-symbol"><Check size={14} /></span>
            <div className="xo-activity-copy">
              <strong title={entry.action_details}>{entry.action_details}</strong>
              <span>Recorded by {entry.approved_by}</span>
            </div>
            <time className="xo-activity-time" dateTime={entry.timestamp}>{dateTime(entry.timestamp)}</time>
          </article>)}
        </div> : <div className="xo-empty" role="status">
          <span className="xo-empty-icon"><History size={17} /></span>
          <strong>{!ready ? hubQ.isError ? 'Dispatch history unavailable' : 'Loading dispatch history…' : 'No dispatches recorded yet'}</strong>
          <p>{ready ? 'Approved allocations will appear here after a dispatch.' : 'History will appear when the hub connection is available.'}</p>
        </div>}
      </section>
    </div>
  );
}
