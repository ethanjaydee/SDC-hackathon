import { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Boxes, Check, ChevronRight, Clock3, FlaskConical,
  History, Inbox, MapPinned, Menu, PackageCheck, Radio, Users, X,
} from 'lucide-react';
import './_group.css';
import './_xiaomi.css';
import { PreviewLink, PreviewProvider, previewHub } from './_shared/_preview';

type MetricKey = 'available' | 'stock' | 'healthy';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function StatusRing({
  numerator, denominator, label, criteria, color, onClick, expanded,
}: {
  numerator: number;
  denominator: number;
  label: string;
  criteria: string;
  color: string;
  onClick: () => void;
  expanded: boolean;
}) {
  const fraction = denominator ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
  const percent = Math.round(fraction * 100);
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <button
      className="xo-ring-card"
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={`${label}: ${numerator} of ${denominator}. ${criteria} Select to view snapshot details.`}
    >
      <span className="xo-ring" aria-hidden="true">
        <svg viewBox="0 0 110 110">
          <circle className="xo-ring-track" cx="55" cy="55" r={radius} />
          <circle
            className="xo-ring-value"
            cx="55"
            cy="55"
            r={radius}
            style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <span className="xo-ring-center">
          <span className="xo-ring-number">{numerator}<span style={{ color: '#99a69f', fontSize: 14, letterSpacing: '-.04em' }}>/{denominator}</span></span>
          <span className="xo-ring-percent">{percent}%</span>
        </span>
      </span>
      <span className="xo-ring-label">{label}</span>
      <span className="xo-ring-criteria">{criteria}</span>
      <span className="xo-ring-hint"><ChevronRight size={11} /> {expanded ? 'Details open' : 'View snapshot detail'}</span>
    </button>
  );
}

function XiaomiOverviewContent() {
  const { technicians, inventory, activity, dispatchedToday, availableCount } = previewHub;
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const positiveStock = inventory.filter((line) => line.quantity > 0).length;
  const healthyStock = inventory.filter((line) => line.quantity > 2).length;
  const latestActivity = activity.slice(0, 3);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const metrics: Record<MetricKey, { title: string; lines: string[] }> = {
    available: {
      title: 'Technician roster · snapshot',
      lines: technicians.map((tech) => `${tech.name} · ${tech.status} · ${tech.zone}`),
    },
    stock: {
      title: 'Stock-positive lines · snapshot',
      lines: inventory.map((line) => `Van ${line.van_id} · ${line.part_name} · ${line.quantity} on hand`),
    },
    healthy: {
      title: 'Above low-stock threshold · snapshot',
      lines: inventory.filter((line) => line.quantity > 2).map((line) => `Van ${line.van_id} · ${line.part_name} · ${line.quantity} on hand`),
    },
  };

  const nav = [
    { to: '/', label: 'Overview', Icon: Activity, active: true },
    { to: '/intake', label: 'Repair intake', Icon: Inbox },
    { to: '/map', label: 'Technician map', Icon: MapPinned },
    { to: '/technicians', label: 'Technicians', Icon: Users },
    { to: '/stock', label: 'Van stock', Icon: Boxes },
    { to: '/log', label: 'Dispatch log', Icon: History },
  ];

  return (
    <div className="xiaomi-overview">
      <div className="xo-mobilebar">
        <div className="xo-mobile-brand"><span className="xo-mobile-mark"><Radio size={14} /></span>Dispatch Hub</div>
        <button
          className="xo-menu-button"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="xo-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
      {menuOpen && <button className="xo-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <div className="xo-shell">
        <aside className={`xo-sidebar${menuOpen ? ' open' : ''}`} aria-label="Dispatch Hub navigation">
          <div className="xo-brand">
            <span className="xo-brand-mark"><Radio size={16} strokeWidth={2.5} /></span>
            <span className="xo-brand-name">Dispatch Hub</span>
            <button className="xo-nav-close" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}><X size={15} /></button>
          </div>
          <div className="xo-nav-label">Workshop</div>
          <nav id="xo-navigation" className="xo-nav" aria-label="Dashboard sections">
            {nav.map(({ to, label, Icon, active }) => (
              <PreviewLink
                key={to}
                href={to}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
              </PreviewLink>
            ))}
          </nav>
          <div className="xo-side-card">
            <span className="xo-mono">Dispatch desk</span>
            <strong>One clear handoff.</strong>
            <p>Check people and parts at a glance, then route a repair into its dedicated workflow.</p>
          </div>
        </aside>

        <div className="xo-main">
          <div className="xo-demo-note" role="note">
            <FlaskConical size={13} />
            <span><strong>Design snapshot.</strong> Read-only synthetic Dispatch Hub data; not live GPS or a live API.</span>
            <span className="xo-note-tag"><span className="xo-note-dot" /> Snapshot preview</span>
          </div>

          <main className="xo-content">
            <header className="xo-topline">
              <div>
                <p className="xo-eyebrow">Workshop · dispatch overview</p>
                <h1 className="xo-title">A clear view of the floor.</h1>
                <p className="xo-subtitle">Check technician availability and van readiness before a repair leaves the desk.</p>
              </div>
              <div className="xo-top-actions">
                <span className="xo-snapshot-chip"><Clock3 size={13} /> Snapshot data</span>
                <PreviewLink href="/intake" className="xo-primary"><Inbox size={15} /> Start repair intake <ArrowRight size={14} /></PreviewLink>
              </div>
            </header>

            <div className="xo-overview-grid">
              <section className="xo-panel xo-readiness" aria-labelledby="xo-readiness-title">
                <div className="xo-section-head">
                  <div>
                    <h2 className="xo-section-title" id="xo-readiness-title">Readiness at a glance</h2>
                    <p className="xo-section-caption">Circular meters show counts against the actual snapshot totals.</p>
                  </div>
                  <span className="xo-live-label"><span /> Snapshot status</span>
                </div>
                <div className="xo-ring-row">
                  <StatusRing
                    numerator={availableCount}
                    denominator={technicians.length}
                    label="Available"
                    criteria="Available / all technicians"
                    color="#ee8350"
                    expanded={detail === 'available'}
                    onClick={() => setDetail(detail === 'available' ? null : 'available')}
                  />
                  <StatusRing
                    numerator={positiveStock}
                    denominator={inventory.length}
                    label="Stock on hand"
                    criteria="Positive lines / all lines"
                    color="#3b8980"
                    expanded={detail === 'stock'}
                    onClick={() => setDetail(detail === 'stock' ? null : 'stock')}
                  />
                  <StatusRing
                    numerator={healthyStock}
                    denominator={inventory.length}
                    label="Above threshold"
                    criteria="More than 2 / all lines"
                    color="#c7a25d"
                    expanded={detail === 'healthy'}
                    onClick={() => setDetail(detail === 'healthy' ? null : 'healthy')}
                  />
                </div>
                {detail && (
                  <div className="xo-detail" aria-live="polite">
                    <div className="xo-detail-head">
                      <h3>{metrics[detail].title}</h3>
                      <button className="xo-detail-close" type="button" aria-label="Close snapshot detail" onClick={() => setDetail(null)}><X size={15} /></button>
                    </div>
                    <div className="xo-detail-list">
                      {metrics[detail].lines.map((line, index) => <span className="xo-detail-chip" key={`${detail}-${index}`}>{line}</span>)}
                    </div>
                  </div>
                )}
              </section>

              <div className="xo-side-stack">
                <section className="xo-panel xo-count-card" aria-label={`${dispatchedToday} dispatches today`}>
                  <div className="xo-count-heading">
                    <span>Dispatches today</span>
                    <span className="xo-count-icon"><PackageCheck size={16} /></span>
                  </div>
                  <div>
                    <div className="xo-count-number">{dispatchedToday}</div>
                    <div className="xo-count-foot">Approved allocations recorded today</div>
                  </div>
                </section>
                <section className="xo-panel xo-count-card orange" aria-label={`${inventory.filter((line) => line.quantity <= 2).length} low-stock lines`}>
                  <div className="xo-count-heading">
                    <span>Needs a closer look</span>
                    <span className="xo-count-icon"><Boxes size={16} /></span>
                  </div>
                  <div>
                    <div className="xo-count-number">{inventory.filter((line) => line.quantity <= 2).length}</div>
                    <div className="xo-count-foot"><b>Low-stock lines</b> · 2 units or fewer</div>
                  </div>
                </section>
              </div>
            </div>

            <section className="xo-panel xo-activity" aria-labelledby="xo-activity-title">
              <div className="xo-activity-head">
                <div className="xo-activity-title">
                  <span className="xo-count-icon"><History size={15} /></span>
                  <div><h2 id="xo-activity-title">Recent dispatch activity</h2><p>Latest recorded allocations from the design snapshot</p></div>
                </div>
                <PreviewLink href="/log" className="xo-text-link">Open dispatch log <ArrowRight size={13} /></PreviewLink>
              </div>
              {latestActivity.length ? (
                <div className="xo-activity-list">
                  {latestActivity.map((entry) => (
                    <article className="xo-activity-item" key={entry.id}>
                      <span className="xo-activity-symbol"><Check size={14} /></span>
                      <div className="xo-activity-copy">
                        <strong>{entry.action_details}</strong>
                        <span>Approved by {entry.approved_by}</span>
                      </div>
                      <time className="xo-activity-time" dateTime={entry.timestamp}>{formatDateTime(entry.timestamp)}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="xo-empty">
                  <span className="xo-empty-icon"><History size={17} /></span>
                  <strong>No dispatches recorded yet</strong>
                  <p>Approved allocations will appear here when present in the snapshot.</p>
                </div>
              )}
            </section>
            <footer className="xo-footer">Dispatch Hub · Read-only design snapshot · Separate workflows remain in their own screens</footer>
          </main>
        </div>
      </div>
    </div>
  );
}

export function XiaomiOverview() {
  return <PreviewProvider><XiaomiOverviewContent /></PreviewProvider>;
}
