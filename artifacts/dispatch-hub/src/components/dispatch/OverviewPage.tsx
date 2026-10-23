import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Boxes, History, Inbox, Star, Wallet, UserRound } from 'lucide-react';
import { useUser } from '@clerk/react';
import {
  getListConversationsQueryKey,
  getListWorkshopReviewsQueryKey,
  useListConversations,
  useListWorkshopReviews,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, EmptyState, InlineError, Mono, PageHead, StatusBadge, dateTime, type Hub } from './shared';
import { canAutoRefresh, pollInterval } from '@/lib/reliability';
import { getUnfinishedRequests } from './overviewMetrics';
import { ANALYTICS_YEARS, MONTHS, getSalaryYtd } from './workshopAnalytics';

export default function OverviewPage({ hub }: Hub) {
  const { hubQ, technicians, inventory, activity } = hub;
  const requestsQ = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      refetchInterval: pollInterval(),
      refetchOnWindowFocus: canAutoRefresh,
      enabled: !hub.writePending,
    },
  });
  const reviewsQ = useListWorkshopReviews({
    query: {
      queryKey: getListWorkshopReviewsQueryKey(),
      refetchInterval: pollInterval(),
      refetchOnWindowFocus: canAutoRefresh,
    },
  });
  const { user } = useUser();
  const [rosterOpen, setRosterOpen] = useState(false);
  const ready = !!hubQ.data;
  const availableCount = technicians.filter((tech) => tech.status === 'Available').length;
  const requestsReady = ready && !!requestsQ.data;
  const requestCounts = getUnfinishedRequests(requestsQ.data?.conversations ?? [], activity);
  const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const currentYear = Number(dateParts.find((part) => part.type === 'year')!.value);
  const salaryYear = ANALYTICS_YEARS.find((year) => year === currentYear) ?? ANALYTICS_YEARS[ANALYTICS_YEARS.length - 1];
  const salaryMonth = salaryYear === currentYear ? Number(dateParts.find((part) => part.type === 'month')!.value) : 12;
  const salaryYtd = getSalaryYtd(salaryYear, salaryMonth);
  const lowStockItems = inventory.filter((line) => line.quantity < 5);
  const latest = activity.slice(0, 4);
  const displayName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Technician';
  const readinessTone = !ready ? 'pending' : hubQ.isError ? 'err' : 'ok';

  return (
    <div className="space-y-5">
      <PageHead
        kicker="Workshop · dispatch overview"
        title={`Welcome ${displayName}.`}
        sub="A quick read on who can roll and what the vans can carry."
      >
        <Button asChild>
          <Link href="/intake"><Inbox size={15} /> Open customer conversations <ArrowRight size={14} /></Link>
        </Button>
      </PageHead>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.9fr)]">
        <Card
          title="Technician readiness"
          aside={<StatusBadge tone={readinessTone}>{!ready ? 'Awaiting data' : hubQ.isError ? 'Cached data' : 'Live from hub'}</StatusBadge>}
          className="min-w-0"
        >
          {hubQ.isLoading && !ready ? (
            <div className="grid gap-6 sm:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1fr)] sm:items-center" role="status" aria-label="Loading technician readiness" data-testid="overview-readiness-loading">
              <Skeleton className="mx-auto aspect-square w-full max-w-[17rem] rounded-full" />
              <div className="space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            </div>
          ) : !ready && hubQ.isError ? (
            <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching} testId="overview-readiness-error">
              Technician readiness is unavailable until the hub reconnects.
            </InlineError>
          ) : (
            <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1fr)] sm:items-center" data-testid="overview-readiness" aria-busy={hubQ.isFetching}>
              <div className="flex justify-center">
                <button
                  type="button"
                  aria-label={`${ready ? `Technician availability: ${availableCount} of ${technicians.length} available.` : 'Technician availability data unavailable.'} ${rosterOpen ? 'Hide' : 'Show'} roster details.`}
                  aria-expanded={rosterOpen}
                  aria-controls="overview-technician-details"
                  data-testid="overview-availability-circle"
                  onClick={() => setRosterOpen((open) => !open)}
                  className="group relative grid aspect-square w-full max-w-[17.5rem] place-items-center rounded-full border border-card-border bg-[radial-gradient(circle_at_50%_42%,hsl(var(--card)),hsl(var(--muted))_105%)] text-center shadow-[0_16px_44px_-30px_hsl(var(--foreground)/.4)] transition-transform duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card motion-reduce:transition-none"
                >
                  <svg viewBox="0 0 220 220" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90 p-3">
                    <circle cx="110" cy="110" r="99" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                    <circle
                      cx="110" cy="110" r="99" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 99}
                      strokeDashoffset={ready && technicians.length ? 2 * Math.PI * 99 * (1 - availableCount / technicians.length) : 2 * Math.PI * 99}
                      className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                    />
                    <circle cx="110" cy="110" r="91" fill="none" stroke="hsl(var(--foreground) / .055)" strokeWidth="1" strokeDasharray="2 7" />
                  </svg>
                  <span className="relative z-10 flex flex-col items-center px-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ready to roll</span>
                    <span className="mt-2 font-display text-[4.5rem] font-semibold leading-[0.9] tracking-[-0.07em] tabular sm:text-[5rem]" data-testid="overview-availability-value">
                      {ready ? availableCount : '—'}
                      <span className="ml-1 text-2xl font-medium tracking-normal text-muted-foreground sm:text-3xl">{ready ? `/ ${technicians.length}` : ''}</span>
                    </span>
                    <span className="mt-3 text-sm font-medium text-foreground">technicians available</span>
                    <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                      {rosterOpen ? 'Hide details' : 'View readiness'}
                      <ArrowRight size={12} className={`transition-transform duration-300 motion-reduce:transition-none ${rosterOpen ? 'rotate-90' : ''}`} />
                    </span>
                  </span>
                </button>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">On the roster</p>
                    <h3 className="mt-1 font-display text-lg font-semibold">Technicians</h3>
                  </div>
                  <Link href="/technicians" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="link-overview-technicians">
                    Full roster <ArrowRight size={13} />
                  </Link>
                </div>
                {technicians.length ? (
                  <ul className="grid grid-cols-2 gap-2" data-testid="overview-technician-list">
                    {technicians.map((tech) => {
                      const available = tech.status === 'Available';
                      return (
                        <li key={tech.id} aria-label={`${tech.name}, ${tech.status}, ${tech.zone}`} className={`flex min-w-0 items-start gap-2 rounded-lg border px-2 py-2 ${available ? 'border-ok/20 bg-ok/[0.045]' : 'border-border/70 bg-muted/45'}`} data-testid={`overview-technician-${tech.id}`}>
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${available ? 'border-ok/25 bg-ok/10 text-ok' : 'border-border bg-muted text-muted-foreground'}`}>
                            <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-xs font-semibold leading-tight">{tech.name}</span>
                            <span className={`mt-1 block w-fit rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] ${available ? 'border-ok/25 bg-ok/10 text-ok' : 'border-border bg-muted text-muted-foreground'}`}>
                              {tech.status}
                            </span>
                            <span className={`mt-1 block text-[10px] leading-tight ${available ? 'text-ok' : 'text-muted-foreground'}`}>
                              {available ? 'Ready' : 'Unavailable'}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon={<UserRound size={17} />} title="No technicians on roster">Availability will appear here when the workshop roster is connected.</EmptyState>
                )}
                {rosterOpen && (
                  <div id="overview-technician-details" role="region" aria-label="Technician readiness details" className="dh-rise mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">Only technicians marked <strong className="font-semibold text-foreground">Available</strong> can be assigned a new dispatch. Busy and other statuses remain visible in muted rows.</p>
                    <Link href="/technicians" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Review technician roster <ArrowRight size={12} /></Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="grid min-w-0 content-start gap-3">
          <Card
            title="Unfinished service requests"
            aside={<StatusBadge tone={!requestsReady ? 'pending' : hubQ.isError || requestsQ.isError ? 'err' : 'ok'}>{!requestsReady ? 'Awaiting data' : hubQ.isError || requestsQ.isError ? 'Cached data' : 'Open requests'}</StatusBadge>}
            className="min-w-0"
          >
            {!requestsReady && !hubQ.isError && !requestsQ.isError ? (
              <div role="status" aria-label="Loading unfinished requests" data-testid="overview-requests-loading"><Skeleton className="h-14 w-40" /><Skeleton className="mt-3 h-4 w-52" /></div>
            ) : !requestsReady && (hubQ.isError || requestsQ.isError) ? (
              <InlineError onRetry={() => { void hubQ.refetch(); void requestsQ.refetch(); }} retrying={hubQ.isFetching || requestsQ.isFetching} testId="overview-requests-error">Service requests are unavailable until the hub reconnects.</InlineError>
            ) : (
              <div data-testid="overview-unfinished-requests">
                <div className="flex items-end gap-3">
                  <span className="font-mono text-5xl font-semibold leading-none tracking-[-0.07em] tabular text-foreground sm:text-6xl" data-testid="overview-unfinished-count">{requestsReady ? requestCounts.unfinished : '—'}</span>
                  <span className="pb-1 font-display text-lg font-medium text-muted-foreground">requests</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-card-border pt-3">
                  <span className="text-xs text-muted-foreground">{requestCounts.awaitingDispatch} awaiting dispatch · {requestCounts.inProgress} in progress</span>
                  <Link href="/intake" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="link-overview-requests">
                    View service requests <ArrowRight size={13} />
                  </Link>
                </div>
                {requestCounts.unknown > 0 && <p className="mt-2 text-xs text-muted-foreground">{requestCounts.unknown} older request(s) have unconfirmed completion and are not included above.</p>}
              </div>
            )}
          </Card>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SummaryLink
              href="/workshop-analysis"
              title="Salary · YTD"
              value={`RM ${salaryYtd.toLocaleString('en-MY')}`}
              caption={`Jan–${MONTHS[salaryMonth - 1]} ${salaryYear} · Sample`}
              icon={<Wallet size={16} />}
              testId="overview-salary-ytd"
              linkTestId="link-overview-salary"
              loading={false}
              error={false}
              cached={false}
              badge="Mock data"
              retry={() => void hubQ.refetch()}
              retrying={hubQ.isFetching}
              errorMessage="Salary sample unavailable."
            />
            <SummaryLink
              href="/stock/low"
              title="Low stock"
              value={ready ? lowStockItems.length : null}
              caption="Lines below 5 units"
              icon={<Boxes size={16} />}
              testId="overview-low-stock-count"
              linkTestId="link-overview-low-stock"
              loading={hubQ.isLoading && !ready}
              error={!ready && hubQ.isError}
              cached={ready && hubQ.isError}
              retry={() => void hubQ.refetch()}
              retrying={hubQ.isFetching}
              errorMessage="Low-stock count is unavailable until the hub reconnects."
              alert={lowStockItems.length > 0}
            />
            <SummaryLink
              href="/reviews"
              title="Customer rating"
              value={reviewsQ.data?.average_rating == null ? null : `${reviewsQ.data.average_rating.toFixed(1)}/5`}
              caption={reviewsQ.data?.review_count ? `${reviewsQ.data.review_count} reviews · all time` : 'No reviews yet'}
              icon={<Star size={16} />}
              testId="overview-customer-rating"
              linkTestId="link-overview-customer-rating"
              loading={reviewsQ.isLoading && !reviewsQ.data}
              error={reviewsQ.isError && !reviewsQ.data}
              cached={Boolean(reviewsQ.data) && reviewsQ.isError}
              retry={() => void reviewsQ.refetch()}
              retrying={reviewsQ.isFetching}
              errorMessage="Customer rating is unavailable right now."
              ratingStars={reviewsQ.data?.average_rating}
            />
          </div>
        </div>
      </div>

      <Card
        title={<><History size={15} /> Recent dispatch activity</>}
        aside={<Link href="/log" className="inline-flex min-h-8 items-center gap-1 font-medium text-primary hover:underline" data-testid="link-overview-log">Open dispatch log <ArrowRight size={12} /></Link>}
      >
        {hubQ.isLoading && !ready ? (
          <div className="space-y-2" role="status" aria-label="Loading recent activity" data-testid="overview-activity-loading">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !ready && hubQ.isError ? (
          <InlineError onRetry={() => void hubQ.refetch()} retrying={hubQ.isFetching} testId="overview-activity-error">Dispatch history is unavailable until the hub reconnects.</InlineError>
        ) : latest.length ? (
          <ol className="divide-y" data-testid="overview-activity-list">
            {latest.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                <StatusBadge tone={entry.completion_dispatch_id != null ? 'ok' : entry.action_details.startsWith('Technician availability reset:') ? 'idle' : 'busy'}>
                  {entry.completion_dispatch_id != null ? 'Completed' : entry.action_details.startsWith('Technician availability reset:') ? 'Reset' : 'Approved'}
                </StatusBadge>
                <span className="min-w-0 flex-1 truncate text-sm" title={entry.action_details}>{entry.action_details}</span>
                <Mono className="text-xs text-muted-foreground"><time dateTime={entry.timestamp}>{dateTime(entry.timestamp)}</time></Mono>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={<History size={17} />} title="No dispatches recorded yet">Approved allocations will appear here after a dispatch.</EmptyState>
        )}
        {ready && hubQ.isError && <p className="mt-3 text-xs text-err" role="status">Showing cached hub data. Reconnect to refresh readiness and inventory.</p>}
      </Card>
    </div>
  );
}

function SummaryLink({
  href, title, value, caption, icon, testId, linkTestId, loading, error, cached, retry, retrying, errorMessage, alert = false, badge, ratingStars,
}: {
  href: string;
  title: string;
  value: number | string | null;
  caption: string;
  icon: ReactNode;
  testId: string;
  linkTestId: string;
  loading: boolean;
  error: boolean;
  cached: boolean;
  retry: () => void;
  retrying: boolean;
  errorMessage: string;
  alert?: boolean;
  badge?: string;
  ratingStars?: number | null;
}) {
  return (
    <section aria-label={title} data-testid={testId} className="min-w-0 rounded-xl border border-card-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5">
        <h2 className="flex items-center gap-2 text-xs font-semibold"><span className="text-primary">{icon}</span>{title}</h2>
        <span className={`font-mono text-[9px] uppercase tracking-[0.12em] ${cached ? 'text-pending' : 'text-muted-foreground'}`}>{badge ?? (cached ? 'Cached' : 'Overview')}</span>
      </div>
      {loading ? (
        <div role="status" aria-label={`Loading ${title.toLowerCase()}`} className="px-3.5 py-3"><Skeleton className="h-8 w-12" /><Skeleton className="mt-2 h-3 w-32" /></div>
      ) : error ? (
        <div className="px-3.5 py-3"><InlineError onRetry={retry} retrying={retrying}>{errorMessage}</InlineError></div>
      ) : (
        <Link href={href} aria-label={`Open ${title}: ${value ?? 'not rated'}, ${caption}`} data-testid={linkTestId} className="group flex min-h-[4.75rem] items-end justify-between gap-2 px-3.5 pb-3.5 pt-2 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`font-mono text-3xl font-semibold leading-none tabular ${alert ? 'text-pending' : ''}`} data-testid={`${testId}-value`}>{value ?? '—'}</span>
              <span className="truncate text-[11px] text-muted-foreground">{caption}</span>
            </span>
            {ratingStars !== undefined && (
              <span className="flex h-4 items-center gap-0.5" role="img" aria-label={ratingStars == null ? 'No ratings yet' : `${ratingStars.toFixed(1)} out of 5 stars`} data-testid={`${testId}-stars`}>
                {Array.from({ length: 5 }, (_, index) => {
                  const filled = ratingStars == null ? 0 : Math.max(0, Math.min(1, ratingStars - index));
                  return (
                    <span key={index} className="relative inline-flex h-[14px] w-[14px]">
                      <Star size={14} className="absolute inset-0 text-muted-foreground/35" aria-hidden="true" />
                      {filled > 0 && (
                        <span className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - filled * 100}% 0 0)` }}>
                          <Star size={14} className="fill-amber-400 text-amber-500" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  );
                })}
              </span>
            )}
          </span>
          <ArrowRight size={15} className="mb-0.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      )}
    </section>
  );
}
