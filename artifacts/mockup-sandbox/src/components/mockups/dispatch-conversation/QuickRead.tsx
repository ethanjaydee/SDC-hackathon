import './_group.css';
import { ChevronDown, MessageSquareText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function QuickRead() {
  return (
    <div className="dispatch-conversation min-h-screen p-4 sm:p-6">
      <Card className="mx-auto max-w-[720px] border-card-border shadow-sm">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <MessageSquareText size={15} /> Customer conversation
          </h2>
          <span className="rounded-full border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
            4 messages · Updates automatically
          </span>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="space-y-3">
            <article className="rounded-xl border border-card-border bg-secondary/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold">Customer</span>
                <time className="font-mono tabular text-muted-foreground">14:05</time>
              </div>
              <p className="text-base leading-relaxed">
                It is powered on. Please come as early as possible today.
              </p>
            </article>
            <article className="ml-auto max-w-[92%] rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold">Dispatch team</span>
                <time className="font-mono tabular text-muted-foreground">14:06</time>
              </div>
              <p className="text-base leading-relaxed">
                Got it. We will review this and confirm a technician.
              </p>
            </article>
          </div>

          <details className="group rounded-lg border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>Earlier messages <span className="ml-1 font-mono text-xs text-muted-foreground">(2)</span></span>
              <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <ol className="space-y-2 border-t border-border px-3 py-3 text-sm leading-relaxed">
              <li className="rounded-md bg-secondary/50 p-3">
                <span className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
                  Customer <time className="font-mono font-normal text-muted-foreground">14:01</time>
                </span>
                The air conditioner is running but the room is still warm. It started making a clicking sound this morning.
              </li>
              <li className="rounded-md bg-primary/[0.05] p-3">
                <span className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
                  Dispatch team <time className="font-mono font-normal text-muted-foreground">14:03</time>
                </span>
                Thanks for letting us know. Is the indoor unit powered on, and is there a preferred time for the visit?
              </li>
            </ol>
          </details>

          <details className="group rounded-lg border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>AI summary</span>
              <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="border-t border-border px-3 py-3 text-sm leading-relaxed text-muted-foreground">
              The air conditioner is running but the room is not cooling. The customer reports a clicking sound and requests an early visit today.
            </p>
          </details>

          <form className="border-t border-card-border pt-4" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="quick-reply" className="sr-only">Reply to customer</label>
            <div className="flex items-end gap-2">
              <textarea
                id="quick-reply"
                rows={2}
                maxLength={4096}
                className="min-h-12 flex-1 resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Write a reply…"
              />
              <Button type="button" className="shrink-0"><Send size={14} /> Send</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Sent only when you tap Send.</p>
          </form>

          <details className="group rounded-md border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
              <span>Telegram details</span>
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 border-t border-border pt-2 leading-relaxed">
              Text only; photos and voice notes are not imported. Use test messages only: this demo inbox is shared by all signed-in accounts. WhatsApp is not connected.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
