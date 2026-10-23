import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CircleAlert, Lightbulb, MessageSquareText, RefreshCw, Sparkles, Star } from 'lucide-react';
import {
  getListWorkshopReviewsQueryKey,
  useCreateWorkshopReview,
  useListWorkshopReviews,
  useSummarizeWorkshopReviews,
} from '@workspace/api-client-react';
import type { CustomerReview, WorkshopReviewSummary } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, EmptyState, errorText, InlineError, PageHead, SkeletonRows, StatusBadge } from './shared';
import { getDemoReviewGroups } from './demoReviewSamples';

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

function ReviewRow({ review }: { review: CustomerReview }) {
  return (
    <article className="grid gap-3 border-b border-card-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" data-testid={`review-row-${review.id}`}>
      <div className="min-w-0">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90" data-testid={`review-comment-${review.id}`}>{review.comment}</p>
        <time className="mt-2 block text-xs text-muted-foreground" dateTime={review.created_at} data-testid={`review-date-${review.id}`}>
          {formatReviewDate(review.created_at)}
        </time>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Stars rating={review.rating} />
        <span className="font-mono text-xs tabular text-muted-foreground">{review.rating}.0</span>
      </div>
    </article>
  );
}

function SummaryPanel({ summary }: { summary: WorkshopReviewSummary }) {
  return (
    <div className="space-y-4" data-testid="review-ai-summary">
      <div className="rounded-lg border border-primary/20 bg-primary/[0.055] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Overview</p>
          <StatusBadge tone="ok">{summary.review_count} reviews considered</StatusBadge>
        </div>
        <p className="mt-2 text-sm leading-6">{summary.overview}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-lg border border-card-border bg-card p-4" aria-labelledby="review-strengths-title">
          <h3 id="review-strengths-title" className="flex items-center gap-2 text-sm font-semibold">
            <Check size={15} className="text-ok" /> Keep doing
          </h3>
          {summary.strengths.length ? (
            <ul className="mt-3 space-y-2">
              {summary.strengths.map((item, index) => (
                <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                  <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-ok" />{item}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No recurring strengths identified yet.</p>}
        </section>
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

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const reviewsQuery = useListWorkshopReviews({
    query: { queryKey: getListWorkshopReviewsQueryKey() },
  });
  const createReview = useCreateWorkshopReview({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWorkshopReviewsQueryKey() }),
    },
  });
  const summarizeReviews = useSummarizeWorkshopReviews();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState('');

  const handleRatingKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setRating((current) => Math.min(5, (current || 0) + 1));
      document.getElementById(`review-rating-${Math.min(5, (rating || 0) + 1)}`)?.focus();
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setRating((current) => Math.max(1, (current || 2) - 1));
      document.getElementById(`review-rating-${Math.max(1, (rating || 2) - 1)}`)?.focus();
    }
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedComment = comment.trim();
    if (!rating) {
      setFormError('Choose a star rating before saving.');
      return;
    }
    if (cleanedComment.length < 3) {
      setFormError('Add at least 3 characters of feedback.');
      return;
    }
    setFormError('');
    createReview.mutate(
      { data: { rating, comment: cleanedComment } },
      {
        onSuccess: () => {
          setRating(0);
          setComment('');
        },
      },
    );
  };

  const data = reviewsQuery.data;
  const summary = summarizeReviews.data;
  const visibleReviews = data?.reviews ?? [];
  const sampleGroups = getDemoReviewGroups();

  return (
    <div className="space-y-5" data-testid="reviews-page">
      <PageHead
        kicker="Workshop · Voice of the customer"
        title="Customer reviews"
        sub="Capture what customers say, then turn the patterns into practical workshop improvements."
      >
        <StatusBadge tone="idle">Staff workspace</StatusBadge>
      </PageHead>

      <p role="note" className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground" data-testid="reviews-visibility-notice">
        <CircleAlert size={14} className="mt-0.5 shrink-0 text-primary" />
        Reviews are entered by staff on behalf of customers and are visible to signed-in workspace accounts. No customer names are collected.
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]">
        <Card
          title={<><MessageSquareText size={15} /> Record feedback</>}
          aside={<span>Private staff entry</span>}
          className="h-fit"
        >
          <form className="space-y-4" onSubmit={submitReview} data-testid="review-entry-form">
            <fieldset>
              <legend className="text-sm font-medium">Customer rating <span className="text-err" aria-hidden="true">*</span></legend>
              <div
                className="mt-2 flex w-fit items-center gap-1 rounded-md focus-within:outline-none"
                role="radiogroup"
                aria-label="Rating from 1 to 5 stars"
                aria-required="true"
                onKeyDown={handleRatingKeys}
                data-testid="review-rating-group"
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  const selected = rating === value;
                  return (
                    <button
                      key={value}
                      id={`review-rating-${value}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                      tabIndex={selected || (!rating && value === 1) ? 0 : -1}
                      onClick={() => { setRating(value); setFormError(''); }}
                      className="grid h-10 w-10 place-items-center rounded-md text-pending transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid={`button-review-rating-${value}`}
                    >
                      <Star size={23} strokeWidth={1.8} className={value <= rating ? 'fill-pending text-pending' : 'text-muted-foreground/45'} aria-hidden="true" />
                    </button>
                  );
                })}
                <span className="ml-2 min-w-16 text-xs text-muted-foreground" aria-live="polite" data-testid="review-rating-value">
                  {rating ? `${rating} of 5` : 'Not rated'}
                </span>
              </div>
            </fieldset>

            <div>
              <label htmlFor="review-comment" className="text-sm font-medium">
                Feedback <span className="text-err" aria-hidden="true">*</span>
              </label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(event) => { setComment(event.target.value); setFormError(''); }}
                placeholder="What did the customer say about their service?"
                required
                minLength={3}
                maxLength={1000}
                rows={6}
                aria-describedby="review-comment-help review-comment-count"
                className="mt-2 resize-y bg-card text-sm leading-6"
                data-testid="input-review-comment"
              />
              <div className="mt-1 flex justify-between gap-3 text-[11px] text-muted-foreground">
                <span id="review-comment-help">Record their words; leave out names and identifying details.</span>
                <span id="review-comment-count" className="shrink-0 font-mono tabular" aria-live="polite">{comment.length}/1000</span>
              </div>
            </div>

            {formError && <p role="alert" className="text-xs text-err" data-testid="review-form-error">{formError}</p>}
            {createReview.isError && (
              <InlineError testId="review-submit-error">
                {errorText(createReview.error, 'Feedback could not be saved. Check your connection and try again.')}
              </InlineError>
            )}
            {createReview.isSuccess && !comment && (
              <p role="status" className="flex items-center gap-2 text-xs text-ok" data-testid="review-submit-success">
                <Check size={14} /> Feedback saved to the shared workspace.
              </p>
            )}
            <Button
              type="submit"
              disabled={createReview.isPending}
              className="w-full sm:w-auto"
              data-testid="button-submit-review"
            >
              {createReview.isPending ? <><RefreshCw size={14} className="animate-spin" /> Saving feedback…</> : 'Save feedback'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card
            title={<><Sparkles size={15} /> Improvement briefing</>}
            aside={<span>AI runs only when requested</span>}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-xs leading-5 text-muted-foreground">
                Generate a focused read of saved feedback. Recommendations are starting points for staff review, not automatic changes.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => summarizeReviews.mutate()}
                disabled={summarizeReviews.isPending || !data?.review_count}
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
                onRetry={() => summarizeReviews.mutate()}
                retrying={summarizeReviews.isPending}
                retryLabel="Try again"
              >
                {errorText(summarizeReviews.error, 'AI summary is unavailable right now. Your saved feedback is safe; try again shortly.')}
              </InlineError>
            ) : summary ? (
              <SummaryPanel summary={summary} />
            ) : (
              <div data-testid="review-summary-empty">
                <EmptyState
                  icon={<Sparkles size={17} />}
                  title={data?.review_count ? 'Ready when you are' : 'Save feedback to begin'}
                >
                  {data?.review_count
                    ? 'Generate a summary when you want recommendations based on saved customer feedback.'
                    : 'Once reviews are saved, you can ask AI to identify service strengths and improvement opportunities.'}
                </EmptyState>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card
        title="Sample reviews by job level"
        aside={<StatusBadge tone="pending">Illustrative only</StatusBadge>}
      >
        <p className="mb-4 rounded-lg border border-pending/20 bg-pending/[0.045] px-3 py-2 text-xs leading-5 text-muted-foreground" role="note" data-testid="review-samples-notice">
          These examples are fictional. They are not saved customer reviews and are excluded from AI summaries and saved-review totals.
        </p>
        <div className="grid gap-3 xl:grid-cols-3" data-testid="review-sample-levels">
          {sampleGroups.map((group) => (
            <section key={group.level} className="min-w-0 rounded-xl border border-card-border bg-muted/20 p-3.5" aria-labelledby={`sample-review-${group.level}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id={`sample-review-${group.level}`} className="font-display text-base font-semibold">{group.level}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold tabular">{group.averageRating?.toFixed(1)}<span className="text-muted-foreground">/5</span></p>
                  <p className="text-[10px] text-muted-foreground">{group.count} samples</p>
                </div>
              </div>
              {group.bestReview && (
                <article className="mt-3 rounded-lg border border-pending/25 bg-card p-3 shadow-sm" aria-label={`Top-rated ${group.level} sample review`} data-testid={`best-sample-review-${group.level}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-pending">Best sample</p>
                      <p className="mt-1 text-xs font-semibold">{group.bestReview.job}</p>
                    </div>
                    <Stars rating={group.bestReview.rating} label={`${group.bestReview.rating} out of 5 stars`} />
                  </div>
                  <blockquote className="mt-2 text-xs leading-5 text-muted-foreground">“{group.bestReview.comment}”</blockquote>
                </article>
              )}
              <div className="mt-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">More examples</p>
                <ul className="mt-1.5 space-y-2">
                  {group.otherReviews.map((review) => (
                    <li key={review.id} className="rounded-md border border-card-border bg-card px-2.5 py-2" data-testid={`sample-review-${review.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium">{review.job}</span>
                        <span className="shrink-0 font-mono text-[10px] tabular text-muted-foreground">{review.rating}/5</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{review.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </Card>

      <Card
        title="Saved reviews"
        aside={
          data ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="reviews-all-time-stats">
              <span><strong className="font-mono font-semibold tabular text-foreground" data-testid="reviews-total-count">{data.review_count}</strong> all-time</span>
              <span className="text-card-border" aria-hidden="true">|</span>
              <span><strong className="font-mono font-semibold tabular text-foreground" data-testid="reviews-average-rating">{data.average_rating == null ? '—' : data.average_rating.toFixed(1)}</strong> average</span>
            </div>
          ) : <span>All-time totals</span>
        }
      >
        {reviewsQuery.isLoading ? (
          <SkeletonRows rows={4} label="Loading saved reviews" />
        ) : reviewsQuery.isError ? (
          <InlineError
            testId="reviews-list-error"
            onRetry={() => reviewsQuery.refetch()}
            retrying={reviewsQuery.isFetching}
            retryLabel="Reload reviews"
          >
            {errorText(reviewsQuery.error, 'Saved reviews could not be loaded.')}
          </InlineError>
        ) : visibleReviews.length ? (
          <>
            <div className="divide-y-0" data-testid="reviews-list">
              {visibleReviews.slice(0, 100).map((review) => <ReviewRow key={review.id} review={review} />)}
            </div>
            <p className="border-t border-card-border pt-3 text-[11px] text-muted-foreground" data-testid="reviews-latest-window">
              Showing the latest {Math.min(visibleReviews.length, 100)} reviews. Average rating and total are all-time.
            </p>
          </>
        ) : (
          <EmptyState icon={<MessageSquareText size={17} />} title="No customer feedback yet">
            Staff can record a rating and comment here after service. Reviews are shared with signed-in workspace accounts.
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
