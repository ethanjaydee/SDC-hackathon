import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { Activity, BarChart3, Boxes, FlaskConical, History, Inbox, Loader2, Map as MapIcon, Menu, Radio, Star, Users } from 'lucide-react';
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
import { LogPage, StockPage, TechniciansPage } from './ListPages';
import { InlineError, StatusBadge } from './shared';
import { ConnectionStatus, useConnection } from './ConnectionStatus';
import { RouteBoundary } from './RouteBoundary';
import { ThemeToggle } from './theme';
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
  const hub = useDispatchHub();
  const { hubQ, lowStockCount, pendingAction } = hub;
  const connection = useConnection(hubQ);
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location]);

  const afterApproval = (tech: { name: string; van_id: number }) => {
    setNotice(`Dispatch recorded for ${tech.name} · Van ${tech.van_id}. Parts were reserved at approval.`);
    navigate('/log');
  };

  const items = [
    { to: '/', label: 'Overview', Icon: Activity },
    { to: '/intake', label: 'Service Requests', Icon: Inbox },
    { to: '/map', label: 'Technician map', Icon: MapIcon },
    { to: '/technicians', label: 'Manpower', Icon: Users },
    { to: '/stock', label: 'Inventory', Icon: Boxes, count: lowStockCount || undefined },
    { to: '/log', label: 'Service History', Icon: History },
    { to: '/reviews', label: 'Reviews', Icon: Star },
    { to: '/workshop-analysis', label: 'Analysis', Icon: BarChart3 },
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
  const sideFooter = (
    <div role="note" aria-label="Demo profile: John Doe, Dispatch manager" className="rounded-lg border border-sidebar-border bg-card/60 p-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">JD</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">John Doe</p>
            <span className="shrink-0 rounded border border-sidebar-border px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider text-muted-foreground">DEMO</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">Dispatch manager</p>
        </div>
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
              <Switch>
                <Route path="/"><OverviewPage hub={hub} /></Route>
                <Route path="/intake"><IntakePage /></Route>
                <Route path="/analysis"><Redirect to="/intake" replace /></Route>
                <Route path="/analysis/:id">{(params) => <AnalysisPage hub={hub} conversationId={Number(params.id)} onApprove={afterApproval} />}</Route>
                <Route path="/workshop-analysis"><WorkshopAnalysisPage hub={hub} /></Route>
                <Route path="/reviews"><ReviewsPage /></Route>
                <Route path="/map"><MapPage hub={hub} /></Route>
                <Route path="/technicians"><TechniciansPage hub={hub} /></Route>
                <Route path="/stock/low"><StockPage hub={hub} lowOnly /></Route>
                <Route path="/stock"><StockPage hub={hub} /></Route>
                <Route path="/suppliers"><Redirect to="/stock" replace /></Route>
                <Route path="/reorders"><Redirect to="/stock" replace /></Route>
                <Route path="/today"><LogPage hub={hub} notice={notice} todayOnly /></Route>
                <Route path="/log"><LogPage hub={hub} notice={notice} /></Route>
                <Route component={NotFound} />
              </Switch>
            </RouteBoundary>
          </div>
          <footer className="pt-6 font-mono text-[11px] text-muted-foreground">Dispatch Hub · Synthetic demo data · AI or rule-based source shown per result</footer>
        </main>
      </div>
    </div>
  );
}
