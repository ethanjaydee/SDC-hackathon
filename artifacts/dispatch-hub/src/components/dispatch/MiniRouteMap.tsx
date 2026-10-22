import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MiniPoint = { id: number; name: string; lat: number; lng: number; selected: boolean; eligible: boolean };
type Props = {
  customer: { lat: number; lng: number; label: string };
  technicians: MiniPoint[];
  /** Google-returned encoded polyline for the selected technician, used only on the Google map. */
  polyline?: string | null;
  height?: number;
};

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
type Gmaps = any; // eslint-disable-line @typescript-eslint/no-explicit-any
let googleLoader: Promise<Gmaps> | null = null;
function loadGoogle(key: string): Promise<Gmaps> {
  const w = window as unknown as { google?: { maps?: Gmaps } };
  if (w.google?.maps?.geometry) return Promise.resolve(w.google.maps);
  if (!googleLoader) {
    googleLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=geometry`;
      s.async = true;
      s.onload = () => resolve((window as unknown as { google: { maps: Gmaps } }).google.maps);
      s.onerror = () => { googleLoader = null; reject(new Error('Google Maps failed to load')); };
      document.head.appendChild(s);
    });
  }
  return googleLoader;
}

const abbr = (n: string) => n.split(' ').map((p) => p[0]).join('').replace(/[^a-z0-9]/gi, '').slice(0, 2);

function LeafletMap({ customer, technicians, height }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false }).setView([customer.lat, customer.lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const icon = (cls: string, t: string) => L.divIcon({ className: 'af-pin-wrap', html: `<div class="af-pin ${cls}">${t}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    const pts: L.LatLngTuple[] = [[customer.lat, customer.lng]];
    L.marker([customer.lat, customer.lng], { icon: icon('customer', 'C'), title: customer.label }).addTo(g);
    technicians.forEach((t) => {
      pts.push([t.lat, t.lng]);
      L.marker([t.lat, t.lng], { icon: icon(t.selected ? 'best' : t.eligible ? 'ok' : 'busy', abbr(t.name)), title: `${t.name}${t.eligible ? '' : ' (not eligible)'}`, opacity: t.eligible || t.selected ? 1 : 0.55 }).addTo(g);
    });
    m.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 13, animate: false });
  }, [customer, technicians]);
  return <div ref={box} style={{ height }} className="w-full rounded-lg border" role="img" aria-label="Map of customer site and sample technician positions" />;
}

function GoogleMap({ customer, technicians, polyline, height }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const overlays: Gmaps[] = [];
    loadGoogle(GOOGLE_KEY as string).then((g) => {
      if (cancelled || !box.current) return;
      const m = new g.Map(box.current, { center: { lat: customer.lat, lng: customer.lng }, zoom: 11, mapTypeControl: false, streetViewControl: false });
      const bounds = new g.LatLngBounds();
      const add = (lat: number, lng: number, title: string, label: string, scale: number) => {
        const mk = new g.Marker({ map: m, position: { lat, lng }, title, label });
        overlays.push(mk); bounds.extend({ lat, lng });
        void scale;
      };
      add(customer.lat, customer.lng, customer.label, 'C', 1);
      technicians.forEach((t) => add(t.lat, t.lng, t.name, abbr(t.name), 1));
      if (polyline) {
        const path = g.geometry.encoding.decodePath(polyline);
        overlays.push(new g.Polyline({ map: m, path, strokeColor: '#c84224', strokeWeight: 4 }));
        path.forEach((p: unknown) => bounds.extend(p));
      }
      m.fitBounds(bounds, 40);
    }).catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; overlays.forEach((o) => o.setMap?.(null)); };
  }, [customer, technicians, polyline]);
  if (err) return <div style={{ height }} className="grid place-items-center rounded-lg border bg-muted/40 p-4 text-center text-xs text-muted-foreground">Google Maps could not be loaded. Use the directions link instead.</div>;
  return <div ref={box} style={{ height }} className="w-full rounded-lg border" role="img" aria-label="Google map of customer site and technicians" />;
}

export function MiniRouteMap(props: Props) {
  const height = props.height ?? 260;
  const google = !!GOOGLE_KEY;
  return (
    <figure className="space-y-1.5" data-testid="mini-route-map" data-provider={google ? 'google' : 'osm'}>
      {google ? <GoogleMap {...props} height={height} /> : <LeafletMap {...props} height={height} />}
      <figcaption className="text-[11px] leading-snug text-muted-foreground">
        {google
          ? 'Google Maps. Technician positions are synthetic samples, not live GPS. A route line appears only when Google returns one.'
          : 'OpenStreetMap sample view, not Google. Positions are synthetic samples, not live GPS. No route is drawn.'}
      </figcaption>
    </figure>
  );
}
