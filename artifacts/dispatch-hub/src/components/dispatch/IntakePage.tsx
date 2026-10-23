import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowRight, Check, FlaskConical, Inbox, Loader2, MessageSquareText, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGetHubDataQueryKey, getListConversationsQueryKey, useAcknowledgeDispatch, useListConversations } from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, dateTime, errorText } from './shared';
import { useDemoSession } from './session';
import { MessagingConnectionNotice } from './MessagingConnectionNotice';
import { useToast } from '@/hooks/use-toast';
import type { DispatchState } from './useDispatchHub';

type Level = 'Easy' | 'Normal' | 'Hard';
const LEVELS: { level: Level; dot: string; blurb: string }[] = [
  { level: 'Easy', dot: 'bg-ok', blurb: 'Swap-and-go, minutes on site. Bulb or battery replacement, remote or filter swap. Intern-friendly.' },
  { level: 'Normal', dot: 'bg-pending', blurb: 'Routine servicing. AC filter clean, drain hose flush, gas top-up. Level 2 or above.' },
  { level: 'Hard', dot: 'bg-err', blurb: 'Diagnosis needed. AC capacitor, control board, electrical faults. Level 3 expert only.' },
];
const complexityOf = (c: { complexity?: string; subject: string; mock_summary: string }): Level => {
  if (c.complexity === 'Easy' || c.complexity === 'Normal' || c.complexity === 'Hard') return c.complexity;
  const t = `${c.subject} ${c.mock_summary}`.toLowerCase();
  if (/capacitor|control board|electrical|compressor|pcb/.test(t)) return 'Hard';
  if (/bulb|battery|remote|fuse/.test(t)) return 'Easy';
  return 'Normal';
};

export default function IntakePage({ hub }: { hub: DispatchState }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const acknowledge = useAcknowledgeDispatch();
  const conversationsQ = useListConversations({
    query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5_000, refetchOnWindowFocus: true },
  });
  const openConversation = (id: number) => navigate(`/analysis/${id}`);

  const { technicianId } = useDemoSession();
  const all = conversationsQ.data?.conversations ?? [];
  const acknowledgedConversationIds = useMemo(() => new Set(hub.activity
    .filter((entry) => entry.dispatch?.boss_acknowledged_at != null)
    .map((entry) => entry.dispatch?.conversation_id)
    .filter((id): id is number => id != null)), [hub.activity]);
  // Technicians see unassigned requests and their own assigned ones only.
  const conversations = technicianId == null
    ? all.filter((conversation) => conversation.dispatch_activity_id == null || !acknowledgedConversationIds.has(conversation.id))
    : all.filter((c) => c.technician_id == null || c.technician_id === technicianId);
  const groups = LEVELS.map((meta) => ({ ...meta, items: conversations.filter((c) => complexityOf(c) === meta.level) }));
  const acknowledgeConversation = (dispatchId: number) => acknowledge.mutate({ id: dispatchId }, {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetHubDataQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }),
      ]);
      toast({ title: 'Conversation hidden', description: 'The dispatch remains active; its technician, van and reserved parts are unchanged.' });
    },
  });
  return (
    <div className="space-y-5">
      <PageHead large kicker="Customer conversations" title="Work Order">
        <StatusBadge tone="pending"><FlaskConical size={10} /> Demo work orders</StatusBadge>
      </PageHead>

      <MessagingConnectionNotice />

      <Card title={<><Inbox size={15} /> Work orders by difficulty</>} aside={<span className="font-mono">{conversations.length} work orders</span>}>
        {conversationsQ.isLoading ? <SkeletonRows rows={4} label="Loading saved conversations" />
          : conversationsQ.isError && !conversationsQ.data
            ? <InlineError onRetry={() => void conversationsQ.refetch()} retrying={conversationsQ.isFetching}>Saved conversations could not be loaded.</InlineError>
            : conversations.length === 0
              ? <EmptyState icon={<MessageSquareText size={17} />} title="No saved conversations">Synthetic demo chats will appear here when available.</EmptyState>
              : <div className="space-y-7">
                {groups.map((group) => (
                  <section key={group.level} aria-labelledby={`group-${group.level}`} data-testid={`group-${group.level}`}>
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-card-border pb-2">
                      <h3 id={`group-${group.level}`} className="flex items-center gap-2 font-display text-base font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} aria-hidden="true" />{group.level}
                        <Mono className="text-muted-foreground">{group.items.length}</Mono>
                      </h3>
                      <p className="text-xs text-muted-foreground">{group.blurb}</p>
                    </div>
                    {group.items.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No {group.level.toLowerCase()} requests right now.</p> : (
                    <div className="grid gap-3 lg:grid-cols-2">
                {group.items.map((conversation) => {
                  const site = DEMO_CUSTOMER_SITES.find((item) => item.id === conversation.customer_site_id);
                  return (
                    <article key={conversation.id} data-testid={`conversation-card-${conversation.id}`}
                      className={`group min-w-0 rounded-xl border p-4 transition-all hover:shadow-md ${conversation.dispatch_activity_id != null
                        ? 'dh-dispatched-glass border-emerald-300/70 hover:border-emerald-400/80'
                        : 'border-card-border bg-card hover:border-primary/35'}`}>
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
                        <div className="flex items-center gap-2">
                          {technicianId == null && conversation.dispatch_activity_id != null && (
                            <Button type="button" size="icon" variant="outline"
                              aria-label="Acknowledge and hide dispatched work order"
                              title="Hide this card from the Boss list; the dispatch stays active"
                              disabled={acknowledge.isPending}
                              onClick={() => acknowledgeConversation(conversation.dispatch_activity_id!)}
                              data-testid={`button-acknowledge-dispatch-${conversation.dispatch_activity_id}`}>
                              {acknowledge.isPending && acknowledge.variables?.id === conversation.dispatch_activity_id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Check size={14} />}
                            </Button>
                          )}
                          <Button type="button" size="sm" onClick={() => openConversation(conversation.id)}
                            data-testid={`button-review-conversation-${conversation.id}`}>
                            <ScanSearch size={13} /> {conversation.dispatch_activity_id != null ? 'View conversation' : 'Open work order'} <ArrowRight size={13} />
                          </Button>
                        </div>
                      </div>
                      {acknowledge.isError && acknowledge.variables?.id === conversation.dispatch_activity_id && (
                        <p role="alert" className="mt-2 text-xs text-err">{errorText(acknowledge.error, 'The conversation could not be hidden. Try again.')}</p>
                      )}
                    </article>
                  );
                })}
                    </div>)}
                  </section>
                ))}
              </div>}
      </Card>
    </div>
  );
}
