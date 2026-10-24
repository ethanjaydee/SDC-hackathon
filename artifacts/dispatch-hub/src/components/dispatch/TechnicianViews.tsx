import { Activity as ActivityIcon, MessageSquareText, Star, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { TechnicianWorkHistoryTable } from './ServiceHistory';
import { ratingText } from './techMeta';
import { getDemoReviewsForTechnician } from './demoReviewSamples';
import { useDemoSession } from './session';

function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-pending text-pending' : 'text-muted-foreground/35'} aria-hidden="true" />)}</span>;
}

/** A single technician's work-history table, including its labeled sample rows. */
export function TechnicianHistory({ hub }: Hub) {
  const { technicianId } = useDemoSession();
  const me = hub.technicians.find((t) => t.id === technicianId);
  return (
    <div className="space-y-5" data-testid="technician-history">
      <PageHead kicker="Your work" title="Service History" sub={`Completed-job history for ${me?.name ?? 'you'} only.`} />
      {me ? <TechnicianWorkHistoryTable technician={me} /> : (
        <EmptyState icon={<ActivityIcon size={16} />} title="Technician history unavailable">
          Your work history will appear when your technician profile loads.
        </EmptyState>
      )}
    </div>
  );
}

/** Sample customer comments for the signed-in technician only. */
export function TechnicianReviews({ hub }: Hub) {
  const { technicianId } = useDemoSession();
  const me = hub.technicians.find((t) => t.id === technicianId);
  const reviews = me ? getDemoReviewsForTechnician(me.id, me.level) : [];
  return (
    <div className="space-y-5" data-testid="technician-reviews">
      <PageHead kicker="Voice of the customer" title="Customer reviews" sub={me ? `Review feedback for ${me.name} only.` : 'Your review feedback.'}>
        {me && <StatusBadge tone="busy">Viewing as {me.name}</StatusBadge>}
      </PageHead>
      <p role="note" className="rounded-lg border border-pending/20 bg-pending/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground">Illustrative sample comments for your technician profile only. They are fictional, not saved customer reviews.</p>
      {!hub.hubQ.isLoading && !me ? (
        <EmptyState icon={<MessageSquareText size={17} />} title="Technician profile unavailable">Reviews appear when your technician profile loads.</EmptyState>
      ) : me && (
        <Card title={me.name} aside={<Mono>{reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '—'}/5 · {reviews.length}</Mono>}>
          <ul className="space-y-2" data-testid={`tech-reviews-${me.id}`}>
            {reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-card-border bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{review.job}</span><Stars n={review.rating} /></div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{review.comment}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
        <Card title={<><Star size={15} /> Sample record</>} aside={<StatusBadge tone="pending">Illustrative only</StatusBadge>} className="min-w-0">
          {me ? (
            <dl className="grid gap-2 text-sm [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]" data-testid="technician-sample-record">
              <div className="min-w-0 rounded-xl border border-primary/15 bg-primary/[0.045] p-3">
                <dt className="text-[11px] font-medium text-muted-foreground">Completed jobs</dt>
                <dd className="mt-2 font-mono text-2xl font-semibold tabular">{me.demo_completed_jobs ?? 0}</dd>
              </div>
              <div className="min-w-0 rounded-xl border border-amber-500/20 bg-amber-500/[0.045] p-3">
                <dt className="text-[11px] font-medium text-muted-foreground">Sample rating</dt>
                <dd className="mt-2 flex flex-wrap items-center gap-2">
                  <Stars n={Math.round(me.rating ?? 0)} />
                  <span className="font-mono text-lg font-semibold tabular">{ratingText(me)}<span className="text-sm text-muted-foreground">/5</span></span>
                </dd>
              </div>
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
