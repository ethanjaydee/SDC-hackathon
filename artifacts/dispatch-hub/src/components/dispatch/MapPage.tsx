import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, MapPinned } from 'lucide-react';
import { getGetTechnicianRouteQueryKey, useGetTechnicianRoute } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { DEMO_CUSTOMER_SITES, getTechnicianLocation } from './demoLocations';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, fieldClass, techTone, type Hub, type Tone } from './shared';
import { CompletionControl } from './CompletionControl';
import { cn } from '@/lib/utils';
import { LEVEL_NAME, LevelBadge, levelText } from './techMeta';
import { decodeGooglePolyline } from './routeGeometry';

type Readiness = 'Parts not checked' | 'Stock ready' | 'Missing parts';
const readinessTone: Record<Readiness, Tone> = { 'Parts not checked': 'idle', 'Stock ready': 'ok', 'Missing parts': 'err' };
const dispatchTone = { Active: 'busy', Completed: 'ok', Unknown: 'idle' } as const;

function formatRouteDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatRouteDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

function el(tag: string, cls: string, text?: string) {
  const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e;
}

export default function MapPage({ hub }: Hub) {
  const { technicians, inventory, activity, analysis, match, customerSite, customerSiteId, updateCustomerSite, hubQ, writePending } = hub;
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [tileErrors, setTileErrors] = useState(0);
  const routeQ = useGetTechnicianRoute(selected ?? 0, customerSiteId, {
    query: {
      queryKey: getGetTechnicianRouteQueryKey(selected ?? 0, customerSiteId),
      enabled: selected !== null,
      staleTime: 5 * 60 * 1000,
    },
  });
  const selectedRoute = routeQ.data?.technician_id === selected &&
    routeQ.data.customer_site_id === customerSiteId ? routeQ.data : null;
  const routePath = useMemo(
    () => selectedRoute?.status === 'ready' && selectedRoute.polyline
      ? decodeGooglePolyline(selectedRoute.polyline)
      : [],
    [selectedRoute],
  );
  const intakeCondition = analysis
    ? `Analysis ready · ${analysis.result.urgency} urgency`
    : hub.notes.trim() ? 'Draft intake · awaiting analysis' : 'No active repair intake';
  const savedSites = useMemo(() => {
    const groups = new Map<string, { site: NonNullable<(typeof activity)[number]['dispatch']>['customer_site']; entries: typeof activity }>();
    activity.forEach((entry) => {
      if (!entry.dispatch) return;
      const site = entry.dispatch.customer_site;
      const key = `${site.id}:${site.lat}:${site.lng}`;
      const group = groups.get(key) || { site, entries: [] };
      group.entries.push(entry);
      groups.set(key, group);
    });
    return [...groups.entries()];
  }, [activity]);

  const rows = useMemo(() => technicians.map((t) => {
    const loc = getTechnicianLocation(t.id);
    let readiness: Readiness = 'Parts not checked';
    if (analysis) {
      const need = new Map<string, number>();
      analysis.result.parts.forEach((p) => need.set(p.toLowerCase(), (need.get(p.toLowerCase()) || 0) + 1));
      const ok = [...need].every(([p, q]) => inventory.some((i) => i.van_id === t.van_id && i.part_name.toLowerCase() === p && i.quantity >= q));
      readiness = ok ? 'Stock ready' : 'Missing parts';
    }
    return { t, loc, readiness, nearest: match?.id === t.id };
  }), [technicians, inventory, analysis, customerSite, match]);

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: true }).setView([customerSite.lat, customerSite.lng], 12);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m);
    tiles.on('tileerror', () => setTileErrors((n) => n + 1));
    tiles.on('loading', () => setTileErrors(0));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layer.current = null; markers.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fit = () => {
    const pts: L.LatLngTuple[] = [[customerSite.lat, customerSite.lng]];
    rows.forEach((r) => r.loc && pts.push([r.loc.lat, r.loc.lng]));
    savedSites.forEach(([, { site }]) => pts.push([site.lat, site.lng]));
    map.current?.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
  };

  useEffect(() => {
    const g = layer.current; if (!g) return;
    const openPopup = Object.entries(markers.current).find(([, marker]) => marker.isPopupOpen())?.[0];
    g.clearLayers(); markers.current = {};
    const pin = (cls: string, label: string) => L.divIcon({ className: 'af-pin-wrap', iconSize: [30, 30], iconAnchor: [15, 15], html: el('div', `af-pin ${cls}`, label) });
    const c = L.marker([customerSite.lat, customerSite.lng], { icon: pin('customer', 'D'), title: `Draft intake: ${customerSite.label}`, zIndexOffset: 500 });
    const cp = el('div', 'af-pop');
    cp.append(el('b', '', `Draft intake: ${customerSite.label}`), el('span', '', intakeCondition), el('span', '', analysis?.result.issue || 'No diagnosis for the current intake'), el('span', '', 'Not a saved assignment · Synthetic demo coordinates'));
    c.bindPopup(cp).addTo(g); markers.current.c = c;
    savedSites.forEach(([key, { site, entries }]) => {
      const mk = L.marker([site.lat, site.lng], { icon: pin('customer', 'S'), title: `Saved: ${site.label}`, zIndexOffset: 600 });
      const pop = el('div', 'af-pop');
      pop.append(el('b', '', site.label), el('span', '', 'Saved dispatches · Synthetic demo coordinates, not live GPS'));
      entries.forEach((entry) => {
        const d = entry.dispatch!;
        pop.append(el('b', '', `Dispatch #${entry.id} · ${d.status} · ${d.technician_name} · Van ${d.van_id}`),
          el('span', '', `Parts: ${d.parts.join(', ')}`),
          el('span', '', d.completed_at ? `Completed: ${new Date(d.completed_at).toLocaleString()}` : d.status === 'Unknown' ? 'Legacy active status unknown' : 'Active assignment'),
          el('span', '', `${new Date(entry.timestamp).toLocaleString()} · Approved by ${entry.approved_by}`));
      });
      mk.bindPopup(pop, { maxHeight: 280 }).addTo(g);
      markers.current[`s${key}`] = mk;
    });
    if (routePath.length > 1) {
      L.polyline(routePath, { color: '#c84224', weight: 5, opacity: 0.88 }).addTo(g);
      map.current?.fitBounds(L.latLngBounds(routePath), { padding: [48, 48], maxZoom: 15, animate: true });
    }
    rows.forEach((r) => {
      if (!r.loc) return;
      const busy = r.t.status !== 'Available';
      const mk = L.marker([r.loc.lat, r.loc.lng], { icon: pin(busy ? 'busy' : r.nearest ? 'best' : 'ok', r.t.name.split(' ').map((p) => p[0]).join('').slice(0, 2)), title: r.t.name });
      const pop = el('div', 'af-pop');
      const routeNote = r.t.id === selected
        ? selectedRoute?.status === 'ready' && selectedRoute.distance_meters != null && selectedRoute.duration_seconds != null
          ? `Google route · ${formatRouteDistance(selectedRoute.distance_meters)} · ${formatRouteDuration(selectedRoute.duration_seconds)}`
          : routeQ.isFetching ? 'Calculating Google driving route…' : selectedRoute?.message ?? 'Google route is not available.'
        : 'Select this technician to show the Google driving route.';
      pop.append(el('b', '', r.t.name), el('span', '', `${r.t.zone} · ${r.t.status}`), el('span', '', levelText(r.t)), el('span', '', `Van ${r.t.van_id} · ${r.readiness}`), el('span', '', `Sample position · ${routeNote}`));
      mk.bindPopup(pop).on('click', () => setSelected(r.t.id)).addTo(g);
      markers.current[`t${r.t.id}`] = mk;
    });
    if (openPopup) markers.current[openPopup]?.openPopup();
  }, [rows, customerSite, intakeCondition, analysis, savedSites, selected, selectedRoute, routePath, routeQ.isFetching]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (rows.length || savedSites.length) fit(); }, [customerSiteId, rows.length, savedSites.length]);

  const focusSaved = (id: number) => {
    const group = savedSites.find(([, { entries }]) => entries.some((entry) => entry.id === id));
    const mk = group && markers.current[`s${group[0]}`];
    if (mk) { map.current?.setView(mk.getLatLng(), 14); mk.openPopup(); }
  };
  const focus = (id: number) => {
    setSelected(id);
    const mk = markers.current[`t${id}`];
    if (mk) { map.current?.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 13)); mk.openPopup(); }
  };
  const sel = rows.find((r) => r.t.id === selected);
  const saved = activity.filter((e) => e.completion_dispatch_id == null);

  return (
    <div className="space-y-5">
      <PageHead kicker="Field view" title="Technician map" sub="Sample positions, saved assignments and real hub status.">
        <select className={cn(fieldClass, 'w-full sm:w-auto')} aria-label="Draft intake customer site" data-testid="select-map-site" value={customerSiteId} disabled={writePending} onChange={(e) => updateCustomerSite(e.target.value)}>
          {DEMO_CUSTOMER_SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Button type="button" variant="outline" onClick={fit}><Maximize2 size={13} /> Fit all</Button>
      </PageHead>
      <p className="rounded-lg border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Select a technician to draw a Google driving route to the current customer site. Technician and customer positions are synthetic samples, not live GPS; unavailable routes are never replaced with straight-line estimates.</p>
      {hubQ.isError && <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Hub connection lost. Showing last known statuses.</InlineError>}
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      {tileErrors > 0 && <InlineError>Some map tiles could not be loaded. Sample locations and last-known statuses remain available in the list.</InlineError>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div ref={box} className="h-[52vh] min-h-[320px] w-full lg:h-[640px]" data-testid="map-canvas" aria-label="Map of technicians and customer" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground" aria-label="Legend">
            <span><i className="af-pin-sm customer" />S saved / D draft site</span><span><i className="af-pin-sm ok" />Available</span>
            <span><i className="af-pin-sm best" />Top qualified</span><span><i className="af-pin-sm busy" />Busy</span>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <Card title="Google driving route" aside={selectedRoute?.status === 'ready' ? <StatusBadge tone="ok">Route ready</StatusBadge> : undefined}>
            {selected === null ? (
              <p className="text-sm text-muted-foreground">Select a technician below to show the route to {customerSite.area}.</p>
            ) : (
              <div className="space-y-2 text-sm" data-testid="technician-route-details">
                <p className="font-medium">{sel?.t.name ?? 'Selected technician'} <span className="text-muted-foreground">to</span> {customerSite.area}</p>
                {routeQ.isFetching && <p role="status" className="text-muted-foreground">Calculating Google driving route…</p>}
                {routeQ.isError && <InlineError onRetry={() => void routeQ.refetch()} retrying={routeQ.isFetching}>Could not load the route.</InlineError>}
                {selectedRoute?.status === 'ready' && selectedRoute.distance_meters != null && selectedRoute.duration_seconds != null && (
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="ok">{formatRouteDistance(selectedRoute.distance_meters)}</StatusBadge>
                    <StatusBadge tone="ok">About {formatRouteDuration(selectedRoute.duration_seconds)}</StatusBadge>
                  </div>
                )}
                {selectedRoute && selectedRoute.status !== 'ready' && (
                  <>
                    <p role="status" className="text-xs text-muted-foreground">
                      {selectedRoute.status === 'not_configured'
                        ? 'Add the server-side GOOGLE_MAPS_API_KEY secret to enable Google driving routes.'
                        : selectedRoute.message}
                    </p>
                    <Button type="button" variant="outline" size="sm" disabled={routeQ.isFetching} onClick={() => void routeQ.refetch()}>
                      Retry route
                    </Button>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Route data from Google Maps Routes. Map pins use sample positions; not live GPS.</p>
              </div>
            )}
          </Card>
          <Card title="Technicians" aside={<Mono>{rows.length}</Mono>} bodyClassName="p-2 md:p-2">
            {hubQ.isLoading ? <div className="p-2"><SkeletonRows rows={3} /></div> : rows.length ? (
              <div className="space-y-1">
                {[1, 2, 3, 0].map((lv) => ({ lv, items: rows.filter((r) => (lv === 0 ? ![1, 2, 3].includes(r.t.level ?? 0) : r.t.level === lv)) })).filter((g) => g.items.length).map((grp) => (
                  <section key={grp.lv} aria-label={grp.lv ? `Level ${grp.lv} technicians` : 'Level not verified technicians'} className="space-y-1">
                    <h3 className="px-2.5 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{grp.lv ? `Level ${grp.lv} · ${LEVEL_NAME[grp.lv]}` : 'Level not verified'} ({grp.items.length})</h3>
                  {grp.items.map((r) => (
                  <button key={r.t.id} type="button" disabled={!r.loc} onClick={() => focus(r.t.id)} data-testid={`map-tech-${r.t.id}`}
                    className={cn('w-full rounded-lg border border-transparent p-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-60', selected === r.t.id && 'border-border bg-muted/60')}>
                    <span className="flex items-center justify-between gap-2"><b className="truncate text-sm font-medium">{r.t.name}</b><StatusBadge tone={techTone(r.t.status)} pulse={r.t.status === 'Busy'}>{r.t.status}</StatusBadge></span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{r.t.zone}</span><Mono>V-{r.t.van_id}</Mono>
                      <LevelBadge tech={r.t} />
                      <Mono>{r.loc ? 'Sample position' : 'No location'}</Mono>
                      <StatusBadge tone={readinessTone[r.readiness]}>{r.readiness}</StatusBadge>
                      {r.nearest && <StatusBadge tone="ok">Top qualified</StatusBadge>}
                    </span>
                  </button>
                ))}
                  </section>
                ))}
              </div>
            ) : <p className="p-3 text-sm text-muted-foreground">No technicians found.</p>}
            {sel && <p className="px-2.5 pb-2 text-xs text-muted-foreground">Selected: {sel.t.name}. {sel.loc?.label}{sel.loc && <> (<Mono>{sel.loc.lat.toFixed(4)}, {sel.loc.lng.toFixed(4)}</Mono>)</>}.</p>}
            <p className="px-2.5 pb-2 text-xs text-muted-foreground">Draft customer: {customerSite.label} (<Mono>{customerSite.lat.toFixed(4)}, {customerSite.lng.toFixed(4)}</Mono>). {intakeCondition}.</p>
          </Card>
          <Card title="Saved dispatches" aside={<Mono>{saved.length}</Mono>} bodyClassName="p-2 md:p-2">
            <div className="max-h-[420px] space-y-1 overflow-y-auto" data-testid="saved-dispatches">
              {saved.map((entry) => {
                const d = entry.dispatch;
                return (
                  <div key={entry.id} className="rounded-lg p-1">
                    <button type="button" disabled={!d} onClick={() => focusSaved(entry.id)} data-testid={`map-dispatch-${entry.id}`} className="w-full rounded-md p-1.5 text-left hover:bg-muted/50 disabled:cursor-default">
                      <span className="flex items-center justify-between gap-2"><Mono className="text-sm font-semibold">#{entry.id}</Mono>{d && <StatusBadge tone={dispatchTone[d.status]} pulse={d.status === 'Active'}>{d.status}</StatusBadge>}</span>
                      <span className="block text-xs">{d ? d.customer_site.label : 'Customer location unknown · legacy record'}</span>
                      <span className="block text-xs text-muted-foreground">{d ? `${d.technician_name} · Van ${d.van_id} · ${d.parts.join(', ')}` : entry.action_details}</span>
                      <Mono className="block text-[11px] text-muted-foreground">{new Date(entry.timestamp).toLocaleString()} · {entry.approved_by}</Mono>
                    </button>
                    <div className="px-1.5"><CompletionControl entry={entry} hub={hub} /></div>
                  </div>
                );
              })}
              {!saved.length && (hubQ.isLoading ? <div className="p-2"><SkeletonRows rows={2} /></div> : <EmptyState icon={<MapPinned size={16} />} title="No saved dispatches yet">Approved jobs appear here with their site.</EmptyState>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
