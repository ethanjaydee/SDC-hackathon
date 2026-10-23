import { useMemo, useState } from 'react';
import { Award, Download, FileText, Search, Star, ZoomIn } from 'lucide-react';
import { useGenerateSampleEInvoice } from '@workspace/api-client-react';
import type { SampleEInvoice, Technician } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, EmptyState, InlineError, Mono, StatusBadge, errorText, fieldClass, initials } from './shared';
import { LevelBadge, ratingText } from './techMeta';
import { badgeSurfaceForRank, rankBadges } from './serviceHistoryUtils';
import { getDemoServiceHistory, type SampleCompletedJob } from './demoServiceHistory';
import { createSampleInvoicePdf } from './sampleInvoicePdf';
import invoiceLogoUrl from '../../assets/invoice-logo.png';

const dateLabel = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
};
const myr = (amount: number) => `MYR ${amount.toFixed(2)}`;
function SampleInvoiceAction({ technician, job }: { technician: Technician; job: SampleCompletedJob }) {
  const invoiceMutation = useGenerateSampleEInvoice();
  const invoice = invoiceMutation.data as SampleEInvoice | undefined;
  const isForThisJob = invoice?.job_number === job.job_number;
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const downloadPdf = async (sample: SampleEInvoice) => {
    setPdfError('');
    setPdfPending(true);
    try {
      const logoResponse = await fetch(invoiceLogoUrl);
      if (!logoResponse.ok) throw new Error('The sample invoice logo could not be loaded.');
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
      const pdfBytes = await createSampleInvoicePdf(sample, logoBytes);
      const pdfBuffer = new Uint8Array(pdfBytes).buffer;
      const url = URL.createObjectURL(new Blob([pdfBuffer], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${sample.invoice_number.replace(/[^\w.-]+/g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setPdfError('The sample invoice was generated, but the PDF could not be prepared. Try downloading it again.');
    } finally {
      setPdfPending(false);
    }
  };

  const generate = async () => {
    setPdfError('');
    try {
      const sample = await invoiceMutation.mutateAsync({
        data: {
          job_number: job.job_number,
          technician_name: technician.name,
          completed_at: job.completed_at,
          job_scope: job.job_scope,
          amount_myr: job.amount_myr,
        },
      });
      await downloadPdf(sample);
    } catch {
      // The mutation's error state is displayed below.
    }
  };

  return (
    <div className="min-w-[190px] space-y-2" data-testid={`sample-invoice-action-${job.job_number}`}>
      <Button type="button" size="sm" variant="outline" onClick={() => void generate()} disabled={invoiceMutation.isPending || pdfPending}
        data-testid={`button-generate-invoice-${job.job_number}`}>
        <FileText size={14} />
        {invoiceMutation.isPending ? 'Generating…' : pdfPending ? 'Preparing PDF…' : 'Generate & download PDF'}
      </Button>
      {invoiceMutation.isError && (
        <InlineError testId={`error-sample-invoice-${job.job_number}`} onRetry={() => void generate()} retrying={invoiceMutation.isPending || pdfPending}>
          {errorText(invoiceMutation.error, 'Sample e-invoice generation failed. No invoice was created.')}
        </InlineError>
      )}
      {pdfError && <p role="alert" className="text-xs text-err">{pdfError}</p>}
      {invoiceMutation.isSuccess && isForThisJob && invoice && (
        <section className="space-y-2 rounded-lg border border-pending/30 bg-pending/[0.06] p-3 text-xs"
          aria-label={`AI-generated sample invoice for ${job.job_number}`} data-testid={`sample-invoice-result-${job.job_number}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="font-mono">{invoice.invoice_number}</strong>
            <StatusBadge tone="pending">AI-generated sample</StatusBadge>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void downloadPdf(invoice)} disabled={pdfPending}>
            <Download size={13} /> {pdfPending ? 'Preparing PDF…' : 'Download sample PDF'}
          </Button>
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

function ZoomableSamplePhoto({ src, jobNumber }: { src: string; jobNumber: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group flex items-center gap-2 text-left" aria-label={`Zoom sample photo for ${jobNumber}`}>
          <img src={src} alt={`Illustrative sample photo for ${jobNumber}`}
            className="h-10 w-14 rounded-md border object-cover transition group-hover:ring-2 group-hover:ring-ring"
            data-testid={`img-sample-proof-${jobNumber}`} />
          <span className="max-w-[145px] text-[10px] leading-4 text-muted-foreground">Sample photo · click to zoom</span>
          <ZoomIn size={13} className="shrink-0 text-primary" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Sample photo · {jobNumber}</DialogTitle>
          <DialogDescription>Illustrative sample only; this photo is not proof of work on a real dispatch.</DialogDescription>
        </DialogHeader>
        <img src={src} alt={`Enlarged illustrative sample photo for ${jobNumber}`}
          className="mx-auto max-h-[74dvh] w-full rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
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
          <ZoomableSamplePhoto src={`${assetBase}${job.proof_image}`} jobNumber={job.job_number} />
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

function SampleProof({ tech }: { tech: Technician }) {
  return (
    <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>{tech.name} — work history</DialogTitle>
        <DialogDescription>Fictional sample history for this technician. Sample content is not a real dispatch record.</DialogDescription>
      </DialogHeader>
      <SampleHistoryTable technician={tech} />
    </DialogContent>
  );
}

export function BadgeButton({ t, rank, podium }: { t: Technician; rank: number; podium: boolean }) {
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
       <SampleProof tech={t} />
    </Dialog>
  );
}

export function WorkBadges({ technicians }: { technicians: Technician[] }) {
  const [search, setSearch] = useState('');
  const ranked = useMemo(() => rankBadges(technicians), [technicians]);
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = ranked.filter((tech) => {
    if (!terms.length) return true;
    const jobs = getDemoServiceHistory(tech);
    const searchable = [
      tech.id, tech.name, tech.level, tech.rating, tech.demo_completed_jobs,
      ...jobs.flatMap((job) => [job.job_number, job.completed_at, dateLabel(job.completed_at), job.level,
        job.job_scope, job.amount_myr, job.proof_image, job.rating, job.review]),
    ].join(' ').toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  return (
    <Card title={<><Award size={15} /> Technician work badges</>} aside={<StatusBadge tone="pending">Demo ratings</StatusBadge>}>
      <p className="mb-3 text-xs text-muted-foreground">Ranked by demo score (sample jobs × rating). Search across technicians, sample jobs, dates, scope, sales, ratings and reviews.</p>
      <label className="relative mb-3 block">
        <span className="sr-only">Search service history</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search any technician or job detail…" className={`${fieldClass} pl-9`}
          data-testid="service-history-search" />
      </label>
      {ranked.length === 0 ? <EmptyState icon={<Award size={16} />} title="No technicians yet">Badges appear when the roster loads.</EmptyState>
        : filtered.length === 0 ? <EmptyState icon={<Search size={16} />} title="No matching service history">Try another name, job number, scope, date, rating, or review keyword.</EmptyState> : (
        <ol className="space-y-2" aria-label="Technicians ranked by demo work score" data-testid="service-history-ranking">
          {filtered.map((t) => {
            const rank = ranked.findIndex((item) => item.id === t.id);
            return <li key={t.id} className="min-w-0"><BadgeButton t={t} rank={rank} podium={rank < 3} /></li>;
          })}
        </ol>
      )}
    </Card>
  );
}
