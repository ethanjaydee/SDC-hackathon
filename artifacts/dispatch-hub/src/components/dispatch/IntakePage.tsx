import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FlaskConical, Inbox, MessageSquareText, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getGetConversationThreadQueryKey, getListConversationsQueryKey,
  useAnalyzeConversation, useListConversations,
} from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, dateTime, errorText } from './shared';
import { useToast } from '@/hooks/use-toast';
import { MessagingConnectionNotice } from './MessagingConnectionNotice';

export default function IntakePage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const conversationsQ = useListConversations({
    query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5_000, refetchOnWindowFocus: true },
  });
  const analyze = useAnalyzeConversation();
  const [openingId, setOpeningId] = useState<number | null>(null);

  const openConversation = async (id: number) => {
    if (analyze.isPending) return;
    const selected = conversations.find((item) => item.id === id);
    if (selected?.dispatch_activity_id != null) {
      navigate(`/analysis/${id}`);
      return;
    }
    setOpeningId(id);
    try {
      const thread = await analyze.mutateAsync({ id });
      qc.setQueryData(getGetConversationThreadQueryKey(id), thread);
      void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      toast({ title: 'Conversation ready', description: 'Only this selected chat was sent to the mock analyzer.' });
      navigate(`/analysis/${id}`);
    } catch {
      // The mutation error is shown inline so the dispatcher can retry.
    } finally {
      setOpeningId(null);
    }
  };

  const conversations = conversationsQ.data?.conversations ?? [];
  return (
    <div className="space-y-5">
      <PageHead kicker="Step 1 · Customer conversations" title="Repair intake" sub="Review what the customer and technician said. Open one conversation to analyze it and prepare a dispatch.">
        <StatusBadge tone="pending"><FlaskConical size={10} /> Mock summaries</StatusBadge>
      </PageHead>

      <MessagingConnectionNotice />

      {analyze.error && (
        <InlineError onRetry={() => openingId != null && void openConversation(openingId)} retrying={analyze.isPending} retryLabel="Retry analysis">
          {errorText(analyze.error, 'The selected conversation could not be analyzed.')}
        </InlineError>
      )}

      <Card title={<><Inbox size={15} /> Conversation inbox</>} aside={<span className="font-mono">{conversations.length} saved chats</span>}>
        {conversationsQ.isLoading ? <SkeletonRows rows={4} label="Loading saved conversations" />
          : conversationsQ.isError && !conversationsQ.data
            ? <InlineError onRetry={() => void conversationsQ.refetch()} retrying={conversationsQ.isFetching}>Saved conversations could not be loaded.</InlineError>
            : conversations.length === 0
              ? <EmptyState icon={<MessageSquareText size={17} />} title="No saved conversations">Synthetic demo chats will appear here when available.</EmptyState>
              : <div className="grid gap-3 lg:grid-cols-2">
                {conversations.map((conversation) => {
                  const site = DEMO_CUSTOMER_SITES.find((item) => item.id === conversation.customer_site_id);
                  const isOpening = openingId === conversation.id && analyze.isPending;
                  return (
                    <article key={conversation.id} data-testid={`conversation-card-${conversation.id}`}
                      className="group min-w-0 rounded-xl border border-card-border bg-card p-4 transition-all hover:border-primary/35 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                           <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{conversation.source} · Chat <Mono>#{conversation.id}</Mono></p>
                          <h2 className="mt-1 truncate font-display text-base font-semibold">{conversation.subject}</h2>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                             {conversation.customer_name} · {site?.label ?? 'Site not assigned'}
                          </p>
                        </div>
                        {conversation.dispatch_activity_id != null
                          ? <StatusBadge tone="ok">Dispatched</StatusBadge>
                          : <StatusBadge tone="pending">Needs review</StatusBadge>}
                      </div>

                      <div className="mt-4 rounded-lg bg-secondary/55 p-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          <FlaskConical size={11} /> Mock AI summary
                        </div>
                        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">{conversation.mock_summary}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="min-w-0 truncate">
                          Latest: <b className="text-foreground">{conversation.latest_message.sender_name}</b>
                          {conversation.technician_name && <span> · {conversation.technician_name} in chat</span>}
                        </span>
                        <time className="shrink-0 font-mono tabular" dateTime={conversation.updated_at}>{dateTime(conversation.updated_at)}</time>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{conversation.latest_message.text}</p>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-card-border pt-3">
                        <span className="font-mono text-[10px] text-muted-foreground">{conversation.message_count} messages</span>
                        <Button type="button" size="sm" onClick={() => void openConversation(conversation.id)}
                          disabled={analyze.isPending} data-testid={`button-review-conversation-${conversation.id}`}>
                          <ScanSearch size={13} /> {isOpening ? 'Analyzing…' : conversation.dispatch_activity_id != null ? 'View conversation' : 'Review & analyze'} <ArrowRight size={13} />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>}
      </Card>
      <p className="text-xs text-muted-foreground">Telegram text messages can be live; summaries and analysis still use deterministic mock logic, not an external AI service. Incoming requests never dispatch automatically.</p>
    </div>
  );
}
