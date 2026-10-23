import { useMemo } from 'react';
import { Award, FileText, PenLine, Star } from 'lucide-react';
import { useGenerateSampleEInvoice } from '@workspace/api-client-react';
import type { Activity, SampleEInvoice, Technician } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, EmptyState, InlineError, Mono, StatusBadge, errorText, initials } from './shared';
import { LevelBadge, ratingText } from './techMeta';
import { badgeSurfaceForRank, rankBadges } from './serviceHistoryUtils';
import { getDemoServiceHistory, type SampleCompletedJob } from './demoServiceHistory';

const dateLabel = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
};
const myr = (amount: number) => `MYR ${amount.toFixed(2)}`;
const SAMPLE_SIGNATURE = 'M15 64 Q31 12 42 25 Q49 38 24 62 Q58 29 60 47 Q58 63 76 39 Q64 67 91 45 Q103 34 101 49 Q96 63 117 44 Q107 66 132 50 Q150 36 153 45 Q157 53 177 44 M26 76 Q88 67 189 69';

function SampleInvoiceAction({ technician, job }: { technician: Technician; job: SampleCompletedJob }) {
  const invoiceMutation = useGenerateSampleEInvoice();
  const invoice = invoiceMutation.data as SampleEInvoice | undefined;
  const isForThisJob = invoice?.job_number === job.job_number;

  const generate = () => invoiceMutation.mutate({
    data: {
      job_number: job.job_number,
      technician_name: technician.name,
      completed_at: job.completed_at,
      job_scope: job.job_scope,
      amount_myr: job.amount_myr,
    },
  });

  return (
    <div className="min-w-[190px] space-y-2" data-testid={`sample-invoice-action-${job.job_number}`}>
      <Button type="button" size="sm" variant="outline" onClick={generate} disabled={invoiceMutation.isPending}
        data-testid={`button-generate-invoice-${job.job_number}`}>
        <FileText size={14} />
        {invoiceMutation.isPending ? 'Generating…' : 'Generate e-invoice'}
      </Button>
      {invoiceMutation.isError && (
        <InlineError testId={`error-sample-invoice-${job.job_number}`} onRetry={generate} retrying={invoiceMutation.isPending}>
          {errorText(invoiceMutation.error, 'Sample e-invoice generation failed. No invoice was created.')}
        </InlineError>
      )}
      {invoiceMutation.isSuccess && isForThisJob && invoice && (
        <section className="space-y-2 rounded-lg border border-pending/30 bg-pending/[0.06] p-3 text-xs"
          aria-label={`AI-generated sample invoice for ${job.job_number}`} data-testid={`sample-invoice-result-${job.job_number}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="font-mono">{invoice.invoice_number}</strong>
            <StatusBadge tone="pending">AI-generated sample</StatusBadge>
          </div>
          <p className="font-medium">{invoice.line_description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Job</dt><dd className="font-mono">{invoice.job_number}</dd>
            <dt className="text-muted-foreground">Technician</dt><dd>{invoice.technician_name}</dd>
            <dt className="text-muted-foreground">Completed</dt><dd>{dateLabel(invoice.completed_at)}</dd>
            <dt className="text-muted-foreground">Amount</dt><dd className="font-mono font-semibold">{invoice.currency} {invoice.amount_myr.toFixed(2)}</dd>
          </dl>
          <p className="border-t border-pending/20 pt-2 text-muted-foreground">{invoice.sample_note}</p>
          <p className="font-semibold text-err">Not payable. Not a compliant tax invoice.</p>
        </section>
      )}
    </div>
  );
}

function SampleHistoryTable({ technician }: { technician: Technician }) {
  const jobs = getDemoServiceHistory(technician);
  const assetBase = `${import.meta.env.BASE_URL}completion-proofs/`;

  return (
    <section aria-labelledby={`sample-history-heading-${technician.id}`} className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id={`sample-history-heading-${technician.id}`} className="text-sm font-semibold">Fictional completed-job history</h3>
          <p className="text-xs text-muted-foreground">Illustrative samples only; these are not completed dispatches or audit records.</p>
        </div>
        <StatusBadge tone="pending">{jobs.length} sample jobs</StatusBadge>
      </div>
      <div className="overflow-x-auto rounded-xl border" data-testid={`sample-history-table-${technician.id}`}>
        <table className="w-full min-w-[1020px] border-collapse text-left text-xs">
          <thead className="bg-muted/70 text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">Job / completed</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Scope & sample proof</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Sales</th>
              <th scope="col" className="px-3 py-2.5 font-medium">E-invoice</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Rating</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Customer review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {jobs.map((job) => (
              <SampleJobRow key={job.job_number} technician={technician} job={job} assetBase={assetBase} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">All photos and reviews are illustrative sample content. AI wording is generated on request and must not be used as a payable or tax invoice.</p>
    </section>
  );
}

function SampleJobRow({ technician, job, assetBase }: { technician: Technician; job: SampleCompletedJob; assetBase: string }) {
  return (
    <tr className="align-top" data-testid={`sample-job-row-${job.job_number}`}>
      <th scope="row" className="whitespace-nowrap px-3 py-3 font-normal">
        <Mono className="font-semibold text-foreground">{job.job_number}</Mono>
        <span className="mt-1 block text-muted-foreground">{dateLabel(job.completed_at)}</span>
      </th>
      <td className="max-w-[250px] px-3 py-3">
        <p className="font-medium text-foreground">{job.job_scope}</p>
        <div className="mt-2 flex items-center gap-2">
          <img src={`${assetBase}${job.proof_image}`} alt={`Illustrative sample service photo for ${job.job_number}`}
            className="h-10 w-14 rounded-md border object-cover" data-testid={`img-sample-proof-${job.job_number}`} />
          <span className="max-w-[140px] text-[10px] leading-4 text-muted-foreground">Sample photo · not job evidence</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular">{myr(job.amount_myr)}</td>
      <td className="px-3 py-3"><SampleInvoiceAction technician={technician} job={job} /></td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className="inline-flex items-center gap-1 font-mono font-semibold"><Star size={13} className="fill-pending text-pending" aria-hidden="true" />{job.rating.toFixed(1)}</span>
        <span className="sr-only"> out of 5 stars</span>
      </td>
      <td className="max-w-[245px] px-3 py-3 leading-relaxed text-muted-foreground">{job.review}</td>
    </tr>
  );
}

function SampleProof({ tech, activity }: { tech: Technician; activity: Activity[] }) {
  const jobs = activity.filter((entry) => entry.dispatch?.tech_id === tech.id);
  return (
    <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>{tech.name} — work history</DialogTitle>
        <DialogDescription>Actual saved assignments and fictional sample history are shown separately. Sample content is not audit evidence.</DialogDescription>
      </DialogHeader>
      <section aria-label="Actual technician job history" className="rounded-xl border p-3 sm:p-4" data-testid={`actual-assignments-${tech.id}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Actual saved assignments</h3>
          <StatusBadge tone="idle">{jobs.length} saved</StatusBadge>
        </div>
        {jobs.length ? (
          <ul className="space-y-2">
            {jobs.map((entry) => <li key={entry.id} data-testid={`actual-assignment-${entry.id}`} className="flex flex-col gap-1 border-t pt-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="min-w-0 leading-relaxed">
                <Mono>#{entry.id}</Mono> · {entry.dispatch!.status} · {entry.dispatch!.customer_site?.label ?? 'Historical site unknown'}
                {entry.dispatch!.completed_at && <span className="text-muted-foreground"> · {dateLabel(entry.dispatch!.completed_at)}</span>}
              </span>
              {entry.dispatch!.conversation_id != null && <Link href={`/analysis/${entry.dispatch!.conversation_id}`} className="w-fit shrink-0 font-medium text-primary" data-testid={`link-assignment-request-${entry.id}`}>Open request</Link>}
            </li>)}
          </ul>
        ) : <p className="text-xs text-muted-foreground">No saved assignment is linked to this technician. Fictional sample jobs below are not audit counts.</p>}
      </section>
      <SampleHistoryTable technician={tech} />
      <section aria-label="Illustrative sample customer signature" className="rounded-xl border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium"><PenLine size={13} /> Illustrative sample sign-off</p>
        <div className="inline-flex max-w-full items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <svg viewBox="0 0 220 90" className="h-12 w-40 max-w-full" role="img" aria-label="Synthetic illustrative signature, not linked to a real assignment">
            <path d={SAMPLE_SIGNATURE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] leading-relaxed text-muted-foreground">Illustrative synthetic mark only · no saved assignment sign-off</span>
        </div>
      </section>
    </DialogContent>
  );
}

export function BadgeButton({ t, rank, activity, podium }: { t: Technician; rank: number; activity: Activity[]; podium: boolean }) {
  const surface = podium ? badgeSurfaceForRank(rank) : 'border-card-border bg-card';
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" data-testid={`work-badge-${t.id}`} aria-label={`Open work history for ${t.name}`}
          className={`group flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${surface}`}>
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">{initials(t.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{t.name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5"><LevelBadge tech={t} /></span>
            <span className="mt-1 block text-xs text-muted-foreground"><Mono>{t.demo_completed_jobs ?? 0}</Mono> sample jobs · rating <Mono>{ratingText(t)}</Mono> · score <Mono>{((t.demo_completed_jobs ?? 0) * (t.rating ?? 0)).toFixed(0)}</Mono></span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-xs font-medium text-primary">View history</span>
        </button>
      </DialogTrigger>
      <SampleProof tech={t} activity={activity} />
    </Dialog>
  );
}

export function WorkBadges({ technicians, activity = [] }: { technicians: Technician[]; activity?: Activity[] }) {
  const ranked = useMemo(() => rankBadges(technicians), [technicians]);
  return (
    <Card title={<><Award size={15} /> Technician work badges</>} aside={<StatusBadge tone="pending">Demo ratings</StatusBadge>}>
      <p className="mb-3 text-xs text-muted-foreground">Ranked by demo score (sample jobs × rating). Open a technician to review actual saved assignments alongside their separate fictional completed-job history.</p>
      {ranked.length === 0 ? <EmptyState icon={<Award size={16} />} title="No technicians yet">Badges appear when the roster loads.</EmptyState> : (
        <ol className="space-y-2" aria-label="Technicians ranked by demo work score" data-testid="service-history-ranking">
          {ranked.map((t, i) => <li key={t.id} className="min-w-0"><BadgeButton t={t} rank={i} activity={activity} podium={i < 3} /></li>)}
        </ol>
      )}
    </Card>
  );
}
