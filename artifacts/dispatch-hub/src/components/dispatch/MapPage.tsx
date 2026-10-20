import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2 } from 'lucide-react';
import { DEMO_CUSTOMER_SITES, distanceKm, getTechnicianLocation } from './demoLocations';
import { PageHead, type Hub } from './shared';

type Readiness = 'Parts not checked' | 'Stock ready' | 'Missing parts';

function el(tag: string, cls: string, text?: string) {
  const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e;
}

export default function MapPage({ hub }: Hub) {
  const { technicians, inventory, analysis, match, customerSite, customerSiteId, updateCustomerSite, approve, hubQ } = hub;
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [tileErrors, setTileErrors] = useState(0);
  const intakeCondition = analysis
    ? `Analysis ready · ${analysis.result.urgency} urgency`
    : hub.notes.trim() ? 'Draft intake · awaiting analysis' : 'No active repair intake';

  const rows = useMemo(() => technicians.map((t) => {
    const loc = getTechnicianLocation(t.id);
    let readiness: Readiness = 'Parts not checked';
    if (analysis) {
      const need = new Map<string, number>();
      analysis.result.parts.forEach((p) => need.set(p.toLowerCase(), (need.get(p.toLowerCase()) || 0) + 1));
      const ok = [...need].every(([p, q]) => inventory.some((i) => i.van_id === t.van_id && i.part_name.toLowerCase() === p && i.quantity >= q));
      readiness = ok ? 'Stock ready' : 'Missing parts';
    }
    return { t, loc, km: loc ? distanceKm(loc, customerSite) : null, readiness, nearest: match?.id === t.id };
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
  }, []);

  const fit = () => {
    const pts: L.LatLngTuple[] = [[customerSite.lat, customerSite.lng]];
    rows.forEach((r) => r.loc && pts.push([r.loc.lat, r.loc.lng]));
    map.current?.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
  };

  useEffect(() => {
    const g = layer.current; if (!g) return;
    const openPopup = Object.entries(markers.current).find(([, marker]) => marker.isPopupOpen())?.[0];
    g.clearLayers(); markers.current = {};
    const pin = (cls: string, label: string) => L.divIcon({ className: 'af-pin-wrap', iconSize: [30, 30], iconAnchor: [15, 15], html: el('div', `af-pin ${cls}`, label) });
    const c = L.marker([customerSite.lat, customerSite.lng], { icon: pin('customer', 'C'), title: customerSite.label, zIndexOffset: 500 });
    const cp = el('div', 'af-pop');
    cp.append(el('b', '', customerSite.label), el('span', '', intakeCondition), el('span', '', analysis?.result.issue || 'No diagnosis for the current intake'), el('span', '', 'Synthetic demo coordinates'));
    c.bindPopup(cp).addTo(g); markers.current.c = c;
    rows.forEach((r) => {
      if (!r.loc) return;
      const busy = r.t.status !== 'Available';
      const mk = L.marker([r.loc.lat, r.loc.lng], { icon: pin(busy ? 'busy' : r.nearest ? 'best' : 'ok', r.t.name.split(' ').map((p) => p[0]).join('').slice(0, 2)), title: r.t.name });
      const pop = el('div', 'af-pop');
      pop.append(el('b', '', r.t.name), el('span', '', `${r.t.zone} · ${r.t.status}`), el('span', '', `Van ${r.t.van_id} · ${r.readiness}`), el('span', '', `${r.km!.toFixed(1)} km straight-line to customer`));
      mk.bindPopup(pop).on('click', () => setSelected(r.t.id)).addTo(g);
      markers.current[`t${r.t.id}`] = mk;
    });
    if (openPopup) markers.current[openPopup]?.openPopup();
  }, [rows, customerSite, intakeCondition, analysis]);

  useEffect(() => { if (rows.length) fit(); /* eslint-disable-next-line */ }, [customerSiteId, rows.length]);

  const focus = (id: number) => {
    setSelected(id);
    const mk = markers.current[`t${id}`];
    if (mk) { map.current?.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 13)); mk.openPopup(); }
  };
  const sel = rows.find((r) => r.t.id === selected);

  return (
    <div className="af-page">
      <PageHead kicker="Field view" title="Technician map" sub="Sample positions, real hub status and stock.">
        <select className="af-select" style={{ width: 'auto' }} aria-label="Customer site" data-testid="select-map-site" value={customerSiteId} disabled={approve.isPending} onChange={(e) => updateCustomerSite(e.target.value)}>
          {DEMO_CUSTOMER_SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button className="af-quiet-btn af-outline" type="button" onClick={fit}><Maximize2 size={12} /> Fit all</button>
      </PageHead>
      <div className="af-note">Synthetic demo coordinates, not live GPS. Distances are straight-line, not driving routes or ETAs. Status and stock come from the live hub.</div>
      {hubQ.isError && <div className="af-error af-hub-message" role="alert"><span>Hub connection lost. Showing last known statuses.</span></div>}
      {tileErrors > 0 && <div className="af-error af-hub-message" role="alert"><span>Some map tiles could not be loaded. Sample locations and last-known hub statuses remain available in the list.</span></div>}
      <div className="af-map-layout">
        <div className="af-map-box"><div ref={box} className="af-map" data-testid="map-canvas" aria-label="Map of technicians and customer" /></div>
        <aside className="af-map-side">
          <div className="af-legend" aria-label="Legend">
            <span><i className="af-pin-sm customer" />Customer</span><span><i className="af-pin-sm ok" />Available</span>
            <span><i className="af-pin-sm best" />Nearest qualified</span><span><i className="af-pin-sm busy" />Busy</span>
          </div>
          <div className="af-map-list">
            {rows.map((r) => (
              <button key={r.t.id} type="button" disabled={!r.loc} className={`af-map-row ${selected === r.t.id ? 'sel' : ''}`} onClick={() => focus(r.t.id)} data-testid={`map-tech-${r.t.id}`}>
                <span className="af-map-row-top"><b>{r.t.name}</b><span className={`af-status-tag ${r.t.status !== 'Available' ? 'busy' : ''}`}>{r.t.status}</span></span>
                <span className="af-map-row-sub">{r.t.zone} · Van {r.t.van_id}</span>
                <span className="af-map-row-sub">{r.loc ? `${r.km!.toFixed(1)} km straight-line` : 'Location unavailable'} · {r.readiness}{r.nearest ? ' · Nearest qualified' : ''}</span>
              </button>
            ))}
            {!rows.length && <p className="af-hint">{hubQ.isLoading ? 'Loading technicians…' : 'No technicians found.'}</p>}
          </div>
          {sel && <p className="af-hint">Selected: {sel.t.name}. {sel.loc?.label}{sel.loc ? ` (${sel.loc.lat.toFixed(4)}, ${sel.loc.lng.toFixed(4)})` : ''}.</p>}
          <p className="af-hint">Customer: {customerSite.label} ({customerSite.lat.toFixed(4)}, {customerSite.lng.toFixed(4)}). Current intake: {intakeCondition}.</p>
        </aside>
      </div>
    </div>
  );
}
