import './workshop-wallboard.css';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, Clock3, MapPin, Radio,
  RefreshCw, ShieldCheck, Truck, Users, Wrench,
} from 'lucide-react';
import { DemoHubProvider, getGetHubDataQueryKey, useGetHubData } from './_shared/_api';

type HubEntry = {
  id: number;
  action_details: string;
  approved_by: string;
  timestamp: string;
};

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Wallboard() {
  const query = useGetHubData({ query: { queryKey: getGetHubDataQueryKey() } });
  const hub = query.data;
  const [activeView, setActiveView] = useState<'dispatches' | 'people' | 'stock'>('dispatches');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const technicians = hub?.technicians || [];
  const inventory = hub?.inventory || [];
  const activity = useMemo(
    () => [...(hub?.activity_log || [])].sort((a: HubEntry, b: HubEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [hub],
  );
  const available = technicians.filter((tech: any) => tech.status === 'Available');
  const busy = technicians.filter((tech: any) => tech.status !== 'Available');
  const risks = inventory
    .filter((item: any) => item.quantity <= 2)
    .sort((a: any, b: any) => a.quantity - b.quantity);

  return (
    <div className="ww-root">
      <header className="ww-header">
        <div className="ww-brand">
          <span className="ww-mark"><Radio size={19} strokeWidth={2.5} /></span>
          <div>
            <div className="ww-brand-title">Dispatch Hub</div>
            <div className="ww-brand-sub">Workshop floor · Operations board</div>
          </div>
        </div>
        <div className="ww-header-right">
          <span className="ww-live"><i /> LIVE BOARD</span>
          <div className="ww-clock">
            <b>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</b>
            <span>{now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <button className="ww-refresh" type="button" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Refresh board">
            <RefreshCw size={16} className={query.isFetching ? 'ww-spinning' : ''} />
            <span>{query.isFetching ? 'Updating' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      <main className="ww-main">
        <section className="ww-intro">
          <div>
            <p className="ww-eyebrow"><span className="ww-signal" /> SHIFT SNAPSHOT <span className="ww-divider">/</span> WORKSHOP 01</p>
            <h1>Today, at a glance<span>.</span></h1>
            <p className="ww-deck">The jobs moving, the hands available, and the parts that need attention.</p>
          </div>
          <div className="ww-shift-note">
            <span className="ww-note-icon"><Activity size={17} /></span>
            <div><b>{activity.length} dispatch{activity.length === 1 ? '' : 'es'} logged</b><small>Session activity · latest first</small></div>
          </div>
        </section>

        {query.isError ? (
          <section className="ww-state ww-error">
            <div className="ww-state-symbol"><AlertTriangle size={22} /></div>
            <div><h2>Board connection interrupted</h2><p>Workshop data could not be loaded. Try reconnecting to restore the live snapshot.</p></div>
            <button type="button" onClick={() => query.refetch()}>Retry connection <ArrowUpRight size={15} /></button>
          </section>
        ) : query.isLoading ? (
          <section className="ww-skeleton" aria-label="Loading dispatch board">
            <div className="ww-skeleton-metrics"><i /><i /><i /><i /></div>
            <div className="ww-skeleton-columns"><i /><i /><i /></div>
          </section>
        ) : (
          <>
            <section className="ww-metrics" aria-label="Workshop status">
              <article className="ww-metric ww-metric-primary">
                <span className="ww-metric-icon"><Truck size={18} /></span>
                <div className="ww-metric-label">DISPATCHES</div>
                <div className="ww-metric-number">{activity.length}<span>today</span></div>
                <div className="ww-metric-foot">{activity.length ? 'Latest allocation recorded' : 'Awaiting first allocation'}</div>
                <div className="ww-metric-stroke" />
              </article>
              <article className="ww-metric">
                <span className="ww-metric-icon"><Users size={18} /></span>
                <div className="ww-metric-label">AVAILABLE CREW</div>
                <div className="ww-metric-number">{available.length}<span>/{technicians.length}</span></div>
                <div className="ww-metric-foot">{busy.length} technician{busy.length === 1 ? '' : 's'} currently assigned</div>
              </article>
              <article className={`ww-metric ${risks.length ? 'ww-metric-alert' : ''}`}>
                <span className="ww-metric-icon"><Boxes size={18} /></span>
                <div className="ww-metric-label">STOCK WATCH</div>
                <div className="ww-metric-number">{risks.length}<span>lines</span></div>
                <div className="ww-metric-foot">{risks.length ? 'At two units or below' : 'No low-stock lines'}</div>
              </article>
              <article className="ww-metric">
                <span className="ww-metric-icon"><ShieldCheck size={18} /></span>
                <div className="ww-metric-label">VANS IN SERVICE</div>
                <div className="ww-metric-number">{new Set(technicians.map((tech: any) => tech.van_id)).size}<span>fleet</span></div>
                <div className="ww-metric-foot">Parts tracked by vehicle</div>
              </article>
            </section>

            <nav className="ww-view-tabs" aria-label="Wallboard sections">
              {([
                ['dispatches', 'Dispatches', <Truck size={15} key="d" />],
                ['people', 'Crew availability', <Users size={15} key="p" />],
                ['stock', 'Stock risks', <Boxes size={15} key="s" />],
              ] as const).map(([id, label, icon]) => (
                <button key={id} className={activeView === id ? 'active' : ''} onClick={() => setActiveView(id)}>
                  {icon}<span>{label}</span>
                  {id === 'stock' && risks.length > 0 && <em>{risks.length}</em>}
                </button>
              ))}
            </nav>

            <div className="ww-panels">
              <section className={`ww-panel ww-dispatch-panel ${activeView !== 'dispatches' ? 'ww-muted-panel' : ''}`}>
                <div className="ww-panel-head">
                  <div><div className="ww-section-index">01 <span>·</span> JOB FLOW</div><h2>Current dispatches</h2></div>
                  <span className="ww-count">{activity.length} logged</span>
                </div>
                {activity.length ? (
                  <div className="ww-dispatch-list">
                    {activity.slice(0, 5).map((entry: HubEntry, index: number) => (
                      <article className="ww-dispatch" key={entry.id}>
                        <div className="ww-dispatch-rail"><span>{String(index + 1).padStart(2, '0')}</span><i /></div>
                        <div className="ww-dispatch-body">
                          <div className="ww-dispatch-top"><span className={`ww-job-state ${index === 0 ? 'latest' : ''}`}><i />{index === 0 ? 'LATEST ALLOCATION' : 'DISPATCHED'}</span><time><Clock3 size={12} />{timeLabel(entry.timestamp)}</time></div>
                          <h3>{entry.action_details}</h3>
                          <div className="ww-dispatch-meta"><span><ShieldCheck size={13} /> Approved by {entry.approved_by}</span><span>Ref. {String(entry.id).padStart(4, '0')}</span></div>
                        </div>
                        <ArrowUpRight size={16} className="ww-dispatch-arrow" />
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="ww-empty">
                    <div className="ww-empty-icon"><Truck size={21} /></div>
                    <div><b>Clear runway.</b><p>No dispatches have been logged in this session yet. Approved jobs will appear here.</p></div>
                  </div>
                )}
              </section>

              <section className={`ww-panel ww-crew-panel ${activeView !== 'people' ? 'ww-muted-panel' : ''}`}>
                <div className="ww-panel-head">
                  <div><div className="ww-section-index">02 <span>·</span> PEOPLE & VANS</div><h2>Crew on the floor</h2></div>
                  <span className="ww-count ww-count-green">{available.length} free</span>
                </div>
                <div className="ww-crew-summary">
                  <span className="ww-crew-big">{available.length}<small>ready</small></span>
                  <div className="ww-crew-meter"><div style={{ width: `${technicians.length ? (available.length / technicians.length) * 100 : 0}%` }} /></div>
                  <span className="ww-crew-total">{technicians.length} technicians</span>
                </div>
                <div className="ww-tech-list">
                  {technicians.map((tech: any) => (
                    <div className="ww-tech" key={tech.id}>
                      <span className={`ww-avatar ${tech.status === 'Available' ? '' : 'busy'}`}>{initials(tech.name)}</span>
                      <div className="ww-tech-details"><b>{tech.name}</b><span><MapPin size={11} />{tech.zone}<i /> <Truck size={11} />Van {tech.van_id}</span></div>
                      <span className={`ww-tech-status ${tech.status === 'Available' ? 'ready' : ''}`}><i />{tech.status}</span>
                    </div>
                  ))}
                  {!technicians.length && <div className="ww-inline-empty">No technicians are listed for this workshop.</div>}
                </div>
                <div className="ww-crew-footer"><Wrench size={13} /> Availability reflects current workshop status</div>
              </section>

              <section className={`ww-panel ww-stock-panel ${activeView !== 'stock' ? 'ww-muted-panel' : ''}`}>
                <div className="ww-panel-head">
                  <div><div className="ww-section-index">03 <span>·</span> PARTS CONTROL</div><h2>Stock pressure</h2></div>
                  <span className={`ww-count ${risks.length ? 'ww-count-warning' : 'ww-count-green'}`}>{risks.length ? `${risks.length} at risk` : 'All clear'}</span>
                </div>
                {risks.length ? (
                  <div className="ww-risk-list">
                    {risks.slice(0, 6).map((item: any) => (
                      <div className="ww-risk" key={item.id}>
                        <div className={`ww-risk-qty ${item.quantity === 0 ? 'zero' : ''}`}><b>{item.quantity}</b><small>left</small></div>
                        <div className="ww-risk-copy"><b>{item.part_name}</b><span>Van {item.van_id} <i /> {item.quantity === 0 ? 'Out of stock' : 'Reorder soon'}</span></div>
                        <AlertTriangle size={15} className="ww-risk-icon" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ww-stock-clear"><span><ShieldCheck size={20} /></span><b>Stock is holding.</b><p>No van lines are at the low-stock threshold.</p></div>
                )}
                <div className="ww-stock-footer"><span className="ww-stock-key"><i /> 0 units</span><span className="ww-stock-key"><i /> 1–2 units</span><span>{inventory.length} tracked lines</span></div>
              </section>
            </div>
            <footer className="ww-footer"><span>DISPATCH HUB <i>·</i> WORKSHOP OPERATIONS</span><span><span className="ww-footer-dot" /> Updated {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <i>·</i> Demo workspace</span></footer>
          </>
        )}
      </main>
    </div>
  );
}

export function WorkshopWallboard() {
  return <DemoHubProvider><Wallboard /></DemoHubProvider>;
}
