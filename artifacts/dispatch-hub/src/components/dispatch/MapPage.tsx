import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Maximize2, MapPinned } from 'lucide-react';
import { getGetTechnicianRouteQueryKey, useGetTechnicianRoute } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, fieldClass, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { cn } from '@/lib/utils';
import { decodeGooglePolyline } from './routeGeometry';
import { useDemoSession } from './session';

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
  const { technicianId } = useDemoSession();
  const { technicians, shop, customerSite, customerSiteId, updateCustomerSite, hubQ, writePending } = hub;
  const activity = useMemo(
    () => technicianId == null ? hub.activity : hub.activity.filter((e) => e.dispatch?.tech_id === technicianId),
    [hub.activity, technicianId],
  );
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const [tileErrors, setTileErrors] = useState(0);
  // The id is a legacy association only; the server returns the shop-to-customer route.
  const legacyId = technicianId ?? technicians[0]?.id ?? 0;
  const routeQ = useGetTechnicianRoute(legacyId, customerSiteId, {
    query: { queryKey: getGetTechnicianRouteQueryKey(legacyId, customerSiteId), enabled: legacyId > 0, staleTime: 5 * 60 * 1000 },
  });
  const route = routeQ.data?.customer_site_id === customerSiteId ? routeQ.data : null;
  const routePath = useMemo(
    () => route?.status === 'ready' && route.polyline ? decodeGooglePolyline(route.polyline) : [],
    [route],
  );
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: true }).setView([shop.lat, shop.lng], 12);
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
    const pts: L.LatLngTuple[] = [[shop.lat, shop.lng], [customerSite.lat, customerSite.lng]];
    routePath.forEach((p) => pts.push(p as L.LatLngTuple));
    map.current?.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
  };

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers(); markers.current = {};
    const pin = (cls: string, label: string) => L.divIcon({ className: 'af-pin-wrap', iconSize: [30, 30], iconAnchor: [15, 15], html: el('div', `af-pin ${cls}`, label) });
    const sp = el('div', 'af-pop');
    sp.append(el('b', '', shop.name), el('span', '', 'Fixed shop · route origin · Synthetic demo coordinates, not GPS'));
    L.marker([shop.lat, shop.lng], { icon: pin('shop', 'S'), title: shop.name, zIndexOffset: 700 }).bindPopup(sp).addTo(g);
    const cp = el('div', 'af-pop');
    cp.append(el('b', '', `Customer: ${customerSite.label}`), el('span', '', 'Not a saved assignment · Synthetic demo coordinates'));
    L.marker([customerSite.lat, customerSite.lng], { icon: pin('customer', 'C'), title: customerSite.label, zIndexOffset: 500 }).bindPopup(cp).addTo(g);
    if (routePath.length > 1) {
      L.polyline(routePath, { color: '#c84224', weight: 5, opacity: 0.88 }).addTo(g);
      map.current?.fitBounds(L.latLngBounds(routePath), { padding: [48, 48], maxZoom: 15, animate: true });
    }
  }, [shop, customerSite, routePath]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (routePath.length < 2) fit(); }, [customerSiteId, shop.lat, shop.lng]);

  const focusSaved = (id: number) => {
    const site = activity.find((e) => e.id === id)?.dispatch?.customer_site;
    if (site) updateCustomerSite(site.id);
  };
  const saved = activity.filter((e) => e.completion_dispatch_id == null);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${shop.lat},${shop.lng}&destination=${customerSite.lat},${customerSite.lng}&travelmode=driving`;

  return (
    <div className="space-y-5">
      <PageHead kicker="Field view" title="Technician map" sub="Fixed shop, the selected customer and the route between them. No technician positions are shown.">
        <select className={cn(fieldClass, 'w-full sm:w-auto')} aria-label="Customer site" data-testid="select-map-site" value={customerSiteId} disabled={writePending} onChange={(e) => updateCustomerSite(e.target.value)}>
          {DEMO_CUSTOMER_SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Button type="button" variant="outline" onClick={fit}><Maximize2 size={13} /> Fit all</Button>
      </PageHead>
      <p className="rounded-lg border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">S is the fixed shop and C is a customer site. Route, distance and time are the Google driving route from the shop to the customer; unavailable routes are never replaced with straight-line estimates. Positions are synthetic samples, not live GPS.</p>
      {hubQ.isError && <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Hub connection lost. Showing last known statuses.</InlineError>}
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      {tileErrors > 0 && <InlineError>Some map tiles could not be loaded. Saved assignments remain available in the list.</InlineError>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div ref={box} className="h-[52vh] min-h-[320px] w-full lg:h-[640px]" data-testid="map-canvas" aria-label="Map of shop and customer" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground" aria-label="Legend">
            <span><i className="af-pin-sm shop" />S shop</span><span><i className="af-pin-sm customer" />C customer</span>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <Card title="Shop to customer route" aside={route?.status === 'ready' ? <StatusBadge tone="ok">Route ready</StatusBadge> : undefined}>
            <div className="space-y-2 text-sm" data-testid="technician-route-details">
              <p className="font-medium">{shop.name} <span className="text-muted-foreground">to</span> {customerSite.area}</p>
              {routeQ.isFetching && <p role="status" className="text-muted-foreground">Calculating Google driving route…</p>}
              {routeQ.isError && <InlineError onRetry={() => void routeQ.refetch()} retrying={routeQ.isFetching}>Could not load the route.</InlineError>}
              {route?.status === 'ready' && route.distance_meters != null && route.duration_seconds != null && (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="ok">{formatRouteDistance(route.distance_meters)}</StatusBadge>
                  <StatusBadge tone="ok">About {formatRouteDuration(route.duration_seconds)}</StatusBadge>
                </div>
              )}
              {route && route.status !== 'ready' && (
                <>
                  <p role="status" className="text-xs text-muted-foreground">{route.status === 'not_configured' ? 'Add the server-side GOOGLE_MAPS_API_KEY secret to enable Google driving routes.' : route.message}</p>
                  <Button type="button" variant="outline" size="sm" disabled={routeQ.isFetching} onClick={() => void routeQ.refetch()}>Retry route</Button>
                </>
              )}
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary">Open directions in Google Maps <ExternalLink size={11} /></a>
              <p className="text-xs text-muted-foreground">Shop <Mono>{shop.lat.toFixed(4)}, {shop.lng.toFixed(4)}</Mono> · Customer <Mono>{customerSite.lat.toFixed(4)}, {customerSite.lng.toFixed(4)}</Mono></p>
            </div>
          </Card>
          <Card title={technicianId == null ? 'Saved dispatches' : 'Your saved dispatches'} aside={<Mono>{saved.length}</Mono>} bodyClassName="p-2 md:p-2">
            <div className="max-h-[420px] space-y-1 overflow-y-auto" data-testid="saved-dispatches">
              {saved.map((entry) => {
                const d = entry.dispatch;
                return (
                  <div key={entry.id} className="rounded-lg p-1">
                    <button type="button" disabled={!d} onClick={() => focusSaved(entry.id)} data-testid={`map-dispatch-${entry.id}`} className="w-full rounded-md p-1.5 text-left hover:bg-muted/50 disabled:cursor-default">
                      <span className="flex items-center justify-between gap-2"><Mono className="text-sm font-semibold">#{entry.id}</Mono>{d && <StatusBadge tone={dispatchTone[d.status]} pulse={d.status === 'Active'}>{d.status}</StatusBadge>}</span>
                      <span className="block text-xs">{d ? d.customer_site.label : 'Customer location unknown · legacy record'}</span>
                      <span className="block text-xs text-muted-foreground">{d ? `${d.technician_name} · ${d.parts.join(', ')}` : entry.action_details}</span>
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
