import { CheckCircle2, FlaskConical, Loader2, MapPin, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APPROVER } from './useDispatchHub';
import { distanceKm, getTechnicianLocation } from './demoLocations';
import { Card, InlineError, Mono, PageHead, PartChips, StatusBadge, initials, type Hub } from './shared';

const urgencyTone = { High: 'err', Med: 'pending', Low: 'idle' } as const;

export default function AnalysisPage({ hub, onApprove }: Hub & { onApprove: () => void }) {
  const { analysis, hubQ, matches, match, approve, approveError, customerSite, writePending } = hub;
  if (!analysis) return null;
  const loc = match ? getTechnicianLocation(match.id) : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHead kicker="Step 2 of 2" title="Analysis & approval" sub={`Customer: ${customerSite.label}`}>
        <Button asChild variant="outline"><Link href="/intake">Edit intake</Link></Button>
      </PageHead>
      <Card title="Diagnosis" aside={<StatusBadge tone="pending"><FlaskConical size={10} /> Demo result</StatusBadge>}>
        <div className="space-y-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Diagnosed issue</p>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-xl font-semibold">{analysis.result.issue}</h3>
              <StatusBadge tone={urgencyTone[analysis.result.urgency]}>{analysis.result.urgency} urgency</StatusBadge>
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Required parts</p>
            <PartChips parts={analysis.result.parts} />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Stock-aware technician match · <span className="text-foreground">{matches.length} qualified</span></p>
            {hubQ.isLoading ? <Skeleton className="h-24" />
              : !hubQ.data ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>Reconnect to the hub to find a technician.</InlineError>
              : match ? (
                <div className="rounded-lg border border-ok/30 bg-ok/[0.06] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-card font-mono text-sm font-semibold">{initials(match.name)}</span>
                      <div>
                        <div className="font-medium">{match.name}</div>
                        <div className="flex gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin size={11} />{match.zone}</span><Mono className="inline-flex items-center gap-1"><Truck size={11} />Van {match.van_id}</Mono></div>
                      </div>
                    </div>
                    <StatusBadge tone="idle">Available</StatusBadge>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-ok" /> Van {match.van_id} carries every required part in stock.</li>
                    <li>{loc ? <>Straight-line <Mono>{distanceKm(loc, customerSite).toFixed(1)} km</Mono> from sample position (not a driving ETA).</> : 'Location unavailable for this technician.'}</li>
                  </ul>
                </div>
              ) : <div role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-4 text-sm"><b>No qualified technician found.</b> No available technician has every required part in their van. Review van stock before approving.</div>}
          </div>
          {approveError && <InlineError>{approveError}</InlineError>}
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Approver: <b className="text-foreground">{APPROVER}</b> · saved to the audit log</p>
            <Button type="button" variant="success" data-testid="button-approve" onClick={onApprove} disabled={!match || writePending || hub.connectionLost}>
              {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {approve.isPending ? 'Allocating parts…' : approveError ? 'Retry approval' : 'Approve & dispatch job'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
