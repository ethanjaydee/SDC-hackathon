import { useState } from 'react';
import { ArrowRight, CircleAlert, Lightbulb, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useSummarizeWorkshopReviews } from '@workspace/api-client-react';
import type { WorkshopReviewSummary } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, errorText, fieldClass, InlineError, PageHead, StatusBadge, type Hub } from './shared';
import { filterReviewSamples, getDemoReviewGroups, getOverallLowRatedReviews } from './demoReviewSamples';

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label ?? `${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          strokeWidth={1.8}
          className={index < rating ? 'fill-pending text-pending' : 'text-muted-foreground/35'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ReviewLevelPanel({ group }: { group: ReturnType<typeof getDemoReviewGroups>[number] }) {
  const [technician, setTechnician] = useState('all');
  const [rating, setRating] = useState('all');
  const technicians = Array.from(new Map(group.reviews
    .filter((review) => review.technicianId != null)
    .map((review) => [String(review.technicianId), review.technicianName ?? `Technician ${review.technicianId}`])).entries());
  const reviews = filterReviewSamples(group.reviews, technician, rating);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;

  return (
    <section className="min-w-0 rounded-xl border border-card-border bg-muted/20 p-3.5" aria-labelledby={`sample-review-${group.level}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`sample-review-${group.level}`} className="font-display text-base font-semibold">{group.level}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.note}</p>
        </div>
        <div className="shrink-0 text-right" aria-live="polite">
          <p className="font-mono text-sm font-semibold tabular">{average?.toFixed(1) ?? '—'}<span className="text-muted-foreground">/5</span></p>
          <p className="text-[10px] text-muted-foreground">{reviews.length} of {group.count} samples</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs text-muted-foreground">
          Technician
          <select className={`${fieldClass} mt-1 w-full`} value={technician} onChange={(event) => setTechnician(event.target.value)}
            aria-label={`${group.level} technician filter`} data-testid={`review-technician-filter-${group.level}`}>
            <option value="all">All technicians</option>
            {technicians.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs text-muted-foreground">
          Star rating
          <select className={`${fieldClass} mt-1 w-full`} value={rating} onChange={(event) => setRating(event.target.value)}
            aria-label={`${group.level} star rating filter`} data-testid={`review-rating-filter-${group.level}`}>
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((stars) => <option key={stars} value={stars}>{stars} {stars === 1 ? 'star' : 'stars'}</option>)}
          </select>
        </label>
      </div>
      {reviews.length ? (
        <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto" aria-label={`${group.level} sample reviews`}>
          {reviews.map((review) => (
            <li key={`${review.technicianId}-${review.id}`} className="rounded-md border border-card-border bg-card px-2.5 py-2" data-testid={`sample-review-${review.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold">{review.technicianName ?? 'Sample technician'}</span>
                <Stars rating={review.rating} />
              </div>
              <p className="mt-1 text-[11px] font-medium text-foreground/85">{review.job}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : <p role="status" className="mt-3 rounded-md border border-dashed p-3 text-xs text-muted-foreground">No reviews match these filters.</p>}
      {(technician !== 'all' || rating !== 'all') && (
        <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => { setTechnician('all'); setRating('all'); }}>
          Clear filters
        </Button>
      )}
    </section>
  );
}

function SummaryPanel({ summary }: { summary: WorkshopReviewSummary }) {
  return (
    <div className="space-y-4" data-testid="review-ai-summary">
      <div className="rounded-lg border border-primary/20 bg-primary/[0.055] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Overview</p>
          <StatusBadge tone="pending">
            {summary.review_count} low-rated reviews · 1–2 stars
          </StatusBadge>
        </div>
        <p className="mt-2 text-sm leading-6">{summary.overview}</p>
        {summary.source === 'sample' && (
          <p role="note" className="mt-3 rounded-md border border-pending/20 bg-pending/[0.06] px-3 py-2 text-xs text-muted-foreground">
            This AI summary uses the overall fictional review examples and is illustrative only.
          </p>
        )}
      </div>
      <div>
        <section className="rounded-lg border border-card-border bg-card p-4" aria-labelledby="review-improvements-title">
          <h3 id="review-improvements-title" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight size={15} className="text-primary" /> Improvement opportunities
          </h3>
          {summary.improvements.length ? (
            <ul className="mt-3 space-y-2">
              {summary.improvements.map((item, index) => (
                <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                  <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-primary" />{item}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No improvement opportunities identified.</p>}
        </section>
      </div>
      <p className="text-right text-[11px] text-muted-foreground" data-testid="review-summary-generated-at">
        Generated {formatReviewDate(summary.generated_at)}
      </p>
    </div>
  );
}

export default function ReviewsPage({ hub }: Hub) {
  const { technicians } = hub;
  const summarizeReviews = useSummarizeWorkshopReviews();

  const summary = summarizeReviews.data;
  const sampleGroups = getDemoReviewGroups(technicians);
  const overallLowRatedReviews = getOverallLowRatedReviews(technicians);
  const noLowRatedReviews = overallLowRatedReviews.length === 0;
  const generateSummary = () => summarizeReviews.mutate({
    data: { source: 'sample', sample_reviews: overallLowRatedReviews },
  });

  return (
    <div className="space-y-5" data-testid="reviews-page">
      <PageHead
        kicker="Workshop · Voice of the customer"
        title="Customer reviews"
        sub="Review customer feedback and use AI to identify practical workshop improvements."
      >
        <StatusBadge tone="idle">Staff workspace</StatusBadge>
      </PageHead>

      <p role="note" className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground" data-testid="reviews-visibility-notice">
        <CircleAlert size={14} className="mt-0.5 shrink-0 text-primary" />
        The briefing uses all 1- and 2-star reviews across Easy, Normal and Hard, regardless of the filters below. No saving is required.
      </p>

      <div className="space-y-4">
        <Card
          title={<><Sparkles size={15} /> Improvement briefing</>}
          aside={<span>AI runs only when requested</span>}
        >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-xs leading-5 text-muted-foreground">
                AI summarizes the overall 1- and 2-star reviews across all technicians and job levels, focusing on complaints and improvements.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={generateSummary}
                disabled={summarizeReviews.isPending || noLowRatedReviews || hub.hubQ.isLoading}
                className="shrink-0"
                data-testid="button-generate-review-summary"
              >
                {summarizeReviews.isPending
                  ? <><RefreshCw size={14} className="animate-spin" /> Reading feedback…</>
                  : <><Lightbulb size={14} /> Generate AI summary</>}
              </Button>
            </div>
            {summarizeReviews.isPending ? (
              <div className="space-y-3 rounded-lg border border-dashed p-4" role="status" aria-label="Generating improvement summary" data-testid="review-summary-loading">
                <div className="h-3 w-28 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-secondary" />
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <div className="h-24 animate-pulse rounded-lg bg-secondary/70" />
                  <div className="h-24 animate-pulse rounded-lg bg-secondary/70" />
                </div>
              </div>
            ) : summarizeReviews.isError ? (
              <InlineError
                testId="review-summary-error"
                onRetry={generateSummary}
                retrying={summarizeReviews.isPending}
                retryLabel="Try again"
              >
                {errorText(summarizeReviews.error, 'AI summary is unavailable right now. Try again shortly.')}
              </InlineError>
            ) : summary ? (
              <SummaryPanel summary={summary} />
            ) : (
              <div data-testid="review-summary-empty">
                <EmptyState
                  icon={<Sparkles size={17} />}
                  title={noLowRatedReviews ? 'No low-rated reviews' : 'Low-rating improvement briefing'}
                >
                  {noLowRatedReviews
                    ? 'No 1- or 2-star reviews are available to summarize.'
                    : 'Generate a summary of low-rated feedback only. The briefing excludes 3-, 4- and 5-star reviews.'}
                </EmptyState>
              </div>
            )}
        </Card>
      </div>

      <Card
        title="Sample reviews by job level"
        aside={<StatusBadge tone="pending">Illustrative only</StatusBadge>}
      >
        <p className="mb-4 rounded-lg border border-pending/20 bg-pending/[0.045] px-3 py-2 text-xs leading-5 text-muted-foreground" role="note" data-testid="review-samples-notice">
          These examples are fictional. The AI improvement briefing includes all 1- and 2-star reviews shown here; no review is saved when generating a summary.
        </p>
        <div className="grid gap-3 xl:grid-cols-3" data-testid="review-sample-levels">
          {sampleGroups.map((group) => <ReviewLevelPanel key={group.level} group={group} />)}
        </div>
      </Card>

    </div>
  );
}
