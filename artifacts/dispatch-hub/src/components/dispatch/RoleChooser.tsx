import { useState } from 'react';
import { ArrowLeft, Briefcase, FlaskConical, HardHat, Radio } from 'lucide-react';
import { getGetHubDataQueryKey, useGetHubData } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InlineError, initials } from './shared';
import { LevelBadge } from './techMeta';
import { useDemoSession } from './session';

export default function RoleChooser() {
  const { choose } = useDemoSession();
  const [picking, setPicking] = useState(false);
  const hubQ = useGetHubData({ query: { queryKey: getGetHubDataQueryKey() } });
  const techs = hubQ.data?.technicians ?? [];
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <div className="dh-rise w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Radio size={18} strokeWidth={2.5} /></span>
          <span className="font-display text-xl font-semibold tracking-tight">Dispatch Hub</span>
        </div>
        <div>
          <h1 className="text-[34px] font-semibold leading-[1.05] md:text-[44px]">{picking ? 'Which technician are you?' : 'Choose a demo role'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {picking ? 'Pick a synthetic technician identity. Your jobs, history and reviews follow this choice.' : 'See the workspace as the boss or as a field technician.'}
          </p>
        </div>
        <p role="note" className="flex items-start gap-2 rounded-lg border border-pending/30 bg-pending/[0.07] px-4 py-3 text-xs leading-5">
          <FlaskConical size={14} className="mt-0.5 shrink-0 text-pending" />
          <span><strong>Demo role selection, not real security.</strong> There is no password and no account. The choice only changes what this browser tab shows, and is forgotten when the tab closes.</span>
        </p>
        {!picking ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" data-testid="button-role-boss" onClick={() => choose({ role: 'boss' })}
              className="group rounded-xl border border-card-border bg-card p-5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/50 motion-reduce:transition-none">
              <Briefcase size={22} className="text-primary" />
              <span className="mt-4 block font-display text-2xl font-semibold">Boss</span>
              <span className="mt-1 block text-sm text-muted-foreground">Dispatch CEO. Assign jobs, watch transport, read workshop analysis.</span>
            </button>
            <button type="button" data-testid="button-role-technician" onClick={() => setPicking(true)}
              className="group rounded-xl border border-card-border bg-card p-5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/50 motion-reduce:transition-none">
              <HardHat size={22} className="text-primary" />
              <span className="mt-4 block font-display text-2xl font-semibold">Technician</span>
              <span className="mt-1 block text-sm text-muted-foreground">Field view. Take open requests, finish your jobs, see your history.</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(false)} data-testid="button-role-back"><ArrowLeft size={14} /> Back</Button>
            {hubQ.isLoading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
              : !techs.length ? <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching}>The technician roster could not be loaded.</InlineError>
              : (
                <ul className="grid gap-2 sm:grid-cols-2" aria-label="Demo technicians">
                  {techs.map((t) => (
                    <li key={t.id}>
                      <button type="button" data-testid={`button-identity-${t.id}`} onClick={() => choose({ role: 'technician', technicianId: t.id })}
                        className="flex w-full items-center gap-3 rounded-xl border border-card-border bg-card p-3 text-left transition-colors hover:border-primary/50">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs font-semibold">{initials(t.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{t.name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><LevelBadge tech={t} /></span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
