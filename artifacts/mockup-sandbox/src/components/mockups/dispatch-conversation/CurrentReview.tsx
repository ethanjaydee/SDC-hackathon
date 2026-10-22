import './_group.css';
import { useId, type ReactNode } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronDown, FlaskConical, MapPin,
  MessageSquareText, Package, Send, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function Panel({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card role="region" aria-labelledby={titleId} className="min-w-0 border-card-border shadow-sm">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3 md:px-5">
        <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </CardHeader>
      <CardContent className="p-4 md:p-5">{children}</CardContent>
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
  const toneClass = tone === 'ok'
    ? 'border-ok/30 bg-ok/10 text-ok'
    : 'border-pending/30 bg-pending/10 text-pending';
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}>{children}</span>;
}

function Message({ role, time, text, compact = false }: { role: string; time: string; text: string; compact?: boolean }) {
  const customer = role === 'Customer';
  return (
    <li className={`rounded-xl border p-3 ${customer ? 'border-card-border bg-secondary/50' : 'border-primary/20 bg-primary/[0.06]'} ${customer ? 'mr-auto' : 'ml-auto'} max-w-[96%]`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold">{role}</span>
        <time className="font-mono tabular text-[10px] text-muted-foreground">{time}</time>
      </div>
      <p className={`whitespace-pre-wrap break-words leading-relaxed ${compact ? 'text-sm' : 'text-sm'}`}>{text}</p>
    </li>
  );
}

export function CurrentReview() {
  const earlierMessages = messages.slice(0, -2);
  const recentMessages = messages.slice(-2);

  return (
    <div className="dispatch-conversation min-h-screen bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Selected conversation · #402</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-[1.05] md:text-[34px]">Analysis &amp; dispatch review</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Customer · Air conditioner not cooling · City Centre sample site</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline"><ArrowLeft size={14} /> Back to inbox</Button>
          </div>
        </header>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)]">
          <div className="min-w-0 space-y-4">
            <Panel
              title={<><MessageSquareText size={15} /> Customer conversation</>}
              aside={<span className="font-mono text-xs text-muted-foreground">4 messages · Auto-updating</span>}
            >
              <ol className="space-y-3" aria-label="Most recent conversation messages">
                {recentMessages.map((message) => <Message key={message.id} {...message} />)}
              </ol>
              <details className="group mt-3 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Earlier messages <span className="ml-1 font-mono text-xs text-muted-foreground">(2)</span></span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ol className="space-y-2 border-t border-card-border p-3">
                  {earlierMessages.map((message) => <Message key={message.id} {...message} compact />)}
                </ol>
              </details>
              <details className="group mt-3 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2"><FlaskConical size={13} className="text-primary" /> AI summary</span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-card-border px-3 py-3 text-sm leading-relaxed">
                  The air conditioner is running but the room is not cooling. The customer reports a clicking sound and requests an early visit today.
                </p>
              </details>
              <form className="mt-4 border-t border-card-border pt-4" onSubmit={(event) => event.preventDefault()}>
                <label htmlFor="current-review-reply" className="mb-2 block text-xs font-medium">Reply to customer</label>
                <div className="flex items-end gap-2">
                  <textarea id="current-review-reply" rows={2} maxLength={4096} className="min-h-12 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground" placeholder="Write a reply…" />
                  <Button type="button" className="shrink-0"><Send size={14} /> Send</Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Sent only when you tap Send.</p>
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
          </div>

          <div className="min-w-0 space-y-4">
            <Panel title={<><MapPin size={15} /> Customer sample site</>}>
              <label htmlFor="current-review-site" className="mb-2 block text-xs text-muted-foreground">Choose a synthetic site before dispatching.</label>
              <select id="current-review-site" className="w-full min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground" defaultValue="city-centre">
                <option value="city-centre">City Centre sample site</option>
              </select>
            </Panel>

            <Panel title="AI analysis" aside={<Badge><CheckCircle2 size={10} /> Current</Badge>}>
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Diagnosed issue</p>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold">Air conditioner not cooling</h2>
                    <Badge tone="pending">High urgency</Badge>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required parts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Run capacitor', 'Washable filter'].map((part) => (
                      <span key={part} className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/60 px-2 py-1 font-mono text-xs">
                        <Package size={12} className="text-primary" />{part}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title={<><Truck size={15} /> Dispatch match</>} aside={<span className="font-mono text-xs">2 qualified</span>}>
              <div className="space-y-4">
                <div className="rounded-lg border border-ok/30 bg-ok/[0.06] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card font-mono text-xs font-semibold">T4</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">Technician 04</p>
                        <p className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin size={11} /> City Centre</span><span className="font-mono">Van 12</span></p>
                      </div>
                    </div>
                    <Badge>Available</Badge>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-ok" /> Van 12 has the required stock.</li>
                    <li>Straight-line 6.4 km from sample position; not a driving ETA.</li>
                  </ul>
                </div>
                <div className="space-y-2 border-t border-card-border pt-3">
                  <p className="text-xs text-muted-foreground">Approved by dispatcher · saved in the immutable dispatch log</p>
                  <Button type="button" className="w-full bg-ok text-white hover:bg-ok/90"><CheckCircle2 size={14} /> Approve &amp; dispatch job</Button>
                </div>
              </div>
            </Panel>
            <p className="text-xs text-muted-foreground">Approval rechecks technician availability and van stock.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
