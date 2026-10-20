import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Eraser, FileText, FlaskConical, Inbox, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { intakeSchema } from '@/lib/validation';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { Card, InlineError, PageHead, StatusBadge, fieldClass, type Hub } from './shared';

const SAMPLE =
  'Customer: Halvorsen Marine, slip 14. 2016 Yamaha console — dash went completely dark mid-trip, smelled hot plastic near the gauge pod. Engine still cranks. Owner says cluster flickered for a week before. Needs someone today, charter booked tomorrow 7am.';

export default function IntakePage({ hub }: Hub) {
  const { notes, analyze, analysisError, updateNotes, runAnalysis, customerSiteId, updateCustomerSite, customerSite, writePending } = hub;
  const [, navigate] = useLocation();
  const [errors, setErrors] = useState<{ text?: string; customer_site_id?: string }>({});
  const busy = analyze.isPending || writePending;
  const submit = async () => {
    const parsed = intakeSchema.safeParse({ text: notes, customer_site_id: customerSiteId });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ text: f.text?.[0], customer_site_id: f.customer_site_id?.[0] });
      return;
    }
    setErrors({});
    if (await runAnalysis()) navigate('/analysis');
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHead kicker="Step 1 of 2" title="Repair intake" sub="Describe the fault, pick the customer site, then analyze." />
      <Card title={<><Inbox size={15} /> Fault notes</>} aside={<StatusBadge tone="pending"><FlaskConical size={10} /> Mock AI</StatusBadge>}>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="site-select">Customer site <span className="text-muted-foreground">(sample location)</span></label>
            <select id="site-select" className={fieldClass} data-testid="select-customer-site" value={customerSiteId} disabled={busy}
              aria-invalid={!!errors.customer_site_id} aria-describedby={errors.customer_site_id ? 'site-error' : 'site-hint'}
              onChange={(e) => { setErrors((x) => ({ ...x, customer_site_id: undefined })); updateCustomerSite(e.target.value); }}>
              {DEMO_CUSTOMER_SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {errors.customer_site_id ? <p id="site-error" className="text-xs text-err">{errors.customer_site_id}</p>
              : <p id="site-hint" className="text-xs text-muted-foreground">Synthetic coordinates in {customerSite.area}. Saved with the dispatch on approval. Changing the site clears any existing analysis.</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="fault-notes">Fault notes</label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => { setErrors({}); updateNotes(SAMPLE); }} disabled={busy}><FileText size={13} /> Load sample</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => updateNotes('')} disabled={busy || !notes}><Eraser size={13} /> Clear</Button>
              </div>
            </div>
            <textarea id="fault-notes" className={`${fieldClass} min-h-44 resize-y leading-relaxed`} data-testid="input-fault-notes" disabled={writePending} value={notes}
              aria-invalid={!!errors.text} aria-describedby={errors.text ? 'notes-error' : 'notes-count'}
              onChange={(e) => { if (errors.text) setErrors((x) => ({ ...x, text: undefined })); updateNotes(e.target.value); }}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit(); }}
              maxLength={5000} placeholder="Paste the customer's message, call notes or technician scribbles. Messy is fine." />
            <div className="flex justify-between gap-2 text-xs">
              {errors.text ? <p id="notes-error" className="text-err">{errors.text}</p> : <span />}
              <span id="notes-count" className="font-mono tabular text-muted-foreground">{notes.length}/5000</span>
            </div>
          </div>

          {analysisError && <InlineError onRetry={() => void submit()} retrying={analyze.isPending} retryLabel="Retry analysis">{analysisError}</InlineError>}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Mock AI returns the fixed sample diagnosis. <kbd className="font-mono">Ctrl + Enter</kbd> to analyze.</p>
            <Button type="submit" data-testid="button-analyze" disabled={!notes.trim() || busy}>
              <ScanSearch size={15} className={analyze.isPending ? 'animate-pulse' : ''} /> {analyze.isPending ? 'Reading repair notes…' : 'Analyze request'} {!analyze.isPending && <ArrowRight size={14} />}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
