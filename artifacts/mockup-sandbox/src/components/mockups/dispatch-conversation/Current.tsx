import './_group.css';
import { FlaskConical, MessageSquareText, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const messages = [
  {
    id: 1,
    name: 'Customer',
    role: 'Customer',
    time: 'Oct 22 · 14:01',
    text: 'The air conditioner is running but the room is still warm. It started making a clicking sound this morning.',
    customer: true,
  },
  {
    id: 2,
    name: 'Dispatch team',
    role: 'Dispatch team',
    time: 'Oct 22 · 14:03',
    text: 'Thanks for letting us know. Is the indoor unit powered on, and is there a preferred time for the visit?',
    customer: false,
  },
  {
    id: 3,
    name: 'Customer',
    role: 'Customer',
    time: 'Oct 22 · 14:05',
    text: 'It is powered on. Please come as early as possible today.',
    customer: true,
  },
  {
    id: 4,
    name: 'Dispatch team',
    role: 'Dispatch team',
    time: 'Oct 22 · 14:06',
    text: 'Got it. We will review this and confirm a technician.',
    customer: false,
  },
];

export function Current() {
  return (
    <div className="dispatch-conversation min-h-screen p-4 sm:p-6">
      <Card className="mx-auto max-w-[720px] border-card-border shadow-sm">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-card-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <MessageSquareText size={15} /> Customer conversation
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2 py-1 font-mono">#402 · 4 messages</span>
            <span className="inline-flex items-center gap-1 text-[10px]">
              <RefreshCw size={10} /> Auto-check every 5 sec
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              <FlaskConical size={11} /> Mock AI summary · extractive demo
            </p>
            <p className="text-sm leading-relaxed">
              The air conditioner is running but the room is not cooling. The customer reports a clicking sound and requests an early visit today.
            </p>
          </div>

          <ol className="max-h-[430px] space-y-3 overflow-y-auto pr-1" aria-label="Conversation transcript">
            {messages.map((message) => (
              <li
                key={message.id}
                className={`max-w-[94%] rounded-xl border p-3 sm:max-w-[85%] ${
                  message.customer
                    ? 'mr-auto border-card-border bg-secondary/50'
                    : 'ml-auto border-primary/20 bg-primary/[0.06]'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold">
                    {message.name} <span className="font-normal text-muted-foreground">· {message.role}</span>
                  </span>
                  <time className="font-mono tabular text-[10px] text-muted-foreground">{message.time}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
              </li>
            ))}
          </ol>

          <form className="border-t border-card-border pt-4" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="current-reply" className="mb-2 block text-xs font-medium">
              Reply to customer on Telegram
            </label>
            <textarea
              id="current-reply"
              rows={3}
              className="w-full min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80"
              placeholder="Write a reply…"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-[420px] text-[10px] text-muted-foreground">
                This sends a real Telegram message to the customer. Nothing is sent until you choose Send.
              </p>
              <Button type="button"><Send size={13} /> Send reply</Button>
            </div>
          </form>

          <section aria-label="Customer messaging connection" className="rounded-lg border border-card-border bg-secondary/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <MessageSquareText size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold">Telegram customer messages</h3>
              <span className="inline-flex items-center rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-[11px] font-medium text-ok">
                Receiving messages
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Open the bot, tap Start, then send a private text repair request. It appears in this inbox as a customer conversation and is automatically sent to the mock analyzer. Send /new before your next separate repair request.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Text only; photos and voice notes are not imported. Use test messages only: this demo inbox is shared by all signed-in accounts. WhatsApp is not connected.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
