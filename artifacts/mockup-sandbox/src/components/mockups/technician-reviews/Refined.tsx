import './_group.css';
import { MessageSquareText, Star } from 'lucide-react';
import { Card as Surface, CardContent, CardHeader } from '@/components/ui/card';
import type { ReactNode } from 'react';

const reviews = [
  { job: 'Light bulb change', rating: 5, comment: 'The light was changed quickly and the room was left tidy.' },
  { job: 'Remote battery swap', rating: 2, comment: 'Arrived late and the remote still needed a second try.' },
  { job: 'LED bulb replacement', rating: 5, comment: 'The new bulb works perfectly and the visit was quick.' },
  { job: 'Remote battery swap', rating: 4, comment: 'The remote was tested before the technician left.' },
  { job: 'Lamp replacement', rating: 3, comment: 'The replacement works. A little more notice before arrival would help.' },
];
const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

function Panel({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <Surface role="region" className="min-w-0 overflow-hidden border-card-border bg-card shadow-[0_10px_30px_-24px_hsl(var(--foreground)/.35)]">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border/80 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Surface>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-current text-pending' : 'text-muted-foreground/30'} aria-hidden="true" />)}
    </span>
  );
}

export function Refined() {
  return (
    <main className="dispatch-conversation min-h-[100dvh] space-y-5 p-4 sm:space-y-6 sm:p-6">
      <header className="relative overflow-hidden rounded-2xl border border-card-border bg-card/70 px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Voice of the customer</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-none tracking-tight sm:text-[36px]">Customer reviews</h1>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">Review feedback for Amir Hakim only.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-busy/25 bg-busy/[0.07] px-3 py-1.5 text-xs font-medium text-busy"><span className="h-1.5 w-1.5 rounded-full bg-current" />Viewing as Amir Hakim</span>
        </div>
      </header>

      <p role="note" className="flex gap-3 rounded-xl border border-pending/20 bg-pending/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-pending/20 bg-pending/[0.08] text-pending"><MessageSquareText size={12} aria-hidden="true" /></span>
        <span><strong className="font-semibold text-foreground/80">Sample data.</strong> Illustrative sample comments for your technician profile only. They are fictional, not saved customer reviews.</span>
      </p>

      <Panel title={<><MessageSquareText size={15} className="text-primary" />Amir Hakim</>} aside={<span className="font-mono text-[11px]"><span className="text-foreground">{average.toFixed(1)}/5</span><span className="mx-1.5 text-muted-foreground/50">·</span>{reviews.length} reviews</span>}>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-pending/15 bg-pending/[0.035] px-3 py-2.5">
          <span className="font-mono text-2xl font-semibold leading-none tabular">{average.toFixed(1)}</span>
          <div className="space-y-0.5">
            <Stars n={Math.round(average)} />
            <p className="text-[10px] text-muted-foreground">Average sample rating · {reviews.length} comments</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {reviews.map((review, index) => (
            <li key={`${review.job}-${index}`} className="rounded-xl border border-card-border bg-background/55 px-3.5 py-3 transition-colors">
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
      </Panel>
    </main>
  );
}
