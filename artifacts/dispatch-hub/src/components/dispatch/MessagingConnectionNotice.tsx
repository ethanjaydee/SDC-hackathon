import { MessageSquareText } from 'lucide-react';
import { StatusBadge } from './shared';

export function MessagingConnectionNotice() {
  return (
    <section aria-label="Customer messaging connection" className="rounded-lg border border-card-border bg-secondary/40 p-3" data-testid="messaging-connection-status">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText size={14} className="text-muted-foreground" />
        <h2 className="text-xs font-semibold">WhatsApp / Telegram</h2>
        <StatusBadge tone="idle">Not connected</StatusBadge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Incoming customer messages are not syncing. A connected messaging account is required before a chat link can send messages into this inbox. Existing saved conversations remain available for mock AI review.
      </p>
    </section>
  );
}
