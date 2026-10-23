import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Technician } from '@workspace/api-client-react';
import { badgeSurfaceForRank, rankBadges } from '../src/components/dispatch/serviceHistoryUtils';
import { getDemoServiceHistory } from '../src/components/dispatch/demoServiceHistory';

test('service history ranks highest demo job-rating score first with deterministic ties', () => {
  const makeTech = (id: number, jobs: number, rating: number): Technician => ({
    id, name: `Tech ${id}`, status: 'Available', zone: 'Petaling Jaya', van_id: id,
    demo_completed_jobs: jobs, rating,
  });
  const ranked = rankBadges([makeTech(4, 5, 4), makeTech(3, 2, 5), makeTech(2, 5, 4), makeTech(1, 1, 3)]);
  assert.deepEqual(ranked.map((tech) => tech.id), [2, 4, 3, 1]);
});

test('service history uses gold, silver and bronze row backgrounds only for the top three', () => {
  assert.match(badgeSurfaceForRank(0), /bg-amber/);
  assert.match(badgeSurfaceForRank(1), /bg-slate/);
  assert.match(badgeSurfaceForRank(2), /bg-orange/);
  assert.equal(badgeSurfaceForRank(3), 'border-card-border bg-card');
});

test('each synthetic technician has three completed demo jobs with matching review and sample proof', () => {
  for (let id = 1; id <= 12; id += 1) {
    const technician: Technician = {
      id, name: `Tech ${id}`, status: 'Available', zone: 'Klang Valley', van_id: id,
      level: id <= 4 ? 1 : id <= 8 ? 2 : 3,
    };
    const jobs = getDemoServiceHistory(technician);
    assert.equal(jobs.length, 3);
    assert.equal(new Set(jobs.map((job) => job.job_number)).size, 3);
    assert.ok(jobs.every((job) => job.job_number.startsWith(`SAMPLE-${String(id).padStart(3, '0')}-`)));
    assert.ok(jobs.every((job) => job.amount_myr > 0 && job.review.length > 0 && job.rating >= 1 && job.rating <= 5));
    assert.ok(jobs.every((job) => ['filter-service.jpg', 'window-ac-service.jpg'].includes(job.proof_image)));
  }
});
