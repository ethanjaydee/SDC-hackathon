import { Camera, CheckCircle2, PenLine } from 'lucide-react';
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
    customer: 'Demo Customer A',
    signature: 'M15 64 Q31 12 42 25 Q49 38 24 62 Q58 29 60 47 Q58 63 76 39 Q64 67 91 45 Q103 34 101 49 Q96 63 117 44 Q107 66 132 50 Q150 36 153 45 Q157 53 177 44 M26 76 Q88 67 189 69',
  },
  {
    id: 'SAMPLE-002',
    technician: 'Sam Tan (sample)',
    job: 'Window AC cleaning',
    site: 'Sample site B',
    completedAt: '2026-10-21T16:10:00+08:00',
    notes: 'Coils cleaned and housing refitted. Unit tested after service.',
    photo: 'window-ac-service.jpg',
    customer: 'Demo Customer B',
    signature: 'M19 39 Q55 8 63 30 Q60 45 30 51 Q67 46 61 64 Q51 80 28 67 M75 55 Q80 32 87 40 Q85 63 102 47 Q111 33 109 50 Q104 64 124 48 Q141 31 140 50 Q134 65 163 47 Q175 35 179 46 M25 78 Q98 68 195 71',
  },
] as const;

export function CompletionProofSamples() {
  const assetBase = `${import.meta.env.BASE_URL}completion-proofs/`;
  return (
    <Card title={<><Camera size={15} /> Completion proof examples</>} aside={<StatusBadge tone="pending">Mock data</StatusBadge>}>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Two sample completed jobs with illustrative photos and customer signatures. These are not actual dispatch records and do not change the audit log or technician availability.
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
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Camera size={11} /> 1 photo <span aria-hidden="true">·</span> <PenLine size={11} /> Customer signature</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="mt-1 h-auto whitespace-normal text-left" data-testid={`view-proof-${sample.id}`}>View proof & signature</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{sample.job} — sample completion proof</DialogTitle>
                      <DialogDescription>Illustrative photo and synthetic signature only. Not evidence for a real dispatch.</DialogDescription>
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
                    <section aria-label="Sample customer signature" className="rounded-xl border p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium"><PenLine size={13} /> Customer sign-off · mock signature</p>
                      <div className="rounded-lg bg-white px-4 py-2 text-slate-900">
                        <svg viewBox="0 0 220 90" className="h-20 w-52 max-w-full" role="img" aria-label={`Synthetic signature for ${sample.customer}`}>
                          <path d={sample.signature} fill="none" stroke="#27354d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="border-t border-slate-200 pt-2 text-xs">{sample.customer} · sample acknowledgment</p>
                      </div>
                    </section>
                    <p className="text-[11px] text-muted-foreground">
                      Illustrative stock photo: <a href="https://www.thespruce.com/" target="_blank" rel="noopener noreferrer" className="underline">The Spruce</a>. All job details and signature strokes are fictional.
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
