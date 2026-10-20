import { Cpu, AlertTriangle, CheckCircle2, Loader2, Package, Truck, UserCheck, UserX, RotateCw, Sparkles, MapPin } from 'lucide-react';
import { Panel, Badge, Dot, Skeleton, SectionLabel } from './ui';

const URG = { High: 'red', Med: 'yellow', Low: 'green' };

export default function AnalysisPanel({
  analysis, pending, error, onRetry, hub, hubLoading, matches, match, approving, onApprove, approveError, approver, hubFetching,
}) {
  return (
    <Panel
      step="02"
      title="AI Analysis & Action Center"
      icon={Cpu}
      right={<Badge tone="violet"><Sparkles className="h-3 w-3" /> Mock AI</Badge>}
    >
      {pending ? (
        <div className="flex flex-col gap-4" data-testid="status-analyzing">
          <div className="relative h-0.5 overflow-hidden rounded bg-slate-800">
            <div className="scan absolute inset-y-0 w-1/3 bg-sky-400/70" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-24" /></div>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-slate-300">Analysis failed</p>
          <p className="max-w-xs text-xs text-slate-500">{error}</p>
          <button onClick={onRetry} data-testid="button-retry-analyze" className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800">
            <RotateCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : !analysis ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center" data-testid="status-analysis-empty">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-600">
            <Cpu className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-300">No request analyzed yet</p>
          <p className="max-w-[260px] text-xs leading-relaxed text-slate-500">
            Add fault notes and run analysis. The diagnosed issue, urgency, required parts and a stocked technician will appear here.
          </p>
        </div>
      ) : (
        <div className="rise flex flex-col gap-5">
          <div>
            <SectionLabel>Diagnosed issue</SectionLabel>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-50" data-testid="text-issue">{analysis.issue}</h3>
              <Badge tone={URG[analysis.urgency]} className="shrink-0 px-2 py-1" data-testid="badge-urgency">
                {analysis.urgency === 'High' && <AlertTriangle className="h-3 w-3" />}
                {analysis.urgency} urgency
              </Badge>
            </div>
          </div>

          <div>
            <SectionLabel>Required parts</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {analysis.parts.map((p) => (
                <span key={p} data-testid={`pill-part-${p}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 font-mono text-[11px] text-slate-200 transition hover:border-sky-500/50">
                  <Package className="h-3 w-3 text-sky-400" /> {p}
                </span>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel right={hubFetching && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}>Technician match</SectionLabel>
            {hubLoading || !hub ? (
              <Skeleton className="mt-2 h-20 w-full" />
            ) : match ? (
              <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5" data-testid="card-match">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                      {match.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100" data-testid="text-match-name">{match.name}</p>
                      <p className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{match.zone}</span>
                        <span className="inline-flex items-center gap-1 font-mono"><Truck className="h-3 w-3" />Van {match.van_id}</span>
                      </p>
                    </div>
                  </div>
                  <Badge tone="green"><Dot tone="green" /> Available</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300/80">
                  <UserCheck className="h-3.5 w-3.5" /> Van stocks every required part.
                  {matches.length > 1 && <span className="text-slate-500"> {matches.length - 1} other qualified.</span>}
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3.5" data-testid="status-no-match">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-200"><UserX className="h-4 w-4" /> No qualified technician</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  No Available technician has a van stocking every required part. Restock a van or wait for a technician to free up; the hub refreshes every 10 seconds.
                </p>
              </div>
            )}
          </div>

          {approveError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300" data-testid="text-approve-error">{approveError}</p>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
            <button
              onClick={onApprove}
              disabled={!match || approving}
              data-testid="button-approve"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {approving ? 'Dispatching...' : 'Approve & Dispatch Job'}
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Signing as <span className="text-slate-300">{approver}</span> · logged permanently to the activity timeline
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}
