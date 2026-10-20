import { useEffect, useRef, useState } from 'react';
import { PreviewLink as Link, previewHub } from './_preview';
import { Activity, Boxes, FlaskConical, History, Inbox, Map as MapIcon, Menu, Radio, RefreshCw, ScanSearch, Users, X } from 'lucide-react';
import OverviewPage from './OverviewPage';

export default function Shell() {
  const hub = previewHub;
  const { hubQ, analysis } = hub;
  const location = '/';
  const [menuOpen, setMenuOpen] = useState(false);
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
          <span><b>Design preview: Dispatch Hub.</b> Snapshot of synthetic demo data. Live approval and completion actions are not connected.</span>
          <span className="af-status"><span className="af-dot" /> Snapshot preview</span>
        </div>
        <main className="af-content">
          {(hubQ.isLoading || hubQ.isError) && <div className={hubQ.isError ? 'af-error af-hub-message' : 'af-hub-message'} role={hubQ.isError ? 'alert' : 'status'}>
            {hubQ.isError ? <><span>{hubQ.data ? 'Connection lost. Showing the last hub data; approvals are paused until reconnected.' : 'Unable to load technicians, inventory, or dispatch history.'}</span><button className="af-quiet-btn" onClick={() => void hubQ.refetch()} disabled={hubQ.isFetching}><RefreshCw size={13} /> Retry connection</button></> : 'Loading technicians, inventory, and dispatch history…'}
          </div>}
          <div key={location} className="af-route">
            <OverviewPage hub={hub} />
          </div>
          <div className="af-footer">Dispatch Hub · Read-only design snapshot · Running app unchanged</div>
        </main>
      </div>
    </div>
  );
}
