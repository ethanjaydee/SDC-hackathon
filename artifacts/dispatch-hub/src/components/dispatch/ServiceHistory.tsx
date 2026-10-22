import { useMemo } from 'react';
import { Award, Camera, PenLine } from 'lucide-react';
import type { Activity, Technician } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, EmptyState, Mono, StatusBadge, initials } from './shared';
import { LevelBadge, ratingText } from './techMeta';

const PHOTOS = ['filter-service.jpg', 'window-ac-service.jpg'];
const SIGS = [
  'M15 64 Q31 12 42 25 Q49 38 24 62 Q58 29 60 47 Q58 63 76 39 Q64 67 91 45 Q103 34 101 49 Q96 63 117 44 Q107 66 132 50 Q150 36 153 45 Q157 53 177 44 M26 76 Q88 67 189 69',
  'M19 39 Q55 8 63 30 Q60 45 30 51 Q67 46 61 64 Q51 80 28 67 M75 55 Q80 32 87 40 Q85 63 102 47 Q111 33 109 50 Q104 64 124 48 Q141 31 140 50 Q134 65 163 47 Q175 35 179 46 M25 78 Q98 68 195 71',
];
const LINES = [
  { item: 'Service call-out (Klang Valley)', qty: 1, price: 60 },
  { item: 'AC filter clean & refit', qty: 1, price: 85 },
  { item: 'Drain hose flush', qty: 1, price: 45 },
  { item: 'Replacement part (sample)', qty: 1, price: 38.5 },
];
const myr = (n: number) => `MYR ${n.toFixed(2)}`;

/** Strongest combined demo activity and rating first. */
export function rankBadges(techs: Technician[]) {
  return [...techs].sort((a, b) =>
    ((b.demo_completed_jobs ?? 0) * (b.rating ?? 0)) - ((a.demo_completed_jobs ?? 0) * (a.rating ?? 0)) || a.id - b.id);
}

function SampleProof({ tech, activity }: { tech: Technician; activity: Activity[] }) {
  const assetBase = `${import.meta.env.BASE_URL}completion-proofs/`;
  const total = LINES.reduce((s, l) => s + l.qty * l.price, 0);
  const jobs = activity.filter((entry) => entry.dispatch?.tech_id === tech.id);
  return (
    <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{tech.name} — sample work badge</DialogTitle>
        <DialogDescription>Illustrative demo only. Not proof of a real job, payment or audit record.</DialogDescription>
      </DialogHeader>
      <section aria-label="Actual technician job history" className="rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">Actual saved assignments · {jobs.length}</h3>
        {jobs.length ? <ul className="space-y-2">{jobs.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <span><Mono>#{entry.id}</Mono> · {entry.dispatch!.status} · {entry.dispatch!.customer_site?.label ?? 'Historical site unknown'}</span>
          {entry.dispatch!.conversation_id != null && <Link href={`/analysis/${entry.dispatch!.conversation_id}`} className="font-medium text-primary">Open request</Link>}
        </li>)}</ul> : <p className="text-xs text-muted-foreground">No saved assignment is linked to this technician. Demo ratings below are not audit counts.</p>}
      </section>
      <h3 className="text-sm font-semibold">Illustrative completed-job example · not linked to saved assignments</h3>
      <div className="relative overflow-hidden rounded-xl border">
        <img src={`${assetBase}${PHOTOS[tech.id % PHOTOS.length]}`} alt="Illustrative service photo" className="max-h-60 w-full object-cover" />
        <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white">SAMPLE photo · not actual job evidence</span>
      </div>
      <section aria-label="Sample customer signature" className="rounded-xl border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium"><PenLine size={13} /> Customer sign-off · synthetic signature</p>
        <div className="rounded-lg bg-white px-4 py-2 text-slate-900">
          <svg viewBox="0 0 220 90" className="h-16 w-48 max-w-full" role="img" aria-label="Synthetic signature">
            <path d={SIGS[tech.id % SIGS.length]} fill="none" stroke="#27354d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>
      <section aria-label="Sample invoice" className="relative overflow-hidden rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Invoice · SAMPLE-{String(tech.id).padStart(3, '0')}</p>
          <StatusBadge tone="err">SAMPLE · NOT PAYABLE</StatusBadge>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1 font-medium">Item</th><th className="font-medium">Qty</th><th className="text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {LINES.map((l) => <tr key={l.item} className="border-b border-card-border"><td className="py-1.5">{l.item}</td><td className="font-mono">{l.qty}</td><td className="text-right font-mono tabular">{myr(l.qty * l.price)}</td></tr>)}
            <tr><td colSpan={2} className="pt-2 font-semibold">Total (sample)</td><td className="pt-2 text-right font-mono font-semibold tabular">{myr(total)}</td></tr>
          </tbody>
        </table>
      </section>
    </DialogContent>
  );
}

export function WorkBadges({ technicians, activity = [] }: { technicians: Technician[]; activity?: Activity[] }) {
  const ranked = useMemo(() => rankBadges(technicians), [technicians]);
  return (
    <Card title={<><Award size={15} /> Technician work badges</>} aside={<StatusBadge tone="pending">Demo ratings</StatusBadge>}>
      <p className="mb-3 text-xs text-muted-foreground">Ranked by demo completed jobs and rating. Open a badge to see an illustrative photo, signature and sample invoice.</p>
      {ranked.length === 0 ? <EmptyState icon={<Award size={16} />} title="No technicians yet">Badges appear when the roster loads.</EmptyState> : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map((t, i) => (
            <Dialog key={t.id}>
              <DialogTrigger asChild>
                <button type="button" data-testid={`work-badge-${t.id}`}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-card-border bg-card p-3 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    {initials(t.name)}
                    {i < 3 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">{i + 1}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5"><LevelBadge tech={t} /></span>
                    <span className="mt-1 block text-xs text-muted-foreground"><Mono>{t.demo_completed_jobs ?? 0}</Mono> jobs · ★ <Mono>{ratingText(t)}</Mono></span>
                  </span>
                  <Camera size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </DialogTrigger>
               <SampleProof tech={t} activity={activity} />
            </Dialog>
          ))}
        </div>
      )}
    </Card>
  );
}
