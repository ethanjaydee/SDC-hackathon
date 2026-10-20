import { CheckCircle2 } from 'lucide-react';
import type { Activity } from '@workspace/api-client-react';
import type { DispatchState } from './useDispatchHub';
import { dateTime } from './shared';

export function CompletionControl({ entry, hub }: { entry: Activity; hub: DispatchState }) {
  const job = entry.dispatch;
  if (!job) return null;
  if (job.status === 'Completed') {
    return <p className="af-hint" data-testid={`completed-dispatch-${entry.id}`}>
      Completed{job.completed_at ? ` · ${dateTime(job.completed_at)}` : ''}
    </p>;
  }
  if (job.status === 'Unknown') return <p className="af-hint">Legacy assignment · active status unknown; completion unavailable.</p>;
  const pending = hub.complete.isPending && hub.complete.variables?.data.dispatch_id === entry.id;
  return <button type="button" className="af-quiet-btn af-outline"
    data-testid={`complete-dispatch-${entry.id}`}
    disabled={hub.complete.isPending || hub.approve.isPending || hub.hubQ.isError}
    onClick={() => {
      if (window.confirm(`Complete dispatch #${entry.id} for ${job.technician_name}? This makes the technician available again. Consumed parts will not be restored.`)) {
        void hub.completeJob(entry.id);
      }
    }}>
    <CheckCircle2 size={12} /> {pending ? 'Completing…' : `Complete job #${entry.id}`}
  </button>;
}
