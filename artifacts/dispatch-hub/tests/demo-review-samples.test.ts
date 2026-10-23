import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_REVIEW_SAMPLES, getDemoReviewAverage, getDemoReviewGroups } from '../src/components/dispatch/demoReviewSamples';

test('sample customer reviews are clearly synthetic and grouped with a top-rated example per difficulty', () => {
  const groups = getDemoReviewGroups();
  assert.deepEqual(groups.map((group) => [group.level, group.count]), [
    ['Easy', 3],
    ['Normal', 3],
    ['Hard', 3],
  ]);
  assert.equal(DEMO_REVIEW_SAMPLES.length, 9);
  assert.equal(getDemoReviewAverage(), 38 / 9);
  for (const group of groups) {
    assert.equal(group.bestReview?.rating, 5);
    assert.equal(group.otherReviews.length, 2);
    assert.ok(group.reviews.every((review) => review.level === group.level));
  }
});
