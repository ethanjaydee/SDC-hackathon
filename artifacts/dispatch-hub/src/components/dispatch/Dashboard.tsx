import './autoflow.css';
import { useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, Boxes, Check, CheckCircle2, ClipboardCheck,
  ClipboardList, Eraser, FileText, FlaskConical, History, Inbox, LockKeyhole, MapPin,
  Menu, Package, Radio, RefreshCw, ScanSearch, Truck, Users, X,
} from 'lucide-react';
import { APPROVER, useDispatchHub } from './useDispatchHub';

const SAMPLE =
  'Customer: Halvorsen Marine, slip 14. 2016 Yamaha console — dash went completely dark mid-trip, smelled hot plastic near the gauge pod. Engine still cranks. Owner says cluster flickered for a week before. Needs someone today, charter booked tomorrow 7am.';

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

function dateTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return `${date.toLocaleDateString([], { month: 'short', day: '2-digit' })} · ${date.toLocaleTimeString([], { hour12: false })}`;
}

export default function Dashboard() {
  const {
    hubQ, analyze, approve, notes, analysis, analysisError, approveError,
    matches, match, technicians, inventory, activity,
    availableCount, lowStockCount, dispatchedToday,
    updateNotes, runAnalysis, approveDispatch,
  } = useDispatchHub();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const jumpTo = (id: string) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setActiveSection(id);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  };

  return (
    <div className="autoflow">
      <div className="af-shell">
        <aside className={`af-sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="af-brand">
            <span className="af-brand-mark"><Radio size={15} strokeWidth={2.5} /></span>
            <span className="af-brand-name">Dispatch Hub</span>
          </div>
          <div className="af-nav-label">Workshop</div>
          <nav id="dispatch-navigation" className="af-nav" aria-label="Dashboard sections">
            {[
              { id: 'overview', label: 'Overview', Icon: Activity },
              { id: 'intake', label: 'Repair intake', Icon: Inbox },
              { id: 'analysis', label: 'Analysis & match', Icon: ScanSearch },
              { id: 'technicians', label: 'Technicians', Icon: Users },
              { id: 'stock', label: 'Van stock', Icon: Boxes },
              { id: 'audit', label: 'Dispatch log', Icon: History },
            ].map(({ id, label, Icon }) => <button key={id} className={activeSection === id ? 'active' : ''} aria-current={activeSection === id ? 'location' : undefined} onClick={() => jumpTo(id)}><Icon size={14} /> {label}</button>)}
          </nav>
          <div className="af-side-note">
            <span className="af-eyebrow">Dispatch desk</span>
            <strong>One clear handoff.</strong>
            <p>Fault notes become an accountable technician and stocked parts allocation.</p>
          </div>
        </aside>

        <div className="af-main">
          <div className="af-demo-banner">
            <FlaskConical size={12} />
            <span><b>Demo workspace: Dispatch Hub.</b> Synthetic data and mock AI analysis. Approvals update the demo inventory and audit log through the API.</span>
          </div>
          <main className="af-content">
            <section id="overview" className="af-topline">
              <div>
                <p className="af-kicker af-eyebrow">Live demo</p>
                <h1 className="af-title">Workshop dispatch</h1>
                <p className="af-subtitle">From unstructured fault notes to a ready-to-go van allocation.</p>
              </div>
              <div className="af-actions">
                <span className="af-status" data-testid="status-connection"><span className={`af-dot ${hubQ.isError ? 'offline' : ''}`} /> {hubQ.isError ? 'Connection lost' : hubQ.isLoading ? 'Connecting…' : 'Live · 10s refresh'}</span>
                <button className="af-menu-toggle" aria-controls="dispatch-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
                  {menuOpen ? <X size={17} /> : <Menu size={17} />}
                </button>
              </div>
            </section>

            {(hubQ.isLoading || hubQ.isError) && <div className={hubQ.isError ? 'af-error af-hub-message' : 'af-hub-message'} role={hubQ.isError ? 'alert' : 'status'}>
              {hubQ.isError ? <><span>{hubQ.data ? 'Connection lost. Showing the last hub data; approvals are paused until reconnected.' : 'Unable to load technicians, inventory, or dispatch history.'}</span><button className="af-quiet-btn" onClick={() => void hubQ.refetch()} disabled={hubQ.isFetching}><RefreshCw size={13} /> Retry connection</button></> : 'Loading technicians, inventory, and dispatch history…'}
            </div>}
            <section className="af-stats" aria-label="Dispatch overview" aria-busy={hubQ.isLoading}>
              <div className="af-stat accent">
                <div className="af-eyebrow">Ready to assign</div>
                <div className="af-stat-value">{analysis && match ? '1' : '—'}</div>
                <div className="af-stat-foot">{analysis && match ? 'Stock-qualified technician' : 'Analyze intake to find a match'}</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Available techs</div>
                <div className="af-stat-value" data-testid="stat-available">{hubQ.data ? availableCount : '—'}<span style={{fontSize:14,color:'#85817a'}}>/{hubQ.data ? technicians.length : '—'}</span></div>
                <div className="af-stat-foot">Across active workshop zones</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Low stock lines</div>
                <div className="af-stat-value">{hubQ.data ? lowStockCount : '—'}</div>
                <div className="af-stat-foot">Two units or fewer across vans</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Dispatched today</div>
                <div className="af-stat-value">{hubQ.data ? dispatchedToday : '—'}</div>
                <div className="af-stat-foot">Approved allocations today</div>
              </div>
            </section>

            <div className="af-grid">
              <section id="intake" className="af-card">
                <header className="af-card-head">
                  <h2 className="af-card-title"><span className="af-step">01</span><Inbox size={15} /> Repair intake</h2>
                  <span className="af-mock-pill"><FlaskConical size={10} /> Mock AI</span>
                </header>
                <div className="af-card-body">
                  <div className="af-label">
                    <span>Fault notes</span>
                    <span className="af-inline-actions">
                      <button className="af-quiet-btn" type="button" onClick={() => updateNotes(SAMPLE)} disabled={analyze.isPending || approve.isPending}><FileText size={12} /> Load sample</button>
                      <button className="af-quiet-btn" type="button" onClick={() => updateNotes('')} disabled={analyze.isPending || approve.isPending || !notes}><Eraser size={12} /> Clear</button>
                    </span>
                  </div>
                  <textarea
                    className="af-textarea"
                    data-testid="input-fault-notes"
                    disabled={approve.isPending}
                    value={notes}
                    onChange={(event) => updateNotes(event.target.value)}
                    onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') runAnalysis(); }}
                    maxLength={5000}
                    placeholder="Paste the customer's message, call notes or technician scribbles. Messy is fine."
                    aria-label="Fault notes"
                  />
                  {analysisError && <p className="af-error" role="alert">{analysisError}</p>}
                  <button className="af-primary" data-testid="button-analyze" type="button" onClick={runAnalysis} disabled={!notes.trim() || analyze.isPending || approve.isPending}>
                    <ScanSearch size={15} /> {analyze.isPending ? 'Reading repair notes…' : 'Analyze request'} {!analyze.isPending && <ArrowDownRight size={14} />}
                  </button>
                  <p className="af-hint">Mock AI mode: analysis returns the fixed sample diagnosis regardless of the notes entered. Use Ctrl + Enter to analyze.</p>
                </div>
              </section>

              <section id="analysis" className="af-card">
                <header className="af-card-head">
                  <h2 className="af-card-title"><span className="af-step">02</span><ClipboardCheck size={15} /> Analysis & allocation</h2>
                  <span className="af-mock-pill"><FlaskConical size={10} /> Demo result</span>
                </header>
                <div className="af-card-body">
                  {analyze.isPending ? (
                    <div className="af-empty" aria-live="polite">
                      <div className="af-empty-icon"><ScanSearch size={18} /></div>
                      <strong>Reviewing the fault notes</strong>
                      <p>Checking the likely issue, required parts and available van stock.</p>
                    </div>
                  ) : analysis ? (
                    <div className="af-result">
                      <div>
                        <div className="af-label">Diagnosed issue <span>Priority review</span></div>
                        <div className="af-issue-row">
                          <h3 className="af-issue">{analysis.result.issue}</h3>
                          <span className="af-urgency"><AlertTriangle size={10} /> {analysis.result.urgency} urgency</span>
                        </div>
                      </div>
                      <div>
                        <div className="af-label">Required parts</div>
                        <div className="af-part-list">{analysis.result.parts.map((part: string) => (
                          <span className="af-part" key={part}><Package size={12} color="#e85a2a" />{part}</span>
                        ))}</div>
                      </div>
                      <div>
                        <div className="af-label">Stock-aware technician match <span>{matches.length} qualified</span></div>
                        {hubQ.isLoading ? <p className="af-hint" role="status">Checking hub availability…</p> : !hubQ.data ? <p className="af-error">Reconnect to the hub to find a technician.</p> : match ? (
                          <div className="af-match">
                            <div className="af-match-main">
                              <div className="af-person">
                                <span className="af-avatar">{initials(match.name)}</span>
                                <div>
                                  <div className="af-person-name">{match.name}</div>
                                  <div className="af-person-meta"><span><MapPin size={10} /> {match.zone}</span><span><Truck size={10} /> Van {match.van_id}</span></div>
                                </div>
                              </div>
                              <span className="af-available"><span className="af-dot" /> Available</span>
                            </div>
                            <p className="af-match-note"><Check size={11} /> Van {match.van_id} carries every required part in stock.</p>
                          </div>
                        ) : (
                          <div className="af-no-match"><b>No qualified technician found.</b><br />No available technician has every required part in their van. Review stock below before approving.</div>
                        )}
                      </div>
                      {approveError && <p className="af-error" role="alert">{approveError}</p>}
                      <div className="af-divider">
                        <button className="af-approve" data-testid="button-approve" type="button" onClick={approveDispatch} disabled={!match || approve.isPending || hubQ.isError}>
                          {approve.isPending ? <Activity size={14} /> : <CheckCircle2 size={14} />}
                          {approve.isPending ? 'Allocating parts…' : 'Approve & dispatch job'}
                        </button>
                        <p className="af-audit-note">Approver: <b>{APPROVER}</b> · approval is saved to the immutable audit log</p>
                      </div>
                    </div>
                  ) : (
                    <div className="af-empty">
                      <div className="af-empty-icon"><ClipboardList size={18} /></div>
                      <strong>Waiting for repair notes</strong>
                      <p>Add an intake on the left to see the likely fault, parts needed and a technician whose van is stocked for the job.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="af-lower">
              <section id="technicians" className="af-card">
                <header className="af-card-head">
                  <h2 className="af-card-title"><span className="af-step">03</span><Users size={15} /> Available technicians</h2>
                  <span className="af-mono" style={{color:'#89867f'}}>{availableCount} available</span>
                </header>
                <div className="af-card-body">
                  <div className="af-tech-list">
                    {technicians.map((tech) => (
                      <div className="af-tech" key={tech.id} data-testid={`technician-${tech.id}`}>
                        <div className="af-person">
                          <span className="af-avatar">{initials(tech.name)}</span>
                          <div className="af-tech-info">
                            <div className="af-tech-name">{tech.name}</div>
                            <div className="af-tech-sub"><span><MapPin size={9} /> {tech.zone}</span><span><Truck size={9} /> Van {tech.van_id}</span></div>
                          </div>
                        </div>
                        <span className={`af-status-tag ${tech.status !== 'Available' ? 'busy' : ''}`}>{tech.status}</span>
                      </div>
                    ))}
                    {!technicians.length && <p className="af-hint">{hubQ.isLoading ? 'Loading technicians…' : hubQ.isError ? 'Technician data unavailable.' : 'No technicians found.'}</p>}
                  </div>
                </div>
              </section>

              <section id="stock" className="af-card">
                <header className="af-card-head">
                  <h2 className="af-card-title"><span className="af-step">04</span><Boxes size={15} /> Van stock</h2>
                  <span className="af-mono" style={{color:'#89867f'}}>{inventory.length} SKU lines</span>
                </header>
                <div className="af-card-body">
                  <div className="af-stock-wrap">
                    <table className="af-table">
                      <thead><tr><th>Van</th><th>Part</th><th>On hand</th></tr></thead>
                      <tbody>
                        {inventory.map((item) => {
                          const isRequired = item.van_id === match?.van_id && analysis?.result.parts.some((part: string) => part.toLowerCase() === item.part_name.toLowerCase());
                          return <tr key={item.id} className={isRequired ? 'highlight' : ''}>
                            <td>V-{item.van_id}</td><td>{item.part_name}</td><td><span data-testid={`text-qty-${item.id}`} className={`af-qty ${item.quantity <= 2 ? 'low' : ''}`}>{item.quantity}</span></td>
                          </tr>;
                        })}
                        {!inventory.length && <tr><td colSpan={3}>{hubQ.isLoading ? 'Loading inventory…' : hubQ.isError ? 'Inventory data unavailable.' : 'No stock items found.'}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="af-hint">Low stock is highlighted at two units or fewer. Green rows show parts needed for the current qualified match.</p>
                </div>
              </section>
            </div>

            <section id="audit" className="af-card" style={{marginTop:12}}>
              <header className="af-card-head">
                <h2 className="af-card-title"><span className="af-step">05</span><History size={15} /> Dispatch audit log</h2>
                <span className="af-inline-actions" style={{fontSize:9,color:'#89867f'}}><LockKeyhole size={11} /> Immutable record</span>
              </header>
              <div className="af-card-body">
                {activity.length ? (
                  <div className="af-audit-list">
                    {activity.map((entry) => (
                      <div className="af-audit-item" key={entry.id}>
                        <span className="af-audit-dot" />
                        <time className="af-audit-time">{dateTime(entry.timestamp)}</time>
                        <p>{entry.action_details}</p>
                        <div className="af-audit-by">Approved by {entry.approved_by}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="af-empty-log"><History size={15} style={{verticalAlign:'middle',marginRight:6}} /> {hubQ.isLoading ? 'Loading dispatch history…' : hubQ.isError ? 'Dispatch history unavailable until the hub reconnects.' : 'No dispatches yet. Approved allocations will appear here.'}</div>
                )}
              </div>
            </section>
            <div className="af-footer">Dispatch Hub · API-backed synthetic demo · Mock AI analysis</div>
          </main>
        </div>
      </div>
    </div>
  );
}
