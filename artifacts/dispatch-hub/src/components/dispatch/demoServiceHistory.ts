import type { Technician } from '@workspace/api-client-react';
import { getDemoReviewsForTechnician, type ReviewLevel } from './demoReviewSamples';

export type SampleCompletedJob = {
  job_number: string;
  completed_at: string;
  level: ReviewLevel;
  job_scope: string;
  amount_myr: number;
  proof_image: string;
  rating: number;
  review: string;
};

const HISTORY_BY_LEVEL: Record<ReviewLevel, readonly { scope: string; amount: number }[]> = {
  Easy: [
    { scope: 'LED bulb replacement', amount: 95 },
    { scope: 'Remote battery replacement', amount: 82 },
    { scope: 'Lamp bulb replacement', amount: 110 },
  ],
  Normal: [
    { scope: 'Air-conditioner filter service', amount: 185 },
    { scope: 'Drain hose inspection and service', amount: 210 },
    { scope: 'Routine air-conditioner cleaning', amount: 195 },
  ],
  Hard: [
    { scope: 'Air-conditioner capacitor assessment', amount: 320 },
    { scope: 'Control board fault diagnosis', amount: 410 },
    { scope: 'Electrical fault inspection', amount: 365 },
  ],
};

const reviewLevelFor = (level: number | undefined): ReviewLevel =>
  level === 1 ? 'Easy' : level === 2 ? 'Normal' : 'Hard';

export function getDemoServiceHistory(technician: Technician): SampleCompletedJob[] {
  const level = reviewLevelFor(technician.level);
  const templates = HISTORY_BY_LEVEL[level];
  const reviews = getDemoReviewsForTechnician(technician.id, technician.level).filter((review) => review.level === level);
  return templates.map((job, index) => {
    const review = reviews[index % reviews.length];
    const daysAgo = 12 + technician.id * 7 + index * 29;
    return {
      job_number: `SAMPLE-${String(technician.id).padStart(3, '0')}-${String(index + 1).padStart(2, '0')}`,
      completed_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      level,
      job_scope: job.scope,
      amount_myr: job.amount,
      proof_image: index % 2 === 0 ? 'filter-service.jpg' : 'window-ac-service.jpg',
      rating: review.rating,
      review: review.comment,
    };
  });
}
