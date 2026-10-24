import { Activity as ActivityIcon, MessageSquareText, Star, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, type Hub } from './shared';
import { CompletionControl } from './CompletionControl';
import { TechnicianWorkHistoryTable } from './ServiceHistory';
import { ratingText } from './techMeta';
import { getDemoReviewsForTechnician } from './demoReviewSamples';
import { useDemoSession } from './session';
import { TechnicianAvatar } from './TechnicianAvatar';

function Stars({ n }: { n: number }) {
  return <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-current text-pending' : 'text-muted-foreground/35'} aria-hidden="true" />)}</span>;
}

/** A single technician's work-history table, including its labeled sample rows. */
export function TechnicianHistory({ hub }: Hub) {
  const { technicianId } = useDemoSession();
  const me = hub.technicians.find((t) => t.id === technicianId);
  return (
    <div className="space-y-5" data-testid="technician-history">
      <PageHead kicker="Your work" title="Service History" sub={`Completed-job history for ${me?.name ?? 'you'} only.`}>
        {me && <TechnicianAvatar id={me.id} name={me.name} className="h-12 w-12" />}
      </PageHead>
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
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  return (
    <div className="space-y-5" data-testid="technician-reviews">
      <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card/70 p-4 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
        <PageHead kicker="Voice of the customer" title="Customer reviews" sub={me ? `Review feedback for ${me.name} only.` : 'Your review feedback.'}>
          {me && <StatusBadge tone="busy">Viewing as {me.name}</StatusBadge>}
        </PageHead>
      </div>
      <p role="note" className="flex gap-3 rounded-xl border border-pending/20 bg-pending/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-pending/20 bg-pending/[0.08] text-pending"><MessageSquareText size={12} aria-hidden="true" /></span>
        <span><strong className="font-semibold text-foreground/80">Sample data.</strong> Illustrative sample comments for your technician profile only. They are fictional, not saved customer reviews.</span>
      </p>
      {!hub.hubQ.isLoading && !me ? (
        <EmptyState icon={<MessageSquareText size={17} />} title="Technician profile unavailable">Reviews appear when your technician profile loads.</EmptyState>
      ) : me && (
        <Card title={<><TechnicianAvatar id={me.id} name={me.name} className="h-8 w-8" />{me.name}</>} aside={<Mono>{reviews.length} reviews</Mono>}>
          {reviews.length > 0 && average != null && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-pending/15 bg-pending/[0.035] px-3 py-2.5">
              <span className="font-mono text-2xl font-semibold leading-none tabular">{average.toFixed(1)}</span>
              <div className="space-y-0.5">
                <Stars n={Math.round(average)} />
                <p className="text-[10px] text-muted-foreground">Average sample rating · {reviews.length} comments</p>
              </div>
            </div>
          )}
          <ul className="space-y-2.5" data-testid={`tech-reviews-${me.id}`}>
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-card-border bg-background/55 px-3.5 py-3">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-xs font-semibold leading-4">{review.job}</span>
                  <div className="flex items-center gap-2">
                    <Stars n={review.rating} />
                    <span className="font-mono text-[10px] text-muted-foreground">{review.rating}/5</span>
                  </div>
                </div>
                <p className="mt-2 border-l-2 border-primary/20 pl-2.5 text-xs leading-[1.65] text-muted-foreground">{review.comment}</p>
              </li>
            ))}
          </ul>
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">No sample reviews are available.</p>}
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
        {me && <TechnicianAvatar id={me.id} name={me.name} className="h-14 w-14" />}
        {me && <StatusBadge tone={me.status === 'Available' ? 'ok' : 'err'}>{me.status}</StatusBadge>}
      </PageHead>
      {hub.completionError && <InlineError>{hub.completionError}</InlineError>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
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
        <Card title={<><Star size={15} /> Sample record</>} aside={<StatusBadge tone="pending">Illustrative only</StatusBadge>} className="min-w-0 self-start">
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
