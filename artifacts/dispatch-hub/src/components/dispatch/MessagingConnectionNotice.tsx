import { ExternalLink, MessageSquareText } from 'lucide-react';
import { useGetTelegramStatus, getGetTelegramStatusQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, dateTime } from './shared';

export function MessagingConnectionNotice() {
  const statusQ = useGetTelegramStatus({
    query: { queryKey: getGetTelegramStatusQueryKey(), refetchInterval: 10_000, refetchOnWindowFocus: true },
  });
  const status = statusQ.data;
  const connected = !statusQ.isError && status?.connected;
  const label = statusQ.isLoading ? 'Checking…' : statusQ.isError ? 'Status unavailable' : status?.error ? 'Needs attention' : connected ? 'Receiving messages' : status?.configured ? 'Connecting…' : 'Not connected';
  const description = status?.error ?? (connected
    ? 'Open the bot, tap Start, then send a private text repair request. It appears in this inbox as a customer conversation and is automatically sent to the mock analyzer. Send /new before your next separate repair request.'
    : statusQ.isError
      ? 'The receiver status could not be checked. It refreshes automatically.'
      : status?.configured
        ? 'Verifying the bot and starting its receiver…'
        : 'No Telegram bot token is configured. Existing saved conversations remain available for review.');
  return (
    <section aria-label="Customer messaging connection" className="rounded-lg border border-card-border bg-secondary/40 p-3" data-testid="messaging-connection-status">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText size={14} className="text-muted-foreground" />
        <h2 className="text-xs font-semibold">Telegram customer messages</h2>
        <StatusBadge tone={connected ? 'ok' : 'pending'}>{label}</StatusBadge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {connected && status?.bot_url && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button asChild size="sm"><a href={status.bot_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open @{status.bot_username}</a></Button>
          {status.last_received_at && <span className="text-[11px] text-muted-foreground">Last message: {dateTime(status.last_received_at)}</span>}
        </div>
      )}
      {status?.configured && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Text only; photos and voice notes are not imported. Use test messages only: this demo inbox is shared by all signed-in accounts. The receiver works while the API server is running. WhatsApp is not connected.</p>}
    </section>
  );
}
