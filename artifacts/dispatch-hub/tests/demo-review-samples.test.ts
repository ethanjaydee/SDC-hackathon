import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_REVIEW_SAMPLES, getDemoReviewAverage, getDemoReviewGroups } from '../src/components/dispatch/demoReviewSamples';
import type { Technician } from '@workspace/api-client-react';

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

import { DEMO_TECHNICIAN_REVIEW_SAMPLES, getDemoReviewsForTechnician } from '../src/components/dispatch/demoReviewSamples';
test('every demo technician has samples including a negative one', () => {
  for (let id = 1; id <= 12; id += 1) {
    const reviews = getDemoReviewsForTechnician(id);
    assert.ok(reviews.length >= 2);
    assert.ok(reviews.some((review) => review.rating <= 2));
  }
  assert.ok(DEMO_TECHNICIAN_REVIEW_SAMPLES.every((review) => review.technicianId != null));
});

test('expanded job-level reviews identify the exact synthetic technician', () => {
  const technicians: Technician[] = [
    { id: 1, name: 'Amir Hakim', status: 'Available', zone: 'Petaling Jaya', van_id: 1, level: 1 },
    { id: 2, name: 'Mei Tan', status: 'Available', zone: 'Puchong', van_id: 2, level: 2 },
    { id: 3, name: 'Ravi Kumar', status: 'Available', zone: 'Cheras', van_id: 3, level: 3 },
  ];
  const groups = getDemoReviewGroups(technicians);
  const reviews = groups.flatMap((group) => group.reviews);
  assert.equal(reviews.length, 15);
  assert.ok(reviews.every((review) => technicians.some((tech) => tech.name === review.technicianName)));
  assert.deepEqual(groups.map((group) => group.level), ['Easy', 'Normal', 'Hard']);
  assert.ok(groups.every((group) => group.reviews.length >= 3));
});
