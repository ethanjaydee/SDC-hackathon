export type ReviewLevel = 'Easy' | 'Normal' | 'Hard';

export type DemoReviewSample = {
  id: string;
  level: ReviewLevel;
  job: string;
  rating: number;
  comment: string;
};

export const DEMO_REVIEW_LEVELS: readonly { level: ReviewLevel; note: string }[] = [
  { level: 'Easy', note: 'Quick swaps such as bulbs and remote batteries.' },
  { level: 'Normal', note: 'Routine servicing such as filter and drain work.' },
  { level: 'Hard', note: 'Expert diagnosis and electrical accessories.' },
];

export const DEMO_REVIEW_SAMPLES: readonly DemoReviewSample[] = [
  { id: 'easy-01', level: 'Easy', job: 'Light bulb change', rating: 5, comment: 'The light was changed quickly and the room was left tidy.' },
  { id: 'easy-02', level: 'Easy', job: 'Remote battery swap', rating: 4, comment: 'Fast replacement, and the technician called before arriving.' },
  { id: 'easy-03', level: 'Easy', job: 'LED bulb replacement', rating: 4, comment: 'Good value and the new bulb worked straight away.' },
  { id: 'easy-04', level: 'Easy', job: 'Light bulb change', rating: 2, comment: 'The replacement worked, but we waited past the time window and did not get an update.' },
  { id: 'normal-01', level: 'Normal', job: 'AC filter service', rating: 5, comment: 'The filter clean improved cooling the same day.' },
  { id: 'normal-02', level: 'Normal', job: 'Drain hose clearing', rating: 4, comment: 'The drain cleared quickly and the cause was explained clearly.' },
  { id: 'normal-03', level: 'Normal', job: 'Routine AC service', rating: 4, comment: 'Polite service with clear updates throughout.' },
  { id: 'normal-04', level: 'Normal', job: 'Drain hose clearing', rating: 2, comment: 'The drain was cleared, but water was left on the floor and the cause was not explained.' },
  { id: 'hard-01', level: 'Hard', job: 'Capacitor replacement', rating: 5, comment: 'The expert explained the capacitor issue before replacing it.' },
  { id: 'hard-02', level: 'Hard', job: 'AC control board repair', rating: 4, comment: 'Cooling is back, and the work area was clean before the expert left.' },
  { id: 'hard-03', level: 'Hard', job: 'Electrical fault diagnosis', rating: 3, comment: 'The diagnosis was clear, though sourcing the part took longer.' },
  { id: 'hard-04', level: 'Hard', job: 'Capacitor replacement', rating: 1, comment: 'The air-conditioner stopped cooling again the next morning, so we had to arrange another visit.' },
];

export function getDemoReviewGroups() {
  return DEMO_REVIEW_LEVELS.map(({ level, note }) => {
    const reviews = DEMO_REVIEW_SAMPLES.filter((review) => review.level === level);
    const bestReview = reviews.reduce<DemoReviewSample | null>(
      (best, review) => !best || review.rating > best.rating ? review : best,
      null,
    );
    return {
      level,
      note,
      reviews,
      count: reviews.length,
      averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
      bestReview,
      otherReviews: bestReview ? reviews.filter((review) => review.id !== bestReview.id) : [],
    };
  });
}

export function getDemoReviewAverage() {
  return DEMO_REVIEW_SAMPLES.reduce((sum, review) => sum + review.rating, 0) / DEMO_REVIEW_SAMPLES.length;
}
