import './_autoflow.css';
import { useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, Boxes, Check, CheckCircle2, ClipboardCheck,
  ClipboardList, Eraser, FileText, FlaskConical, History, Inbox, LockKeyhole, MapPin,
  Menu, Package, Radio, ScanSearch, Truck, Users, X,
} from 'lucide-react';
import { DemoHubProvider, getGetHubDataQueryKey, useAnalyzeRequest, useApproveDispatch, useGetHubData, useQueryClient } from './_shared/_api';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const APPROVER = 'Demo Dispatcher';
const SAMPLE =
  'Customer: Halvorsen Marine, slip 14. 2016 Yamaha console — dash went completely dark mid-trip, smelled hot plastic near the gauge pod. Engine still cranks. Owner says cluster flickered for a week before. Needs someone today, charter booked tomorrow 7am.';

function findMatches(hub: any, parts: string[]) {
  if (!hub || !parts?.length) return [];
  return hub.technicians
    .filter((tech: any) => tech.status === 'Available')
    .filter((tech: any) => parts.every((part) =>
      hub.inventory.some((item: any) =>
        item.van_id === tech.van_id && item.part_name.toLowerCase() === part.toLowerCase() && item.quantity > 0,
      ),
    ));
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

function dateTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return `${date.toLocaleDateString([], { month: 'short', day: '2-digit' })} · ${date.toLocaleTimeString([], { hour12: false })}`;
}

function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const hubQ = useGetHubData({ query: { queryKey: getGetHubDataQueryKey() } });
  const analyze = useAnalyzeRequest();
  const approve = useApproveDispatch();
  const [notes, setNotes] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [approveError, setApproveError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const requestId = useRef(0);
  const hub = hubQ.data;
  const matches = useMemo(() => findMatches(hub, analysis?.result.parts || []), [hub, analysis]);
  const match = matches[0] || null;
  const technicians = hub?.technicians || [];
  const inventory = useMemo(
    () => [...(hub?.inventory || [])].sort((a: any, b: any) => a.van_id - b.van_id || a.part_name.localeCompare(b.part_name)),
    [hub],
  );
  const activity = useMemo(
    () => [...(hub?.activity_log || [])].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || b.id - a.id),
    [hub],
  );
  const availableCount = technicians.filter((tech: any) => tech.status === 'Available').length;
  const lowStockCount = inventory.filter((item: any) => item.quantity <= 2).length;

  const updateNotes = (value: string) => {
    requestId.current += 1;
    setNotes(value);
    if (analysis && analysis.forText !== value.trim()) setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const runAnalysis = async () => {
    const text = notes.trim();
    if (!text || analyze.isPending) return;
    const id = ++requestId.current;
    setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
    try {
      const result = await analyze.mutateAsync({ data: { text } });
      if (id === requestId.current) setAnalysis({ result, forText: text });
    } catch (error: any) {
      if (id === requestId.current) setAnalysisError(error?.data?.error || error?.message || 'Analysis could not be completed.');
    }
  };

  const approveDispatch = async () => {
    if (!analysis || analysis.forText !== notes.trim() || !match || approve.isPending) return;
    const snapshot = { tech: match, parts: analysis.result.parts };
    setApproveError('');
    try {
      const updated = await approve.mutateAsync({
        data: { tech_id: snapshot.tech.id, van_id: snapshot.tech.van_id, parts: snapshot.parts, approved_by: APPROVER },
      });
      await qc.cancelQueries({ queryKey: getGetHubDataQueryKey() });
      qc.setQueryData(getGetHubDataQueryKey(), updated);
      setAnalysis(null);
      requestId.current += 1;
      toast({
        title: 'Job dispatched',
        description: `${snapshot.tech.name} · Van ${snapshot.tech.van_id} assigned. ${snapshot.parts.length} parts reserved.`,
      });
    } catch (error: any) {
      const message = error?.data?.error || error?.message || 'Dispatch could not be approved.';
      setApproveError(message);
      toast({ title: 'Dispatch failed', description: message, variant: 'destructive' });
    }
  };

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
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
          <nav className="af-nav" aria-label="Dashboard sections">
            <button className="active" onClick={() => jumpTo('overview')}><Activity size={14} /> Overview</button>
            <button onClick={() => jumpTo('intake')}><Inbox size={14} /> Repair intake</button>
            <button onClick={() => jumpTo('analysis')}><ScanSearch size={14} /> Analysis & match</button>
            <button onClick={() => jumpTo('technicians')}><Users size={14} /> Technicians</button>
            <button onClick={() => jumpTo('stock')}><Boxes size={14} /> Van stock</button>
            <button onClick={() => jumpTo('audit')}><History size={14} /> Dispatch log</button>
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
            <span><b>Demo workspace: Dispatch Hub.</b> Sample data only. Mock analysis and local state; no live suppliers or production API connected.</span>
          </div>
          <main className="af-content">
            <section id="overview" className="af-topline">
              <div>
                <p className="af-kicker af-eyebrow">Live demo</p>
                <h1 className="af-title">Workshop dispatch</h1>
                <p className="af-subtitle">From unstructured fault notes to a ready-to-go van allocation.</p>
              </div>
              <div className="af-actions">
                <span className="af-status"><span className="af-dot" /> Local demo state</span>
                <button className="af-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
                  {menuOpen ? <X size={17} /> : <Menu size={17} />}
                </button>
              </div>
            </section>

            <section className="af-stats" aria-label="Dispatch overview">
              <div className="af-stat accent">
                <div className="af-eyebrow">Ready to assign</div>
                <div className="af-stat-value">{analysis && match ? '1' : '—'}</div>
                <div className="af-stat-foot">{analysis && match ? 'Stock-qualified technician' : 'Analyze intake to find a match'}</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Available techs</div>
                <div className="af-stat-value">{availableCount}<span style={{fontSize:14,color:'#85817a'}}>/{technicians.length}</span></div>
                <div className="af-stat-foot">Across active workshop zones</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Low stock lines</div>
                <div className="af-stat-value">{lowStockCount}</div>
                <div className="af-stat-foot">Two units or fewer across vans</div>
              </div>
              <div className="af-stat">
                <div className="af-eyebrow">Dispatched today</div>
                <div className="af-stat-value">{activity.length}</div>
                <div className="af-stat-foot">Recorded in this demo session</div>
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
                      <button className="af-quiet-btn" type="button" onClick={() => updateNotes(SAMPLE)} disabled={analyze.isPending}><FileText size={12} /> Load sample</button>
                      <button className="af-quiet-btn" type="button" onClick={() => updateNotes('')} disabled={analyze.isPending || !notes}><Eraser size={12} /> Clear</button>
                    </span>
                  </div>
                  <textarea
                    className="af-textarea"
                    value={notes}
                    onChange={(event) => updateNotes(event.target.value)}
                    onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') runAnalysis(); }}
                    maxLength={5000}
                    placeholder="Paste the customer's message, call notes or technician scribbles. Messy is fine."
                    aria-label="Fault notes"
                  />
                  {analysisError && <p className="af-error" role="alert">{analysisError}</p>}
                  <button className="af-primary" type="button" onClick={runAnalysis} disabled={!notes.trim() || analyze.isPending}>
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
                        {match ? (
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
                        <button className="af-approve" type="button" onClick={approveDispatch} disabled={!match || approve.isPending}>
                          {approve.isPending ? <Activity size={14} /> : <CheckCircle2 size={14} />}
                          {approve.isPending ? 'Allocating parts…' : 'Approve & dispatch job'}
                        </button>
                        <p className="af-audit-note">Approver: <b>{APPROVER}</b> · approval is added to the session audit log</p>
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
                    {technicians.map((tech: any) => (
                      <div className="af-tech" key={tech.id}>
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
                        {inventory.map((item: any) => {
                          const isRequired = item.van_id === match?.van_id && analysis?.result.parts.some((part: string) => part.toLowerCase() === item.part_name.toLowerCase());
                          return <tr key={item.id} className={isRequired ? 'highlight' : ''}>
                            <td>V-{item.van_id}</td><td>{item.part_name}</td><td><span className={`af-qty ${item.quantity <= 2 ? 'low' : ''}`}>{item.quantity}</span></td>
                          </tr>;
                        })}
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
                <span className="af-inline-actions" style={{fontSize:9,color:'#89867f'}}><LockKeyhole size={11} /> Session record</span>
              </header>
              <div className="af-card-body">
                {activity.length ? (
                  <div className="af-audit-list">
                    {activity.map((entry: any) => (
                      <div className="af-audit-item" key={entry.id}>
                        <span className="af-audit-dot" />
                        <time className="af-audit-time">{dateTime(entry.timestamp)}</time>
                        <p>{entry.action_details}</p>
                        <div className="af-audit-by">Approved by {entry.approved_by}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="af-empty-log"><History size={15} style={{verticalAlign:'middle',marginRight:6}} /> No dispatches in this demo session. Approved allocations will appear here.</div>
                )}
              </div>
            </section>
            <div className="af-footer">Dispatch Hub · Local demo state · No live workshop data</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AutoFlow() {
  return <DemoHubProvider><Dashboard /><Toaster /></DemoHubProvider>;
}
