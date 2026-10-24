import './_group.css';
import { Star } from 'lucide-react';
import { Card as Surface, CardContent, CardHeader } from '@/components/ui/card';

const reviews = [
  { job: 'Light bulb change', rating: 5, comment: 'The light was changed quickly and the room was left tidy.' },
  { job: 'Remote battery swap', rating: 2, comment: 'Arrived late and the remote still needed a second try.' },
  { job: 'LED bulb replacement', rating: 5, comment: 'The new bulb works perfectly and the visit was quick.' },
  { job: 'Remote battery swap', rating: 4, comment: 'The remote was tested before the technician left.' },
  { job: 'Lamp replacement', rating: 3, comment: 'The replacement works. A little more notice before arrival would help.' },
];
const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

function Card({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Surface role="region" className="min-w-0 border-card-border shadow-sm">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-4 md:p-5">{children}</CardContent>
    </Surface>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < n ? 'fill-pending text-pending' : 'text-muted-foreground/35'} aria-hidden="true" />)}</span>;
}

export function Current() {
  return (
    <main className="dispatch-conversation min-h-screen space-y-5 p-6">
      <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Voice of the customer</p>
          <h1 className="mt-1 text-[34px] font-semibold leading-tight">Customer reviews</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review feedback for Amir Hakim only.</p>
        </div>
        <span className="inline-flex rounded-full border border-busy/30 bg-busy/10 px-2.5 py-1 text-xs text-busy">Viewing as Amir Hakim</span>
      </header>
      <p role="note" className="rounded-lg border border-pending/20 bg-pending/[0.045] px-4 py-3 text-xs leading-5 text-muted-foreground">Illustrative sample comments for your technician profile only. They are fictional, not saved customer reviews.</p>
      <Card title="Amir Hakim" aside={<span className="font-mono">{average.toFixed(1)}/5 · {reviews.length}</span>}>
        <ul className="space-y-2">
          {reviews.map((review, index) => (
            <li key={index} className="rounded-lg border border-card-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{review.job}</span><Stars n={review.rating} /></div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{review.comment}</p>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
