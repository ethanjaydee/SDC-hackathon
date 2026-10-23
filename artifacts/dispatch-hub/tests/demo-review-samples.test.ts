import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_REVIEW_SAMPLES, getDemoReviewAverage, getDemoReviewGroups } from '../src/components/dispatch/demoReviewSamples';

test('sample customer reviews are clearly synthetic and grouped with a top-rated example per difficulty', () => {
  const groups = getDemoReviewGroups();
  assert.deepEqual(groups.map((group) => [group.level, group.count]), [
    ['Easy', 4],
    ['Normal', 4],
    ['Hard', 4],
  ]);
  assert.equal(DEMO_REVIEW_SAMPLES.length, 12);
  assert.equal(getDemoReviewAverage(), 43 / 12);
  for (const group of groups) {
    assert.equal(group.bestReview?.rating, 5);
    assert.equal(group.otherReviews.length, 3);
    assert.ok(group.otherReviews.some((review) => review.rating <= 2));
    assert.ok(group.reviews.every((review) => review.level === group.level));
  }
});
