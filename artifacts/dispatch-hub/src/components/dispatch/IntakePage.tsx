import { useLocation } from 'wouter';
import { ArrowDownRight, Eraser, FileText, FlaskConical, Inbox, ScanSearch } from 'lucide-react';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { Card, PageHead, type Hub } from './shared';

const SAMPLE =
  'Customer: Halvorsen Marine, slip 14. 2016 Yamaha console — dash went completely dark mid-trip, smelled hot plastic near the gauge pod. Engine still cranks. Owner says cluster flickered for a week before. Needs someone today, charter booked tomorrow 7am.';

export default function IntakePage({ hub }: Hub) {
  const { notes, analyze, approve, analysisError, updateNotes, runAnalysis, customerSiteId, updateCustomerSite, customerSite } = hub;
  const [, navigate] = useLocation();
  const busy = analyze.isPending || approve.isPending;
  const submit = async () => { if (await runAnalysis()) navigate('/analysis'); };
  return (
    <div className="af-page af-narrow">
      <PageHead kicker="Step 1" title="Repair intake" sub="Describe the fault, pick the customer site, then analyze." />
      <Card title={<><Inbox size={15} /> Fault notes</>} aside={<span className="af-mock-pill"><FlaskConical size={10} /> Mock AI</span>}>
        <label className="af-label" htmlFor="site-select"><span>Customer site (sample location)</span></label>
        <select id="site-select" className="af-select" data-testid="select-customer-site" value={customerSiteId} disabled={busy} onChange={(e) => updateCustomerSite(e.target.value)}>
          {DEMO_CUSTOMER_SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <p className="af-hint" style={{ marginBottom: 14 }}>Synthetic demo coordinates in {customerSite.area}. This site is saved with the dispatch on approval. Changing the site clears any existing analysis.</p>
        <div className="af-label">
          <span>Fault notes</span>
          <span className="af-inline-actions">
            <button className="af-quiet-btn" type="button" onClick={() => updateNotes(SAMPLE)} disabled={busy}><FileText size={12} /> Load sample</button>
            <button className="af-quiet-btn" type="button" onClick={() => updateNotes('')} disabled={busy || !notes}><Eraser size={12} /> Clear</button>
          </span>
        </div>
        <textarea className="af-textarea" data-testid="input-fault-notes" disabled={approve.isPending} value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit(); }}
          maxLength={5000} aria-label="Fault notes"
          placeholder="Paste the customer's message, call notes or technician scribbles. Messy is fine." />
        {analysisError && (
          <div className="af-error af-hub-message" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
            <span>{analysisError}</span>
            <button className="af-quiet-btn" type="button" onClick={() => void submit()} disabled={busy || !notes.trim()}>Retry analysis</button>
          </div>
        )}
        <button className="af-primary" data-testid="button-analyze" type="button" onClick={() => void submit()} disabled={!notes.trim() || busy}>
          <ScanSearch size={15} /> {analyze.isPending ? 'Reading repair notes…' : 'Analyze request'} {!analyze.isPending && <ArrowDownRight size={14} />}
        </button>
        <p className="af-hint">Mock AI mode: analysis returns the fixed sample diagnosis regardless of the notes entered. Use Ctrl + Enter to analyze.</p>
      </Card>
    </div>
  );
}
