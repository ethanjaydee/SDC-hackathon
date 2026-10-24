import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { Activity, BarChart3, FlaskConical, History, Inbox, Loader2, LogOut, Map as MapIcon, Menu, Radio, Repeat, Star, Truck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useDispatchHub } from './useDispatchHub';
import OverviewPage from './OverviewPage';
import IntakePage from './IntakePage';
import AnalysisPage from './AnalysisPage';
import MapPage from './MapPage';
import WorkshopAnalysisPage from './WorkshopAnalysisPage';
import ReviewsPage from './ReviewsPage';
import { LogPage, TechniciansPage } from './ListPages';
import { InlineError, StatusBadge } from './shared';
import { ConnectionStatus, useConnection } from './ConnectionStatus';
import { RouteBoundary } from './RouteBoundary';
import { ThemeToggle } from './theme';
import { DemoSessionProvider, useDemoSession } from './session';
import RoleChooser from './RoleChooser';
import TransportPage from './TransportPage';
import { TechnicianHistory, TechnicianOverview, TechnicianReviews } from './TechnicianViews';
import NotFound from '@/pages/not-found';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Radio size={16} strokeWidth={2.5} /></span>
      <span className="font-display text-[17px] font-semibold tracking-tight">Dispatch Hub</span>
    </div>
  );
}

export default function Dashboard() {
  return <DemoSessionProvider><SessionGate /></DemoSessionProvider>;
}

function SessionGate() {
  const { session } = useDemoSession();
  return session ? <Workspace /> : <RoleChooser />;
}

function Workspace() {
  const { technicianId, isTechnician, signOut } = useDemoSession();
  const hub = useDispatchHub();
  const { hubQ, lowStockCount, pendingAction } = hub;
  const connection = useConnection(hubQ);
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location]);

  const afterApproval = (tech: { name: string }) => {
    setNotice(`Dispatch recorded for ${tech.name}. An available van was allocated and parts were reserved at approval.`);
  };

  const me = hub.technicians.find((t) => t.id === technicianId);
  useEffect(() => {
    if (isTechnician && hubQ.data && !me) signOut();
  }, [isTechnician, hubQ.data, me, signOut]);
  const bossOnly = (path: string) => path.startsWith('/technicians') || path.startsWith('/workshop-analysis') || path.startsWith('/today') || path.startsWith('/suppliers') || path.startsWith('/reorders');

  const items = [
    { to: '/', label: 'Overview', Icon: Activity },
    { to: '/intake', label: 'Work Order', Icon: Inbox },
    { to: '/map', label: 'Map', Icon: MapIcon },
    ...(isTechnician ? [] : [{ to: '/technicians', label: 'Technicians', Icon: Users }]),
    { to: '/transport', label: 'Transport', Icon: Truck, count: lowStockCount || undefined },
    { to: '/log', label: 'Service History', Icon: History },
    { to: '/reviews', label: 'Reviews', Icon: Star },
    ...(isTechnician ? [] : [{ to: '/workshop-analysis', label: 'Analysis', Icon: BarChart3 }]),
  ] as { to: string; label: string; Icon: typeof Activity; badge?: string; count?: number }[];

  const nav = (id: string) => (
    <nav id={id} aria-label="Dashboard sections" className="space-y-0.5">
      {items.map(({ to, label, Icon, badge, count }) => {
        const active = to === '/' ? location === '/' : to === '/log' ? location === '/log' || location === '/today' : location.startsWith(to);
        return (
          <Link key={to} href={to} aria-current={active ? 'page' : undefined}
            className={cn('flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
              active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground')}>
            <Icon size={16} strokeWidth={1.8} className={active ? 'text-primary' : ''} />
            <span className="flex-1 truncate">{label}</span>
            {badge && <StatusBadge tone="pending">{badge}</StatusBadge>}
            {count != null && <span className="rounded-full bg-pending/15 px-1.5 font-mono text-[11px] text-pending">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const isAnalysisRoute = location.startsWith('/analysis/');
  const profileName = isTechnician ? me?.name ?? 'Technician' : 'Boss';
  const profileRole = isTechnician ? 'Technician · demo identity' : 'Dispatch CEO';
  const sideFooter = (
    <div className="space-y-2">
    <div role="note" aria-label={`Demo profile: ${profileName}, ${profileRole}`} className="rounded-lg border border-sidebar-border bg-card/60 p-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">{profileName[0]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
            <span className="shrink-0 rounded border border-sidebar-border px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider text-muted-foreground">DEMO</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{profileRole}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Demo role selection, not real security.</p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" size="sm" onClick={signOut} data-testid="button-switch-role"><Repeat size={12} /> Switch role</Button>
      <Button type="button" variant="outline" size="sm" onClick={signOut} data-testid="button-sign-out"><LogOut size={12} /> Sign out</Button>
    </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-5 border-r border-sidebar-border bg-sidebar p-4 lg:flex" aria-label="Dispatch Hub navigation">
        <Brand />
        <p className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workshop</p>
        <div className="-mt-3 flex-1 overflow-y-auto">{nav('dispatch-navigation-desktop')}</div>
        {sideFooter}
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[280px] flex-col gap-5 bg-sidebar p-4"
          onCloseAutoFocus={(event) => { event.preventDefault(); menuButton.current?.focus(); }}>
          <SheetTitle asChild><div><Brand /></div></SheetTitle>
          <SheetDescription className="sr-only">Navigate between Dispatch Hub sections</SheetDescription>
          <div className="flex-1 overflow-y-auto">{nav('dispatch-navigation-mobile')}</div>
          {sideFooter}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex min-h-14 items-center gap-2 px-3 sm:px-6">
            <Button ref={menuButton} type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" aria-controls="dispatch-navigation-mobile" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} data-testid="button-menu">
              <Menu size={18} />
            </Button>
            <div className="lg:hidden"><Brand /></div>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {pendingAction && <StatusBadge tone="busy" pulse className="hidden sm:inline-flex"><Loader2 size={10} className="animate-spin" /> {pendingAction}</StatusBadge>}
              <ConnectionStatus q={hubQ} />
              <ThemeToggle />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground sm:px-6" role="note">
            <FlaskConical size={12} className="shrink-0" />
            <span className="truncate"><strong className="text-foreground">Demo workspace.</strong> Synthetic job data. AI suggestions need your review; approvals update demo inventory and history.</span>
          </div>
        </header>

        <main className={cn(
          'mx-auto w-full flex-1 space-y-4 px-3 py-6 sm:px-6 md:py-8',
          isAnalysisRoute ? 'max-w-[1920px]' : 'max-w-[1320px]',
        )}>
          {hub.connectionLost && (
            <InlineError onRetry={connection.retryIn && connection.retryIn > 0 ? undefined : () => void hubQ.refetch()} retrying={hubQ.isFetching} retryLabel="Retry connection">
              {connection.status === 429
                ? 'The hub is rate limiting requests. Updates resume automatically after the retry window.'
                : hubQ.data ? 'Connection lost. Showing the last hub data; approvals are paused until reconnected.' : 'Unable to load technicians, inventory or dispatch history.'}
            </InlineError>
          )}
          <div key={location} className="dh-rise">
            <RouteBoundary route={location}>
              {isTechnician && bossOnly(location) ? <Redirect to={location.startsWith('/today') ? '/log' : '/'} replace /> : (
              <Switch>
                <Route path="/">{isTechnician ? <TechnicianOverview hub={hub} /> : <OverviewPage hub={hub} />}</Route>
                <Route path="/intake"><IntakePage hub={hub} /></Route>
                <Route path="/analysis"><Redirect to="/intake" replace /></Route>
                <Route path="/analysis/:id">{(params) => <AnalysisPage hub={hub} conversationId={Number(params.id)} onApprove={afterApproval} />}</Route>
                <Route path="/workshop-analysis"><WorkshopAnalysisPage hub={hub} /></Route>
                <Route path="/reviews">{isTechnician ? <TechnicianReviews hub={hub} /> : <ReviewsPage hub={hub} />}</Route>
                <Route path="/transport"><TransportPage hub={hub} /></Route>
                <Route path="/map"><MapPage hub={hub} /></Route>
                <Route path="/technicians"><TechniciansPage hub={hub} /></Route>
                <Route path="/stock/low"><Redirect to="/transport" replace /></Route>
                <Route path="/stock"><Redirect to="/transport" replace /></Route>
                <Route path="/suppliers"><Redirect to="/transport" replace /></Route>
                <Route path="/reorders"><Redirect to="/transport" replace /></Route>
                <Route path="/today"><LogPage hub={hub} notice={notice} todayOnly /></Route>
                <Route path="/log">{isTechnician ? <TechnicianHistory hub={hub} /> : <LogPage hub={hub} notice={notice} />}</Route>
                <Route component={NotFound} />
              </Switch>
              )}
            </RouteBoundary>
          </div>
          <footer className="pt-6 font-mono text-[11px] text-muted-foreground">Dispatch Hub · Synthetic demo data · AI or rule-based source shown per result</footer>
        </main>
      </div>
    </div>
  );
}
