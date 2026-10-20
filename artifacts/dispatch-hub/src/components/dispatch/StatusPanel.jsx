import { useMemo } from 'react';
import { Activity, Boxes, Users, Lock, ShieldCheck, RotateCw, WifiOff, MapPin, Truck } from 'lucide-react';
import { Panel, Badge, Dot, Skeleton, SectionLabel } from './ui';

function fmt(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return {
    date: d.toLocaleDateString([], { month: 'short', day: '2-digit' }),
    time: d.toLocaleTimeString([], { hour12: false }),
  };
}

export default function StatusPanel({ hubQ, highlightVan, highlightParts }) {
  const hub = hubQ.data;
  const techs = hub?.technicians ?? [];
  const inv = useMemo(
    () => [...(hub?.inventory ?? [])].sort((a, b) => a.van_id - b.van_id || a.part_name.localeCompare(b.part_name)),
    [hub],
  );
  const log = useMemo(
    () => [...(hub?.activity_log ?? [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp) || b.id - a.id),
    [hub],
  );
  const parts = (highlightParts ?? []).map((p) => p.toLowerCase());
  const available = techs.filter((t) => t.status === 'Available').length;
  const low = inv.filter((i) => i.quantity <= 2).length;

  return (
    <Panel
      step="03"
      title="Hub Real-Time Status"
      icon={Activity}
      right={
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <Dot tone={hubQ.isError ? 'red' : 'green'} pulse={!hubQ.isError} /> 10s poll
        </span>
      }
    >
      {hubQ.isLoading ? (
        <div className="flex flex-col gap-3" data-testid="status-hub-loading">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : !hub ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <WifiOff className="h-6 w-6 text-red-400" />
          <p className="text-sm text-slate-300">Can't reach the dispatch hub</p>
          <p className="max-w-xs text-xs text-slate-500">{hubQ.error?.message || 'The API did not respond.'}</p>
          <button onClick={() => hubQ.refetch()} data-testid="button-retry-hub" className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800">
            <RotateCw className={`h-3.5 w-3.5 ${hubQ.isFetching ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Available', `${available}/${techs.length}`, 'text-emerald-300'],
              ['SKU lines', inv.length, 'text-slate-100'],
              ['Low stock', low, low ? 'text-red-300' : 'text-slate-100'],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{l}</p>
                <p className={`font-mono text-lg font-semibold tabular-nums ${c}`} data-testid={`stat-${l}`}>{v}</p>
              </div>
            ))}
          </div>

          <div>
            <SectionLabel right={<Users className="h-3 w-3 text-slate-600" />}>Technicians</SectionLabel>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {techs.map((t) => (
                <li key={t.id} data-testid={`row-tech-${t.id}`} className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${t.van_id === highlightVan ? 'border-emerald-500/40 bg-emerald-500/[0.06]' : 'border-slate-800 bg-slate-950/40'}`}>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{t.name}</p>
                    <p className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{t.zone}</span>
                      <span className="inline-flex items-center gap-0.5 font-mono"><Truck className="h-2.5 w-2.5" />{t.van_id}</span>
                    </p>
                  </div>
                  <Badge tone={t.status === 'Available' ? 'green' : 'slate'}>
                    <Dot tone={t.status === 'Available' ? 'green' : 'yellow'} /> {t.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel right={<Boxes className="h-3 w-3 text-slate-600" />}>Van inventory</SectionLabel>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Van</th>
                    <th className="px-3 py-2 text-left font-medium">Part</th>
                    <th className="px-3 py-2 text-right font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">No inventory recorded.</td></tr>
                  )}
                  {inv.map((i) => {
                    const lowQ = i.quantity <= 2;
                    const hl = i.van_id === highlightVan && parts.includes(i.part_name.toLowerCase());
                    return (
                      <tr key={i.id} data-testid={`row-inventory-${i.id}`} className={`border-t border-slate-800/70 transition-colors hover:bg-slate-800/40 ${hl ? 'bg-sky-500/[0.07]' : ''}`}>
                        <td className="px-3 py-1.5 font-mono text-slate-400">V-{i.van_id}</td>
                        <td className="px-3 py-1.5 text-slate-200">{i.part_name}</td>
                        <td className="px-3 py-1.5 text-right">
                          <span key={i.quantity} className={`rise inline-flex min-w-8 justify-center rounded-md border px-1.5 py-0.5 font-mono font-semibold tabular-nums ${lowQ ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`} data-testid={`text-qty-${i.id}`}>
                            {i.quantity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <SectionLabel right={<span className="inline-flex items-center gap-1 text-[10px] text-slate-600"><Lock className="h-3 w-3" /> Immutable</span>}>
              Activity timeline
            </SectionLabel>
            {log.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-500">No dispatches yet. Approved jobs are recorded here and cannot be edited.</p>
            ) : (
              <ol className="relative mt-3 max-h-80 overflow-auto pl-4">
                <span className="absolute bottom-2 left-[5px] top-2 w-px bg-slate-800" />
                {log.map((a) => {
                  const f = fmt(a.timestamp);
                  return (
                    <li key={a.id} className="rise relative pb-3.5" data-testid={`item-activity-${a.id}`}>
                      <span className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-sky-400" />
                      <div className="flex flex-wrap items-center gap-2">
                        <time className="font-mono text-[10px] text-slate-500">{typeof f === 'string' ? f : `${f.date} ${f.time}`}</time>
                        <Badge tone="sky"><ShieldCheck className="h-3 w-3" /> {a.approved_by}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{a.action_details}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
