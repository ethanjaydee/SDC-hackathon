import './autoflow.css';
import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { Activity, Boxes, FlaskConical, History, Inbox, Map as MapIcon, Menu, Radio, RefreshCw, ScanSearch, Users, X } from 'lucide-react';
import { useDispatchHub } from './useDispatchHub';
import OverviewPage from './OverviewPage';
import IntakePage from './IntakePage';
import AnalysisPage from './AnalysisPage';
import MapPage from './MapPage';
import { LogPage, StockPage, TechniciansPage } from './ListPages';
import { IntakeFirst } from './shared';
import NotFound from '@/pages/not-found';

export default function Dashboard() {
  const hub = useDispatchHub();
  const { hubQ, analysis, match, approveDispatch } = hub;
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [completingDispatch, setCompletingDispatch] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location]);
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const previousFocus = document.activeElement as HTMLElement | null;
    const controls = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button');
    controls?.[0]?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (e.key === 'Tab' && controls?.length) {
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; previousFocus?.focus(); };
  }, [menuOpen]);

  const approve = async () => {
    if (completingDispatch) return;
    setCompletingDispatch(true);
    const who = match ? `${match.name} · Van ${match.van_id}` : '';
    if (await approveDispatch()) {
      setNotice(`Job dispatched. ${who} assigned and parts reserved.`);
      navigate('/log');
    }
    setCompletingDispatch(false);
  };

  const items = [
    { to: '/', label: 'Overview', Icon: Activity },
    { to: '/intake', label: 'Repair intake', Icon: Inbox },
    ...(analysis ? [{ to: '/analysis', label: 'Analysis & approval', Icon: ScanSearch }] : []),
    { to: '/map', label: 'Technician map', Icon: MapIcon },
    { to: '/technicians', label: 'Technicians', Icon: Users },
    { to: '/stock', label: 'Van stock', Icon: Boxes },
    { to: '/log', label: 'Dispatch log', Icon: History },
  ];

  return (
    <div className="autoflow">
      <div className="af-mobilebar">
        <span className="af-brand-name">Dispatch Hub</span>
        <button className="af-menu-toggle" aria-controls="dispatch-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
      {menuOpen && <div className="af-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside ref={sidebarRef} className={`af-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="af-brand"><span className="af-brand-mark"><Radio size={15} strokeWidth={2.5} /></span><span className="af-brand-name">Dispatch Hub</span><button className="af-sidebar-close af-menu-toggle" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={17} /></button></div>
        <div className="af-nav-label">Workshop</div>
        <nav id="dispatch-navigation" className="af-nav" aria-label="Dashboard sections">
          {items.map(({ to, label, Icon }) => {
            const active = to === '/' ? location === '/' : location.startsWith(to);
            return <Link key={to} href={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={14} /> {label}</Link>;
          })}
        </nav>
        <div className="af-side-note">
          <span className="af-eyebrow">Dispatch desk</span>
          <strong>One clear handoff.</strong>
          <p>Fault notes become an accountable technician and stocked parts allocation.</p>
        </div>
      </aside>

      <div className="af-main" ref={mainRef}>
        <div className="af-demo-banner">
          <FlaskConical size={12} />
          <span><b>Demo workspace: Dispatch Hub.</b> Synthetic data and mock AI analysis. Approvals update the demo inventory and audit log through the API.</span>
          <span className="af-status" data-testid="status-connection"><span className={`af-dot ${hubQ.isError ? 'offline' : ''}`} /> {hubQ.isError ? 'Connection lost' : hubQ.isLoading ? 'Connecting…' : 'Live · 10s refresh'}</span>
        </div>
        <main className="af-content">
          {(hubQ.isLoading || hubQ.isError) && <div className={hubQ.isError ? 'af-error af-hub-message' : 'af-hub-message'} role={hubQ.isError ? 'alert' : 'status'}>
            {hubQ.isError ? <><span>{hubQ.data ? 'Connection lost. Showing the last hub data; approvals are paused until reconnected.' : 'Unable to load technicians, inventory, or dispatch history.'}</span><button className="af-quiet-btn" onClick={() => void hubQ.refetch()} disabled={hubQ.isFetching}><RefreshCw size={13} /> Retry connection</button></> : 'Loading technicians, inventory, and dispatch history…'}
          </div>}
          <div key={location} className="af-route">
            <Switch>
              <Route path="/"><OverviewPage hub={hub} /></Route>
              <Route path="/intake"><IntakePage hub={hub} /></Route>
              <Route path="/analysis">{analysis ? <AnalysisPage hub={hub} onApprove={approve} /> : completingDispatch ? <div className="af-hub-message" role="status">Completing dispatch…</div> : hub.analyze.isPending ? <IntakeFirst text="Analysis in progress" /> : <Redirect to="/intake" replace />}</Route>
              <Route path="/map"><MapPage hub={hub} /></Route>
              <Route path="/technicians"><TechniciansPage hub={hub} /></Route>
              <Route path="/stock"><StockPage hub={hub} /></Route>
              <Route path="/log"><LogPage hub={hub} notice={notice} /></Route>
              <Route component={NotFound} />
            </Switch>
          </div>
          <div className="af-footer">Dispatch Hub · API-backed synthetic demo · Mock AI analysis</div>
        </main>
      </div>
    </div>
  );
}
