import { Inbox, Loader2, ScanSearch, FileText, Eraser } from 'lucide-react';
import { Panel, SectionLabel } from './ui';

const SAMPLE =
  "Customer: Halvorsen Marine, slip 14. 2016 Yamaha console - dash went completely dark mid-trip, smelled hot plastic near the gauge pod. Engine still cranks. Owner says cluster flickered for a week before. Needs someone today, charter booked tomorrow 7am.";

export default function IntakePanel({ notes, onChange, onAnalyze, pending, error }) {
  const empty = !notes.trim();
  return (
    <Panel step="01" title="Incoming Service Request" icon={Inbox}>
      <SectionLabel
        right={
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onChange(SAMPLE)}
              disabled={pending}
              data-testid="button-sample"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
            >
              <FileText className="h-3 w-3" /> Load sample
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={pending || empty}
              data-testid="button-clear"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
            >
              <Eraser className="h-3 w-3" /> Clear
            </button>
          </div>
        }
      >
        Fault notes
      </SectionLabel>
      <div className="group relative flex flex-1 flex-col">
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onAnalyze();
          }}
          maxLength={5000}
          placeholder="Paste the customer's message, call notes or technician scribbles. Messy is fine."
          data-testid="input-notes"
          className="min-h-[220px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-[13px] leading-relaxed text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-sky-500/60 focus:ring-4 focus:ring-sky-500/10"
        />
        <span className="pointer-events-none absolute bottom-2.5 right-3 font-mono text-[10px] text-slate-600">
          {notes.length}/5000
        </span>
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300" data-testid="text-analyze-error">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onAnalyze}
        disabled={empty || pending}
        data-testid="button-analyze"
        className="group/btn relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg bg-sky-400 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
        {pending ? 'Analyzing request...' : 'Analyze Request'}
        {!pending && !empty && (
          <kbd className="ml-1 rounded border border-slate-950/20 px-1 font-mono text-[10px] text-slate-900/70">Ctrl+Enter</kbd>
        )}
      </button>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Mock AI mode: analysis returns a fixed demo result regardless of the notes entered.
      </p>
    </Panel>
  );
}
