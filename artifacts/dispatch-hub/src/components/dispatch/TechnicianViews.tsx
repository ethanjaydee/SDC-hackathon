import { Activity as ActivityIcon, History, MessageSquareText, Star, Truck, UserRound } from 'lucide-react';
import { Link } from 'wouter';
import type { Activity } from '@workspace/api-client-react';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, dateTime, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { BadgeButton } from './ServiceHistory';
import { ratingText } from './techMeta';
import { getDemoReviewsForTechnician } from './demoReviewSamples';
import { useDemoSession } from './session';

function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-pending text-pending' : 'text-muted-foreground/35'} aria-hidden="true" />)}</span>;
}

/** Own saved history plus clearly illustrative sample work. */
export function TechnicianHistory({ hub, notice }: Hub & { notice: string }) {
  const { technicianId } = useDemoSession();
  const me = hub.technicians.find((t) => t.id === technicianId);
  const own = hub.activity.filter((e: Activity) => e.dispatch?.tech_id === technicianId);
  const ownIds = new Set(own.map((e) => e.id));
  const completions = hub.activity.filter((e) => e.completion_dispatch_id != null && ownIds.has(e.completion_dispatch_id));
  return (
    <div className="space-y-5" data-testid="technician-history">
      <PageHead kicker="Your work" title="Service History" sub={`Saved jobs for ${me?.name ?? 'you'} only.`} />
      {notice && <div className="dh-rise rounded-lg border border-ok/30 bg-ok/[0.08] px-4 py-2.5 text-sm" role="status">{notice}</div>}
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      <Card title={<><History size={15} /> Saved assignments</>} aside={<StatusBadge tone="ok">Actual record</StatusBadge>}>
        {hub.hubQ.isError && !hub.hubQ.data ? <InlineError onRetry={() => void hub.hubQ.refetch()}>History unavailable until the hub reconnects.</InlineError>
          : own.length === 0 ? <EmptyState icon={<History size={16} />} title="No saved jobs yet">Approve an open request and it will appear here.</EmptyState> : (
          <ul className="divide-y">
            {own.map((e) => (
              <li key={e.id} className="space-y-1.5 py-3 text-sm" data-testid={`own-job-${e.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><Mono>#{e.id}</Mono> · {e.dispatch!.customer_site?.label ?? 'Historical site unknown'}</span>
                  <Mono className="text-xs text-muted-foreground">{dateTime(e.timestamp)}</Mono>
                </div>
                <p className="text-xs text-muted-foreground">Parts: {e.dispatch!.parts.join(', ')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <CompletionControl entry={e} hub={hub} />
                  {e.dispatch!.conversation_id != null && <Link href={`/analysis/${e.dispatch!.conversation_id}`} className="text-xs font-medium text-primary">Open request</Link>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {completions.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{completions.length} completion {completions.length === 1 ? 'record' : 'records'} saved.</p>}
      </Card>
      {me && (
        <Card title={<><UserRound size={15} /> Sample completed work</>} aside={<StatusBadge tone="pending">Illustrative · not audit</StatusBadge>}>
          <p className="mb-3 text-xs text-muted-foreground">Mock completed-job values with a sample photo and invoice. Separate from your saved assignments above.</p>
          <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]" data-testid="sample-work-preview">
            <div className="relative overflow-hidden rounded-lg border">
              <img src={`${import.meta.env.BASE_URL}completion-proofs/${me.id % 2 ? 'filter-service.jpg' : 'window-ac-service.jpg'}`} alt="Illustrative service photo" className="h-32 w-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">SAMPLE photo</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border p-2"><dt className="text-muted-foreground">Sample jobs</dt><dd className="mt-1 font-mono text-lg font-semibold">{me.demo_completed_jobs ?? 0}</dd></div>
              <div className="rounded-lg border p-2"><dt className="text-muted-foreground">Rating</dt><dd className="mt-1 font-mono text-lg font-semibold">{ratingText(me)}</dd></div>
              <div className="rounded-lg border p-2"><dt className="text-muted-foreground">Score</dt><dd className="mt-1 font-mono text-lg font-semibold">{((me.demo_completed_jobs ?? 0) * (me.rating ?? 0)).toFixed(0)}</dd></div>
            </dl>
          </div>
          <BadgeButton t={me} rank={0} podium={false} />
        </Card>
      )}
    </div>
  );
}

/** Customer comments grouped by technician; own group first. Illustrative samples only. */
export function TechnicianReviews({ hub }: Hub) {
  const { technicianId } = useDemoSession();
  const techs = [...hub.technicians].sort((a, b) => Number(b.id === technicianId) - Number(a.id === technicianId) || a.name.localeCompare(b.name));
  const me = techs.find((t) => t.id === technicianId);
  return (
    <div className="space-y-5" data-testid="technician-reviews">
      <PageHead kicker="Voice of the customer" title="Customer reviews" sub="Comments customers left about each technician, yours first.">
        {me && <StatusBadge tone="busy">Viewing as {me.name}</StatusBadge>}
      </PageHead>
      <p role="note" className="rounded-lg border border-pending/20 bg-pending/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground">Illustrative sample comments only. They are fictional, not saved customer reviews.</p>
      {hub.hubQ.isLoading ? null : techs.length === 0 ? <EmptyState icon={<MessageSquareText size={17} />} title="No technicians loaded">Reviews appear when the roster loads.</EmptyState> : techs.map((t) => {
        const reviews = getDemoReviewsForTechnician(t.id, t.level);
        const mine = t.id === technicianId;
        return (
          <Card key={t.id} className={mine ? 'border-primary/40' : ''} title={<>{t.name}{mine && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">YOU</span>}</>}
            aside={<Mono>{reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'}/5 · {reviews.length}</Mono>}>
            <ul className="space-y-2" data-testid={`tech-reviews-${t.id}`}>
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-card-border bg-card px-3 py-2">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{r.job}</span><Stars n={r.rating} /></div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{r.comment}</p>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

export function TechnicianOverview({ hub }: Hub) {
  const { technicianId } = useDemoSession();
  const me = hub.technicians.find((t) => t.id === technicianId);
  const active = hub.activity.filter((e) => e.dispatch?.tech_id === technicianId && e.dispatch.status === 'Active');
  const vans = hub.hubQ.data?.vans ?? [];
  const free = vans.filter((v) => v.status === 'Available');
  return (
    <div className="space-y-5" data-testid="technician-overview">
      <PageHead large kicker="Your day" title={me ? `Hello, ${me.name.split(' ')[0]}` : 'Overview'} sub="Your active jobs, sample record and the vans available to take out.">
        {me && <StatusBadge tone={me.status === 'Available' ? 'ok' : 'err'}>{me.status}</StatusBadge>}
      </PageHead>
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<><ActivityIcon size={15} /> Active jobs</>} aside={<Mono>{active.length}</Mono>}>
          {active.length === 0 ? <EmptyState icon={<ActivityIcon size={16} />} title="No active job">Take an open request from <Link href="/intake" className="text-primary underline">Work Order</Link>.</EmptyState> : (
            <ul className="divide-y">
              {active.map((e) => (
                <li key={e.id} className="space-y-1.5 py-3 text-sm">
                  <p><Mono>#{e.id}</Mono> · {e.dispatch!.customer_site?.label}</p>
                  <p className="text-xs text-muted-foreground">Parts: {e.dispatch!.parts.join(', ')}</p>
                  <CompletionControl entry={e} hub={hub} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={<><Star size={15} /> Sample record</>} aside={<StatusBadge tone="pending">Demo values</StatusBadge>}>
          {me ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Completed jobs</dt><dd className="mt-1 font-mono text-2xl font-semibold">{me.demo_completed_jobs ?? 0}</dd></div>
              <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Rating</dt><dd className="mt-1 font-mono text-2xl font-semibold">{ratingText(me)}</dd></div>
            </dl>
          ) : <p className="text-sm text-muted-foreground">Loading your profile…</p>}
        </Card>
      </div>
      <Card title={<><Truck size={15} /> Shared transport</>} aside={<Mono>{free.length}/{vans.length} available</Mono>}>
        {vans.length === 0 ? <p className="text-sm text-muted-foreground">No transport data yet.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vans.map((v) => <li key={v.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${v.status === 'Busy' ? 'border-err/25 bg-err/[0.06]' : ''}`}><span>{v.name}</span><StatusBadge tone={v.status === 'Busy' ? 'err' : 'ok'}>{v.status === 'Busy' ? 'Busy' : 'Available'}</StatusBadge></li>)}
          </ul>
        )}
        <Link href="/transport" className="mt-3 inline-block text-xs font-medium text-primary">Open Transport</Link>
      </Card>
    </div>
  );
}
