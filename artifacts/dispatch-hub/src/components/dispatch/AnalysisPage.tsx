import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, FlaskConical, Loader2, MapPin, MessageSquareText, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getGetConversationThreadQueryKey, getListConversationsQueryKey,
  useAnalyzeConversation, useGetConversationThread,
  type Technician,
} from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, distanceKm, getTechnicianLocation } from './demoLocations';
import { rankQualifiedTechnicians } from './matching';
import { APPROVER, type DispatchState } from './useDispatchHub';
import { Card, InlineError, Mono, PageHead, PartChips, StatusBadge, dateTime, errorText, initials } from './shared';
import { MessagingConnectionNotice } from './MessagingConnectionNotice';

const urgencyTone = { High: 'err', Med: 'pending', Low: 'idle' } as const;
type Props = { hub: DispatchState; conversationId: number; onApprove: (tech: Technician) => void };

export default function AnalysisPage({ hub, conversationId, onApprove }: Props) {
  const qc = useQueryClient();
  const validId = Number.isSafeInteger(conversationId) && conversationId > 0;
  const threadQ = useGetConversationThread(conversationId, {
    query: {
      queryKey: getGetConversationThreadQueryKey(conversationId),
      enabled: validId,
      refetchInterval: 5_000,
      refetchOnWindowFocus: true,
    },
  });
  const analyze = useAnalyzeConversation();
  const [newMessagesSinceOpen, setNewMessagesSinceOpen] = useState(0);
  const lastObservedMessage = useRef<{ conversationId: number; messageId: number } | null>(null);
  const autoAnalyzeAttempted = useRef(new Set<number>());

  useEffect(() => {
    const thread = threadQ.data;
    const latestMessageId = thread?.latest_message_id;
    if (!thread || latestMessageId == null) return;

    const previous = lastObservedMessage.current;
    if (!previous || previous.conversationId !== conversationId) {
      lastObservedMessage.current = { conversationId, messageId: latestMessageId };
      setNewMessagesSinceOpen(0);
      return;
    }
    if (latestMessageId > previous.messageId) {
      const addedCount = thread.messages.filter((message) => message.id > previous.messageId).length;
      setNewMessagesSinceOpen((count) => count + Math.max(addedCount, 1));
      lastObservedMessage.current = { conversationId, messageId: latestMessageId };
    }
  }, [conversationId, threadQ.data]);

  useEffect(() => {
    const thread = threadQ.data;
    if (!thread || autoAnalyzeAttempted.current.has(conversationId)) return;
    autoAnalyzeAttempted.current.add(conversationId);
    const analysisIsCurrent = thread.analysis != null &&
      thread.analyzed_through_message_id === thread.latest_message_id;
    if (analysisIsCurrent || thread.dispatch_activity_id != null) return;
    analyze.mutate({ id: conversationId }, {
      onSuccess: (updated) => {
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (updated.analysis && updated.analyzed_through_message_id === updated.latest_message_id) {
          setNewMessagesSinceOpen(0);
        }
      },
    });
  }, [analyze, conversationId, qc, threadQ.data]);

  const thread = threadQ.data;
  const site = DEMO_CUSTOMER_SITES.find((item) => item.id === thread?.customer_site_id) ?? DEMO_CUSTOMER_SITES[0];
  const analysis = thread?.analysis ?? null;
  const analysisIsCurrent = !!thread && !!analysis &&
    thread.analyzed_through_message_id === thread.latest_message_id;
  const matches = useMemo(
    () => rankQualifiedTechnicians(hub.hubQ.data, analysis?.parts ?? [], site),
    [hub.hubQ.data, analysis, site],
  );
  const match = matches[0] ?? null;
  const dispatchSaved = thread?.dispatch_activity_id != null;

  const runAnalysis = () => {
    if (!validId || analyze.isPending) return;
    analyze.mutate({ id: conversationId }, {
      onSuccess: (updated) => {
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (updated.analysis && updated.analyzed_through_message_id === updated.latest_message_id) {
          setNewMessagesSinceOpen(0);
        }
      },
    });
  };

  const approve = async () => {
    if (!thread || !analysis || !analysisIsCurrent || !match || dispatchSaved) return;
    const ok = await hub.approveConversationDispatch(conversationId, analysis, thread.customer_site_id, match);
    if (ok) onApprove(match);
  };

  if (!validId) {
    return <InlineError><Link href="/intake" className="underline">Choose a saved conversation</Link> to review.</InlineError>;
  }
  if (threadQ.isLoading) return <div className="mx-auto max-w-5xl space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;
  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <InlineError onRetry={() => void threadQ.refetch()} retrying={threadQ.isFetching}>This conversation could not be loaded.</InlineError>
        <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
      </div>
    );
  }

  const loc = match ? getTechnicianLocation(match.id) : undefined;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead kicker={`Selected conversation · #${thread.id}`} title="Analysis & dispatch review"
        sub={`${thread.customer_name} · ${thread.subject} · ${site.label}`}>
        <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
        {dispatchSaved && <Button asChild variant="outline"><Link href="/log">View dispatch log</Link></Button>}
      </PageHead>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)]">
        <div className="min-w-0 space-y-4">
          <Card title={<><MessageSquareText size={15} /> Customer conversation</>} aside={
            <span className="flex flex-wrap items-center justify-end gap-2">
              <Mono>#{thread.id} · {thread.message_count} messages</Mono>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw size={10} className={threadQ.isFetching ? 'animate-spin' : ''} />
                Auto-check every 5 sec
              </span>
            </span>
          }>
            {threadQ.isError && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                The latest replies could not be checked. This conversation may have changed; approval stays disabled until it is refreshed and analyzed.
                <button type="button" className="ml-1 underline" onClick={() => void threadQ.refetch()}>Try again</button>
              </p>
            )}
            {newMessagesSinceOpen > 0 && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                {newMessagesSinceOpen} new {newMessagesSinceOpen === 1 ? 'message has' : 'messages have'} arrived while this conversation was open. The analysis is stale; analyze the latest chat before dispatching.
              </p>
            )}
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary"><FlaskConical size={11} /> Mock AI summary · extractive demo</p>
              <p className="text-sm leading-relaxed">{thread.mock_summary}</p>
            </div>
            <ol className="max-h-[430px] space-y-3 overflow-y-auto pr-1" aria-label="Conversation transcript" data-testid="conversation-transcript">
              {thread.messages.map((message) => {
                const customer = message.sender_role === 'Customer';
                return (
                  <li key={message.id} data-testid={`message-${message.id}`}
                    className={`max-w-[94%] rounded-xl border p-3 sm:max-w-[85%] ${customer ? 'mr-auto border-card-border bg-secondary/50' : 'ml-auto border-primary/20 bg-primary/[0.06]'}`}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{message.sender_name} <span className="font-normal text-muted-foreground">· {message.sender_role}</span></span>
                      <time className="font-mono tabular text-[10px] text-muted-foreground" dateTime={message.created_at}>{dateTime(message.created_at)}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 border-t border-card-border pt-4"><MessagingConnectionNotice /></div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="AI analysis" aside={
            analysisIsCurrent ? <StatusBadge tone="ok"><CheckCircle2 size={10} /> Current</StatusBadge>
              : <StatusBadge tone="pending">{analyze.isPending ? 'Analyzing' : 'Re-analysis needed'}</StatusBadge>
          }>
            {analyze.error && <InlineError onRetry={runAnalysis} retrying={analyze.isPending} retryLabel="Retry analysis">{errorText(analyze.error)}</InlineError>}
            {analysis ? (
              <div className="space-y-4">
                {!analysisIsCurrent && <p role="status" className="rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">The chat changed after this result. Re-analyze it before dispatching.</p>}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Diagnosed issue</p>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold">{analysis.issue}</h2>
                    <StatusBadge tone={urgencyTone[analysis.urgency]}>{analysis.urgency} urgency</StatusBadge>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required parts</p>
                  <PartChips parts={analysis.parts} />
                </div>
                {!analysisIsCurrent && (
                  <Button type="button" variant="outline" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-reanalyze-conversation">
                    <RefreshCw size={13} className={analyze.isPending ? 'animate-spin' : ''} />
                    {analyze.isPending ? 'Analyzing latest messages…' : 'Analyze updated chat'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p role="status" className="rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-sm">
                  This conversation has messages that have not been analyzed yet. Analyze the latest chat before dispatching.
                </p>
                <Button type="button" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-analyze-conversation">
                  {analyze.isPending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                  {analyze.isPending ? 'Analyzing selected chat…' : 'Analyze this conversation'}
                </Button>
              </div>
            )}
          </Card>

          {analysis && analysisIsCurrent && (
            <Card title={<><Truck size={15} /> Dispatch match</>} aside={<Mono>{matches.length} qualified</Mono>}>
              {hub.hubQ.isLoading ? <Skeleton className="h-24" />
                : !hub.hubQ.data ? <InlineError onRetry={() => void hub.hubQ.refetch()} retrying={hub.hubQ.isFetching}>Reconnect to the hub to match a technician.</InlineError>
                  : match ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-ok/30 bg-ok/[0.06] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card font-mono text-xs font-semibold">{initials(match.name)}</span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{match.name}</p>
                              <p className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin size={11} /> {match.zone}</span><Mono>Van {match.van_id}</Mono></p>
                            </div>
                          </div>
                          <StatusBadge tone="idle">Available</StatusBadge>
                        </div>
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-ok" /> Van {match.van_id} has the required stock.</li>
                          <li>{loc ? <>Straight-line <Mono>{distanceKm(loc, site).toFixed(1)} km</Mono> from sample position, not a driving ETA.</> : 'Location unavailable.'}</li>
                        </ul>
                      </div>
                      {dispatchSaved && (
                        <p role="status" className="rounded-md border border-ok/30 bg-ok/[0.06] p-3 text-sm">
                          This chat is already linked to dispatch <Mono>#{thread.dispatch_activity_id}</Mono>. A second dispatch cannot be created from the same conversation.
                        </p>
                      )}
                      {hub.approveError && <InlineError>{hub.approveError}</InlineError>}
                      <div className="space-y-2 border-t border-card-border pt-3">
                        <p className="text-xs text-muted-foreground">Approved by <b className="text-foreground">{APPROVER}</b> · saved in the immutable dispatch log</p>
                        <Button type="button" variant="success" className="w-full" onClick={() => void approve()}
                          disabled={dispatchSaved || !analysisIsCurrent || threadQ.isError || hub.writePending || hub.connectionLost || hub.approve.isPending}
                          data-testid="button-approve-conversation-dispatch">
                          {hub.approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          {hub.approve.isPending ? 'Allocating parts…' : dispatchSaved ? 'Already dispatched' : 'Approve & dispatch job'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-4 text-sm">
                      <b>No qualified technician found.</b> No available van currently has every required part. Review stock before approving.
                    </div>
                  )}
            </Card>
          )}
          <p className="text-xs text-muted-foreground">Only this saved conversation is analyzed. Dispatch approval is a separate action and rechecks current technician and stock data.</p>
        </div>
      </div>
    </div>
  );
}
