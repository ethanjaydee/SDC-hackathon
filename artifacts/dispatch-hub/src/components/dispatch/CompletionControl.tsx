import { CheckCircle2 } from 'lucide-react';
import type { Activity } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import type { DispatchState } from './useDispatchHub';
import { ConfirmAction, StatusBadge, dateTime } from './shared';

export function CompletionControl({ entry, hub, completedBy, buttonLabel }: { entry: Activity; hub: DispatchState; completedBy?: string; buttonLabel?: string }) {
  const job = entry.dispatch;
  if (!job) return null;
  if (job.status === 'Completed') {
    return <StatusBadge tone="ok" data-testid={`completed-dispatch-${entry.id}`}>
      Completed{job.completed_at ? ` · ${dateTime(job.completed_at)}` : ''}
    </StatusBadge>;
  }
  if (job.status === 'Unknown') return <p className="text-xs text-muted-foreground">Legacy assignment · active status unknown; completion unavailable.</p>;
  const pending = hub.complete.isPending && hub.complete.variables?.data.dispatch_id === entry.id;
  return (
    <ConfirmAction
      title={`Complete dispatch #${entry.id}?`}
      description={<><p>{job.technician_name} becomes available again.</p><p>Consumed parts will not be restored to van stock.</p></>}
      confirmLabel="Complete job"
       onConfirm={() => void hub.completeJob(entry.id, completedBy)}
      trigger={
        <Button type="button" size="sm" variant="outline" data-testid={`complete-dispatch-${entry.id}`}
          disabled={hub.writePending || hub.connectionLost}>
          <CheckCircle2 size={13} className="text-ok" /> {pending ? 'Completing…' : buttonLabel ?? `Complete job #${entry.id}`}
        </Button>
      }
    />
  );
}
