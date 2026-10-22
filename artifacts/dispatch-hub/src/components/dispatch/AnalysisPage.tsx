import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, ChevronDown, FlaskConical, Loader2, MapPin, MessageSquareText, RefreshCw, Send, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getGetConversationThreadQueryKey, getListConversationsQueryKey,
  useAnalyzeConversation, useGetConversationThread, useSendTelegramReply, useSetConversationSite,
  type Technician, type DemoSiteId,
} from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, distanceKm, getTechnicianLocation } from './demoLocations';
import { rankQualifiedTechnicians } from './matching';
import { APPROVER, type DispatchState } from './useDispatchHub';
import { Card, InlineError, Mono, PageHead, PartChips, StatusBadge, dateTime, errorText, initials, fieldClass } from './shared';
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
  const [replyText, setReplyText] = useState('');
  const sendReply = useSendTelegramReply({
    mutation: {
      onSuccess: async (updated) => {
        await qc.cancelQueries({ queryKey: getGetConversationThreadQueryKey(conversationId) });
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setReplyText('');
      },
    },
  });
  const setSite = useSetConversationSite({
    mutation: {
      onSuccess: async (updated) => {
        await qc.cancelQueries({ queryKey: getGetConversationThreadQueryKey(conversationId) });
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
    },
  });
  const [newMessagesSinceOpen, setNewMessagesSinceOpen] = useState(0);
  const lastObservedMessage = useRef<{ conversationId: number; messageId: number } | null>(null);
  const autoAnalyzeAttempted = useRef(new Set<number>());

  useEffect(() => {
    setReplyText('');
    sendReply.reset();
  }, [conversationId]);

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
      const addedCustomerMessages = thread.messages.filter(
        (message) => message.id > previous.messageId && message.sender_role === 'Customer',
      ).length;
      if (addedCustomerMessages > 0) {
        setNewMessagesSinceOpen((count) => count + addedCustomerMessages);
      }
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
  const orderedMessages = [...(thread?.messages ?? [])].sort((a, b) => a.id - b.id);
  const site = DEMO_CUSTOMER_SITES.find((item) => item.id === thread?.customer_site_id);
  const analysis = thread?.analysis ?? null;
  const analysisIsCurrent = !!thread && !!analysis &&
    thread.analyzed_through_message_id === thread.latest_message_id;
  const matches = useMemo(
    () => site ? rankQualifiedTechnicians(hub.hubQ.data, analysis?.parts ?? [], site) : [],
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
    if (!thread || !thread.customer_site_id || !analysis || !analysisIsCurrent || !match || dispatchSaved) return;
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
  const earlierMessages = orderedMessages.slice(0, -2);
  const recentMessages = orderedMessages.slice(-2);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead kicker={`Selected conversation · #${thread.id}`} title="Analysis & dispatch review"
        sub={`${thread.customer_name} · ${thread.subject} · ${site?.label ?? 'Customer site not assigned'}`}>
        <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
        {dispatchSaved && <Button asChild variant="outline"><Link href="/log">View dispatch log</Link></Button>}
      </PageHead>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)]">
        <div className="min-w-0 space-y-4">
          <Card title={<><MessageSquareText size={15} /> Customer conversation</>} aside={
            <span className="flex flex-wrap items-center justify-end gap-2">
              <Mono>{thread.message_count} messages</Mono>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw size={10} className={threadQ.isFetching ? 'animate-spin' : ''} />
                Auto-updating
              </span>
            </span>
          }>
            {threadQ.isError && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                New replies could not be checked. Refresh before dispatching.
                <button type="button" className="ml-1 underline" onClick={() => void threadQ.refetch()}>Refresh</button>
              </p>
            )}
            {newMessagesSinceOpen > 0 && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                {newMessagesSinceOpen} new {newMessagesSinceOpen === 1 ? 'message' : 'messages'} · re-analyze before dispatching.
              </p>
            )}
            <ol className="space-y-3" aria-label="Most recent conversation messages" data-testid="conversation-transcript">
              {recentMessages.map((message) => {
                const customer = message.sender_role === 'Customer';
                return (
                  <li key={message.id} data-testid={`message-${message.id}`}
                    className={`max-w-[96%] rounded-xl border p-3 sm:max-w-[92%] ${customer ? 'mr-auto border-card-border bg-secondary/50' : 'ml-auto border-primary/20 bg-primary/[0.06]'}`}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{message.sender_role}</span>
                      <time className="font-mono tabular text-[10px] text-muted-foreground" dateTime={message.created_at}>{dateTime(message.created_at)}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                  </li>
                );
              })}
            </ol>
            {earlierMessages.length > 0 && (
              <details className="group mt-3 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Earlier messages <Mono className="ml-1 text-muted-foreground">({earlierMessages.length})</Mono></span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ol className="max-h-[320px] space-y-2 overflow-y-auto border-t border-card-border p-3" aria-label="Earlier conversation messages">
                  {earlierMessages.map((message) => {
                    const customer = message.sender_role === 'Customer';
                    return (
                      <li key={message.id} data-testid={`message-${message.id}`}
                        className={`rounded-lg border p-3 ${customer ? 'border-card-border bg-secondary/50' : 'border-primary/20 bg-primary/[0.06]'}`}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold">{message.sender_role}</span>
                          <time className="font-mono tabular text-[10px] text-muted-foreground" dateTime={message.created_at}>{dateTime(message.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
            <details className="group mt-3 rounded-lg border border-card-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2"><FlaskConical size={13} className="text-primary" /> AI summary</span>
                <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-card-border px-3 py-3 text-sm leading-relaxed">{thread.mock_summary}</p>
            </details>
            {thread.source === 'Telegram' && (
              <form className="mt-4 border-t border-card-border pt-4" data-testid="telegram-reply-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (thread.can_send_telegram_reply && replyText.trim() && !sendReply.isPending) {
                    sendReply.mutate({ id: conversationId, data: { text: replyText.trim() } });
                  }
                }}>
                <label htmlFor="telegram-customer-reply" className="mb-2 block text-xs font-medium">
                  Reply to customer
                </label>
                <textarea id="telegram-customer-reply" rows={2} maxLength={4096} className={fieldClass}
                  value={replyText}
                  disabled={!thread.can_send_telegram_reply || sendReply.isPending}
                  placeholder={thread.can_send_telegram_reply ? 'Write a reply…' : 'Ask the customer to send one more Telegram message first.'}
                  aria-describedby="telegram-reply-help"
                  onChange={(event) => {
                    if (sendReply.error) sendReply.reset();
                    setReplyText(event.target.value);
                  }} />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p id="telegram-reply-help" className="text-[10px] text-muted-foreground">
                    {thread.can_send_telegram_reply
                      ? 'Telegram sends only when you press Send.'
                      : 'Ask the customer for one more Telegram message first.'}
                    <span className="ml-2 font-mono">{replyText.length}/4096</span>
                  </p>
                  <Button type="submit" disabled={!thread.can_send_telegram_reply || !replyText.trim() || sendReply.isPending}
                    data-testid="button-send-telegram-reply">
                    {sendReply.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {sendReply.isPending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
                {sendReply.error && <p role="alert" className="mt-2 text-xs text-err">{errorText(sendReply.error)}</p>}
              </form>
            )}
            <details className="group mt-4 border-t border-card-border pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                <span>Telegram details</span>
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3"><MessagingConnectionNotice /></div>
            </details>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {thread.source === 'Telegram' && (
            <Card title={<><MapPin size={15} /> Customer sample site</>}>
              <label htmlFor="conversation-site" className="mb-2 block text-xs text-muted-foreground">No location is inferred from Telegram. Choose a synthetic site before dispatching.</label>
              <select id="conversation-site" data-testid="select-conversation-site" className={fieldClass} value={thread.customer_site_id ?? ''}
                disabled={setSite.isPending || dispatchSaved}
                onChange={(event) => setSite.mutate({ id: conversationId, data: { customer_site_id: event.target.value as DemoSiteId } })}>
                <option value="" disabled>Choose a sample site…</option>
                {DEMO_CUSTOMER_SITES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              {setSite.error && <p role="alert" className="mt-2 text-xs text-err">{errorText(setSite.error)}</p>}
            </Card>
          )}
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
                          <li>{loc && site ? <>Straight-line <Mono>{distanceKm(loc, site).toFixed(1)} km</Mono> from sample position, not a driving ETA.</> : 'Location unavailable.'}</li>
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
                      {site ? <><b>No qualified technician found.</b> No available van currently has every required part. Review stock before approving.</> : <><b>Customer site is not assigned.</b> Choose a sample site above before matching a technician or approving dispatch.</>}
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
