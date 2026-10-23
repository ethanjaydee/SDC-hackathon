import { Camera, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, Mono, StatusBadge, dateTime } from './shared';

const samples = [
  {
    id: 'SAMPLE-001',
    technician: 'Alex Lee (sample)',
    job: 'AC filter service',
    site: 'Sample site A',
    completedAt: '2026-10-21T14:35:00+08:00',
    notes: 'Filter cleaned and refitted. Airflow and cooling checked.',
    photo: 'filter-service.jpg',
  },
  {
    id: 'SAMPLE-002',
    technician: 'Sam Tan (sample)',
    job: 'Window AC cleaning',
    site: 'Sample site B',
    completedAt: '2026-10-21T16:10:00+08:00',
    notes: 'Coils cleaned and housing refitted. Unit tested after service.',
    photo: 'window-ac-service.jpg',
  },
] as const;

export function CompletionProofSamples() {
  const assetBase = `${import.meta.env.BASE_URL}completion-proofs/`;
  return (
    <Card title={<><Camera size={15} /> Completion proof examples</>} aside={<StatusBadge tone="pending">Mock data</StatusBadge>}>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Two sample completed jobs with illustrative photos. These are not actual dispatch records and do not change the audit log or technician availability.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {samples.map((sample) => (
          <article key={sample.id} className="min-w-0 rounded-xl border border-card-border p-3" data-testid={`completion-proof-${sample.id}`}>
            <div className="flex items-start gap-3">
              <div className="relative w-20 shrink-0 overflow-hidden rounded-lg sm:w-28">
                <img src={`${assetBase}${sample.photo}`} alt={`Illustrative service photo for ${sample.job}`} className="aspect-square w-full object-cover" loading="lazy" width={112} height={112} />
                <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-white">SAMPLE</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Mono className="text-[10px] text-muted-foreground">{sample.id}</Mono>
                  <StatusBadge tone="ok"><CheckCircle2 size={10} /> Completed · sample</StatusBadge>
                </div>
                <h2 className="text-sm font-semibold">{sample.job}</h2>
                <p className="text-xs text-muted-foreground">{sample.technician} · {sample.site}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Camera size={11} /> 1 photo</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="mt-1 h-auto whitespace-normal text-left" data-testid={`view-proof-${sample.id}`}>View proof</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{sample.job} — sample completion proof</DialogTitle>
                      <DialogDescription>Illustrative photo only. Not evidence for a real dispatch.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>{sample.technician} · {sample.site}</span>
                      <time className="text-muted-foreground" dateTime={sample.completedAt}>{dateTime(sample.completedAt)}</time>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border">
                      <img src={`${assetBase}${sample.photo}`} alt={`Illustrative stock photo: ${sample.job}`} className="max-h-72 w-full object-cover" width={1500} height={1000} />
                      <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white">Sample service photo · not actual job evidence</span>
                    </div>
                    <p className="text-sm">{sample.notes}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Illustrative stock photo: <a href="https://www.thespruce.com/" target="_blank" rel="noopener noreferrer" className="underline">The Spruce</a>. All job details are fictional.
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
