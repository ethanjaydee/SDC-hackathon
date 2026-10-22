import './_group.css';
import { useId, type ReactNode } from 'react';
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, Clock3, FlaskConical,
  MapPin, MessageSquareText, Package, Send, ShieldCheck, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function Panel({ title, aside, children, className = '' }: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  return (
    <Card role="region" aria-labelledby={titleId} className={`min-w-0 overflow-hidden border-card-border bg-card shadow-sm ${className}`}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-card-border px-5 py-4 lg:px-6">
        <h2 id={titleId} className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-5 lg:p-6">{children}</CardContent>
    </Card>
  );
}

const messages = [
  { id: 1, role: 'Customer', time: '14:01', text: 'The air conditioner is running but the room is still warm. It started making a clicking sound this morning.' },
  { id: 2, role: 'Dispatch team', time: '14:03', text: 'Thanks for letting us know. Is the indoor unit powered on, and is there a preferred time for the visit?' },
  { id: 3, role: 'Customer', time: '14:05', text: 'It is powered on. Please come as early as possible today.' },
  { id: 4, role: 'Dispatch team', time: '14:06', text: 'Got it. We will review this and confirm a technician.' },
];

function Badge({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'pending' }) {
  const tones = tone === 'ok'
    ? 'border-ok/25 bg-ok/[0.08] text-ok'
    : 'border-pending/30 bg-pending/[0.09] text-pending';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones}`}>{children}</span>;
}

function Message({ role, time, text }: { role: string; time: string; text: string }) {
  const customer = role === 'Customer';
  return (
    <li className={`w-full rounded-xl border p-4 sm:w-[88%] ${customer
      ? 'mr-auto border-card-border bg-secondary/45'
      : 'ml-auto border-primary/20 bg-primary/[0.055]'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold">{role}</span>
        <time className="font-mono tabular text-[10px] text-muted-foreground">{time}</time>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-[1.65]">{text}</p>
    </li>
  );
}

export function WideReview() {
  const earlierMessages = messages.slice(0, -2);
  const recentMessages = messages.slice(-2);

  return (
    <div className="dispatch-conversation min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8 lg:py-7">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 border-b border-border/80 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.16em] text-primary">Dispatch Hub</span>
              <span aria-hidden="true">/</span>
              <span>Customer conversations</span>
              <span aria-hidden="true">/</span>
              <span className="text-foreground">Review #402</span>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <h1 className="font-display text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
                Analysis &amp; dispatch review
              </h1>
              <Badge><CheckCircle2 size={12} /> Analysis current</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Customer · Air conditioner not cooling · City Centre sample site
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled className="bg-card/70 opacity-75">
              <ArrowLeft size={14} /> Back to inbox
            </Button>
            <span className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card/65 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-primary" />
              Dispatcher approval required
            </span>
          </div>
        </header>

        <main className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(450px,.92fr)] 2xl:gap-7">
          <section className="min-w-0" aria-label="Customer conversation review">
            <Panel
              title={<><MessageSquareText size={16} className="text-primary" /> Customer conversation</>}
              aside={<span className="inline-flex items-center gap-2 font-mono text-[11px]"><span>4 messages</span><span className="text-border">·</span><span>Auto-updating</span></span>}
            >
              <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-background/70 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-bold text-accent-foreground">C</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Customer</p>
                    <p className="text-xs text-muted-foreground">Telegram conversation · #402</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 size={12} /> Today, 14:06</span>
              </div>

              <ol className="space-y-4" aria-label="Most recent conversation messages">
                {recentMessages.map((message) => <Message key={message.id} {...message} />)}
              </ol>

              <details className="group mt-4 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Earlier messages <span className="ml-1 font-mono text-xs text-muted-foreground">(2)</span></span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ol className="space-y-3 border-t border-card-border p-4" aria-label="Earlier conversation messages">
                  {earlierMessages.map((message) => <Message key={message.id} {...message} />)}
                </ol>
              </details>

              <details className="group mt-3 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2"><FlaskConical size={14} className="text-primary" /> AI summary</span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-card-border px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
                  The air conditioner is running but the room is not cooling. The customer reports a clicking sound and requests an early visit today.
                </p>
              </details>

              <form className="mt-5 border-t border-card-border pt-4" onSubmit={(event) => event.preventDefault()}>
                <label htmlFor="wide-review-reply" className="mb-2 block text-xs font-semibold">Reply to customer</label>
                <div className="flex items-end gap-2">
                  <textarea id="wide-review-reply" rows={2} maxLength={4096} disabled
                    className="min-h-12 min-w-0 flex-1 resize-y rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-75"
                    placeholder="Reply preview — sending is unavailable in this mockup." />
                  <Button type="button" disabled className="shrink-0"><Send size={14} /> Send</Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Messages are shown for review. This mockup does not send replies.</p>
              </form>

              <details className="group mt-4 border-t border-card-border pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                  <span>Telegram details</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 rounded-lg border border-card-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  Text only; photos and voice notes are not imported. Use test messages only. WhatsApp is not connected.
                </p>
              </details>
            </Panel>
          </section>

          <section className="min-w-0 space-y-5" aria-label="Analysis and dispatch decision">
            <Panel
              title={<><MapPin size={16} className="text-primary" /> Customer sample site</>}
              aside={<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Synthetic location</span>}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><MapPin size={17} /></span>
                  <div>
                    <p className="text-sm font-semibold">City Centre sample site</p>
                    <p className="mt-1 text-xs text-muted-foreground">Customer site assigned for this review</p>
                  </div>
                </div>
                <span className="inline-flex min-h-9 items-center rounded-md border border-input bg-background px-3 text-xs font-medium text-muted-foreground">Site selection · City Centre</span>
              </div>
              <p className="mt-4 border-t border-card-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                Location is a synthetic sample. No location is inferred from Telegram.
              </p>
            </Panel>

            <Panel title={<><FlaskConical size={16} className="text-primary" /> AI analysis</>} aside={<Badge><CheckCircle2 size={11} /> Current</Badge>}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Diagnosed issue</p>
                  <h3 className="mt-1.5 font-display text-xl font-semibold tracking-[-0.02em]">Air conditioner not cooling</h3>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">Unit is powered on; clicking noise suggests a likely electrical component fault.</p>
                </div>
                <Badge tone="pending">High urgency</Badge>
              </div>
              <div className="mt-5 border-t border-card-border pt-4">
                <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Required parts</p>
                <div className="flex flex-wrap gap-2">
                  {['Run capacitor', 'Washable filter'].map((part) => (
                    <span key={part} className="inline-flex items-center gap-2 rounded-md border border-card-border bg-secondary/55 px-2.5 py-1.5 font-mono text-xs">
                      <Package size={13} className="text-primary" />{part}
                    </span>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel
              title={<><Truck size={16} className="text-primary" /> Dispatch match</>}
              aside={<span className="font-mono text-[11px] text-muted-foreground">2 qualified</span>}
            >
              <div className="rounded-xl border border-ok/25 bg-ok/[0.055] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ok/20 bg-card font-mono text-xs font-semibold text-foreground">T4</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">Technician 04</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin size={11} /> City Centre</span>
                        <span className="font-mono">Van 12</span>
                      </p>
                    </div>
                  </div>
                  <Badge>Available</Badge>
                </div>
                <ul className="mt-4 space-y-2 border-t border-ok/15 pt-3 text-xs leading-relaxed text-muted-foreground">
                  <li className="flex items-center gap-2"><Check size={13} className="shrink-0 text-ok" /> Van 12 has the required stock.</li>
                  <li className="pl-5">Straight-line 6.4 km from sample position; not a driving ETA.</li>
                </ul>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-card-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-sm">
                  <p className="text-xs font-semibold">Manual approval</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Approved by dispatcher · saved in the immutable dispatch log</p>
                </div>
                <div aria-disabled="true" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-ok/30 bg-ok/[0.08] px-4 py-2 text-sm font-semibold text-ok sm:w-auto">
                  <CheckCircle2 size={14} /> Approve &amp; dispatch job
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Preview only. Approval and inventory updates are not active in this mockup.
              </p>
            </Panel>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">Approval rechecks technician availability and van stock before a job is dispatched.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
