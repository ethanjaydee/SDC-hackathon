import { AlertTriangle, Activity, CheckCircle2, MapPin, Truck, FlaskConical, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { APPROVER } from './useDispatchHub';
import { distanceKm, getTechnicianLocation } from './demoLocations';
import { Card, PageHead, PartChips, initials, Check, type Hub } from './shared';

export default function AnalysisPage({ hub, onApprove }: Hub & { onApprove: () => void }) {
  const { analysis, hubQ, matches, match, approve, approveError, customerSite } = hub;
  if (!analysis) return null;
  const loc = match ? getTechnicianLocation(match.id) : undefined;
  return (
    <div className="af-page af-narrow">
      <PageHead kicker="Step 2" title="Analysis & approval" sub={`Customer: ${customerSite.label}`}>
        <Link href="/intake" className="af-quiet-btn">Edit intake</Link>
      </PageHead>
      <Card title="Diagnosis" aside={<span className="af-mock-pill"><FlaskConical size={10} /> Demo result</span>}>
        <div className="af-result">
          <div>
            <div className="af-label">Diagnosed issue</div>
            <div className="af-issue-row">
              <h3 className="af-issue">{analysis.result.issue}</h3>
              <span className="af-urgency"><AlertTriangle size={10} /> {analysis.result.urgency} urgency</span>
            </div>
          </div>
          <div><div className="af-label">Required parts</div><PartChips parts={analysis.result.parts} /></div>
          <div>
            <div className="af-label">Stock-aware technician match <span>{matches.length} qualified</span></div>
            {hubQ.isLoading ? <p className="af-hint" role="status">Checking hub availability…</p>
              : !hubQ.data ? <div className="af-error af-hub-message" role="alert"><span>Reconnect to the hub to find a technician.</span><button className="af-quiet-btn" onClick={() => void hubQ.refetch()}><RefreshCw size={12} /> Retry</button></div>
              : match ? (
                <div className="af-match">
                  <div className="af-match-main">
                    <div className="af-person">
                      <span className="af-avatar">{initials(match.name)}</span>
                      <div>
                        <div className="af-person-name">{match.name}</div>
                        <div className="af-person-meta"><span><MapPin size={10} /> {match.zone}</span><span><Truck size={10} /> Van {match.van_id}</span></div>
                      </div>
                    </div>
                    <span className="af-available"><span className="af-dot" /> Available</span>
                  </div>
                  <p className="af-match-note"><Check size={11} /> Van {match.van_id} carries every required part in stock.</p>
                  <p className="af-match-note">{loc ? `Straight-line ${distanceKm(loc, customerSite).toFixed(1)} km from sample position (not a driving ETA).` : 'Location unavailable for this technician.'}</p>
                </div>
              ) : <div className="af-no-match"><b>No qualified technician found.</b><br />No available technician has every required part in their van. Review van stock before approving.</div>}
          </div>
          {approveError && <p className="af-error" role="alert">{approveError}</p>}
          <div className="af-divider">
            <button className="af-approve" data-testid="button-approve" type="button" onClick={onApprove} disabled={!match || approve.isPending || hubQ.isError}>
              {approve.isPending ? <Activity size={14} /> : <CheckCircle2 size={14} />}
              {approve.isPending ? 'Allocating parts…' : approveError ? 'Retry approval' : 'Approve & dispatch job'}
            </button>
            <p className="af-audit-note">Approver: <b>{APPROVER}</b> · approval is saved to the audit log</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
